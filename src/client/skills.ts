/**
 * SkillsModule - 技能调用模块
 */

import type {
  SkillListResult,
  SkillDetail,
  SkillInvokeOptions,
  SkillResponse,
  StreamChunk,
  XYAISDKErrorResponse,
} from '../types/index';
import { XYAISDKError, ErrorCodes } from '../errors/index';
import type { ErrorCode } from '../errors/index';
import { generateRequestId } from '../utils/index';

export class SkillsModule {
  constructor(private config: {
    apiKey: string;
    baseURL: string;
    timeout: number;
    headers: Record<string, string>;
    defaultModel?: string;
  }) {}

  /**
   * 列出已发布的技能
   */
  async list(params?: {
    page?: number;
    pageSize?: number;
    type?: string;
    keyword?: string;
    sort?: 'created_at' | 'invocation_count';
  }): Promise<SkillListResult> {
    const url = new URL(`${this.config.baseURL}/skills`);
    if (params?.page) url.searchParams.set('page', String(params.page));
    if (params?.pageSize) url.searchParams.set('pageSize', String(params.pageSize));
    if (params?.type) url.searchParams.set('type', params.type);
    if (params?.keyword) url.searchParams.set('keyword', params.keyword);
    if (params?.sort) url.searchParams.set('sort', params.sort);

    return this.request<SkillListResult>(url, { method: 'GET' });
  }

  /**
   * 获取技能详情
   */
  async info(skillId: string): Promise<SkillDetail> {
    return this.request<SkillDetail>(
      `${this.config.baseURL}/skills/${encodeURIComponent(skillId)}`,
      { method: 'GET' }
    );
  }

  /**
   * 调用技能（非流式）
   */
  async invoke(options: SkillInvokeOptions): Promise<SkillResponse> {
    const { skillId, variables, model, maxTokens, temperature } = options;

    const body: Record<string, unknown> = { variables };
    if (model) body.model = model;
    if (maxTokens !== undefined) body.maxTokens = maxTokens;
    if (temperature !== undefined) body.temperature = temperature;

    return this.request<SkillResponse>(
      `${this.config.baseURL}/skills/${encodeURIComponent(skillId)}/invoke`,
      {
        method: 'POST',
        body,
      }
    );
  }

  /**
   * 调用技能（流式），返回 AsyncGenerator
   *
   * @example
   * for await (const chunk of client.skills.stream({ skillId: 'sk_xxx', variables: {} })) {
   *   if (chunk.type === 'text') process.stdout.write(chunk.text);
   *   if (chunk.type === 'done') console.log(`\n耗时: ${chunk.latency}ms`);
   * }
   */
  async *stream(options: SkillInvokeOptions): AsyncGenerator<StreamChunk> {
    const { skillId, variables, model, maxTokens, temperature } = options;
    const requestId = generateRequestId();

    const body: Record<string, unknown> = { variables };
    if (model) body.model = model;
    if (maxTokens !== undefined) body.maxTokens = maxTokens;
    if (temperature !== undefined) body.temperature = temperature;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`,
      ...this.config.headers,
    };

    const response = await fetch(
      `${this.config.baseURL}/skills/${encodeURIComponent(skillId)}/stream`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(this.config.timeout),
      }
    );

    if (!response.ok) {
      let errMsg = `HTTP ${response.status}`;
      let errCode: ErrorCode = ErrorCodes.INTERNAL_ERROR;
      let details: Record<string, unknown> | undefined;

      try {
        const errData = await response.json() as XYAISDKErrorResponse;
        errMsg = errData.message || errMsg;
        errCode = errData.code as ErrorCode;
        details = errData.data;
        if (errData.requestId) (details ??= {}).requestId = errData.requestId;
      } catch { /* ignore */ }

      throw new XYAISDKError(errMsg, errCode, response.status, requestId, details);
    }

    if (!response.body) throw XYAISDKError.internal('流式响应不可用', requestId);

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        const newlineIndex = buffer.indexOf('\n\n');
        if (newlineIndex === -1) continue;

        const eventBlock = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 2);

        for (const line of eventBlock.split('\n')) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') return;
            try {
              const parsed = JSON.parse(dataStr) as Record<string, unknown>;
              const chunk = this.parseStreamChunk(parsed, requestId);
              if (chunk) yield chunk;
            } catch { /* skip malformed */ }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private parseStreamChunk(
    raw: Record<string, unknown>,
    requestId: string
  ): StreamChunk | null {
    const type = raw.type as string;
    switch (type) {
      case 'start':
        return { type: 'start', requestId: requestId, logId: raw.logId as string };
      case 'text':
        return { type: 'text', text: raw.text as string, requestId };
      case 'done':
        return {
          type: 'done',
          requestId,
          latency: raw.latency as number,
          logId: raw.logId as string,
        };
      case 'error':
        return { type: 'error', requestId, error: raw.error as string };
      default:
        return null;
    }
  }

  private async request<T>(url: URL | string, options: { method: string; body?: Record<string, unknown> }): Promise<T> {
    const requestId = generateRequestId();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`,
      'X-Request-Id': requestId,
      ...this.config.headers,
    };

    const fetchOptions: RequestInit = {
      method: options.method,
      headers,
    };

    if (options.body) {
      fetchOptions.body = JSON.stringify(options.body);
    }

    let response: Response;
    try {
      response = await fetch(String(url), {
        ...fetchOptions,
        signal: AbortSignal.timeout(this.config.timeout),
      });
    } catch (err) {
      if (err instanceof Error && err.name === 'TimeoutError') {
        throw XYAISDKError.timeout(requestId);
      }
      throw XYAISDKError.network(
        err instanceof Error ? err.message : '网络请求失败',
        err instanceof Error ? err : undefined
      );
    }

    let body: unknown;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      body = await response.json();
    } else {
      body = await response.text();
    }

    if (!response.ok) {
      const errData = (body as XYAISDKErrorResponse) || {};
      const code = errData.code || 'HTTP_ERROR';
      const message = errData.message || `HTTP ${response.status}`;
      const details = errData.data;

      switch (response.status) {
        case 401:
          throw new XYAISDKError(message, ErrorCodes.INVALID_API_KEY, 401, requestId, details);
        case 403:
          throw new XYAISDKError(message, ErrorCodes.SKILL_NOT_PUBLISHED, 403, requestId, details);
        case 404:
          throw new XYAISDKError(message, ErrorCodes.SKILL_NOT_FOUND, 404, requestId, details);
        case 402:
          throw new XYAISDKError(
            message,
            ErrorCodes.INSUFFICIENT_ENERGY,
            402,
            requestId,
            details
          );
        case 429:
          throw XYAISDKError.rateLimit();
        default:
          throw new XYAISDKError(message, code as ErrorCode, response.status, requestId, details);
      }
    }

    const typedBody = body as { success: true; data: T } | XYAISDKErrorResponse;
    if (!typedBody || !(typedBody as { success?: boolean }).success) {
      throw XYAISDKError.internal(
        (typedBody as XYAISDKErrorResponse)?.message || '未知错误',
        requestId
      );
    }

    return (typedBody as { success: true; data: T }).data;
  }
}
