/**
 * XYAIClient - 闲云智链开放平台 SDK 主客户端
 */

import type { XYAIClientConfig } from '../types/index';
import { SkillsModule } from './skills';
import { XYAISDKError } from '../errors/index';

const DEFAULT_BASE_URL = 'https://api.xyaichain.com/api/v1';
const DEFAULT_TIMEOUT = 180_000;

export class XYAIClient {
  /** 技能模块 */
  public readonly skills: SkillsModule;

  private readonly config: {
    apiKey: string;
    baseURL: string;
    timeout: number;
    headers: Record<string, string>;
  };

  constructor(config: XYAIClientConfig) {
    if (!config.apiKey) {
      throw new Error('apiKey 是必填参数');
    }

    this.config = {
      apiKey: config.apiKey,
      baseURL: config.baseURL || DEFAULT_BASE_URL,
      timeout: config.timeout || DEFAULT_TIMEOUT,
      headers: config.headers || {},
    };

    this.skills = new SkillsModule(this.config);
  }

  /**
   * 验证 API Key 是否有效
   */
  async validateKey(): Promise<boolean> {
    try {
      await this.skills.list({ page: 1, pageSize: 1 });
      return true;
    } catch (err) {
      if (err instanceof XYAISDKError && err.code === 'UNAUTHORIZED') {
        return false;
      }
      // 网络错误、500 等不算 key 无效
      return true;
    }
  }

  /** 返回当前配置的 base URL */
  get baseURL(): string {
    return this.config.baseURL;
  }

  /** 返回当前 API Key 的前缀（脱敏） */
  get apiKeyMasked(): string {
    return this.config.apiKey.slice(0, 5) + '****' + this.config.apiKey.slice(-4);
  }
}

export { XYAIClient as Client };
