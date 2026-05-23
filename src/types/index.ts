/**
 * XYAI SDK TypeScript Type Definitions
 */

// ========== 客户端配置 ==========

export interface XYAIClientConfig {
  /** 闲云智链平台颁发的 API Key */
  apiKey: string;
  /** API 地址，默认 https://api.xyaichain.com/api/v1 */
  baseURL?: string;
  /** 请求超时（毫秒），默认 60000 */
  timeout?: number;
  /** 每次请求携带的自定义请求头 */
  headers?: Record<string, string>;
  /** 默认模型，可被调用参数覆盖 */
  defaultModel?: string;
}

// ========== 技能类型 ==========

export type SkillType = 'text_generation' | 'image_generation' | 'video_generation' | 'audio_generation';
export type OutputFormat = 'text' | 'markdown' | 'json' | 'image_url' | 'video_url';

export interface SkillListItem {
  skill_id: string;
  name: string;
  description: string;
  author: string;
  skill_type: SkillType;
  tags: string[];
  need_paid: boolean;
  price: number;
  version: string;
  create_time: string;
}

export interface SkillVariable {
  name: string;
  type: 'string' | 'integer' | 'number' | 'boolean' | 'array' | 'object';
  required: boolean;
  default?: unknown;
  options?: string[];
  description?: string;
}

export interface SkillDetail {
  skill_id: string;
  name: string;
  description: string;
  author: string;
  skill_type: SkillType;
  tags: string[];
  need_paid: boolean;
  price: number;
  version: string;
  create_time: string;
  update_time?: string;
  variables: SkillVariable[];
  output: {
    format: OutputFormat;
  };
  model: {
    name: string;
    parameters: {
      temperature?: number;
      max_tokens?: number;
      top_p?: number;
      presence_penalty?: number;
      frequency_penalty?: number;
    };
  };
}

// ========== 调用请求 ==========

export interface SkillInvokeOptions {
  /** 技能 ID */
  skillId: string;
  /** 技能输入变量，key 为变量名 */
  variables: Record<string, unknown>;
  /** 覆盖默认模型 */
  model?: string;
  /** 最大 token 数 */
  maxTokens?: number;
  /** 温度参数（0-2） */
  temperature?: number;
}

// ========== 调用响应 ==========

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface SkillResponse {
  /** 请求 ID */
  requestId: string;
  /** 调用日志 ID */
  logId: string;
  /** 生成结果 */
  result: string;
  /** Token 使用量 */
  usage?: TokenUsage;
  /** 结束原因 */
  finishReason: string;
  /** 耗时（毫秒） */
  latency: number;
  /** 消耗能量 */
  energyCost: number;
}

// ========== 流式输出 ==========

export type StreamChunk =
  | { type: 'start'; requestId: string; logId: string }
  | { type: 'text'; text: string; requestId: string }
  | { type: 'done'; requestId: string; latency: number; logId: string }
  | { type: 'error'; requestId: string; error: string };

// ========== 列表结果 ==========

export interface SkillListResult {
  items: SkillListItem[];
  total: number;
  page: number;
  page_size: number;
}

// ========== SDK 错误响应（从服务端来） ==========

export interface XYAISDKErrorResponse {
  success: false;
  code: string;
  message: string;
  requestId?: string;
  data?: {
    required?: number;
    current?: number;
    insufficient?: number;
  };
}
