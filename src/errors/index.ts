/**
 * XYAI SDK Error Types
 */

export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'INVALID_API_KEY'
  | 'SKILL_NOT_FOUND'
  | 'SKILL_NOT_PUBLISHED'
  | 'MISSING_VARIABLES'
  | 'INVALID_VARIABLE'
  | 'INSUFFICIENT_ENERGY'
  | 'RATE_LIMIT_EXCEEDED'
  | 'MODEL_NOT_AVAILABLE'
  | 'VALIDATION_ERROR'
  | 'INTERNAL_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT';

export const ErrorCodes = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  INVALID_API_KEY: 'INVALID_API_KEY',
  SKILL_NOT_FOUND: 'SKILL_NOT_FOUND',
  SKILL_NOT_PUBLISHED: 'SKILL_NOT_PUBLISHED',
  MISSING_VARIABLES: 'MISSING_VARIABLES',
  INVALID_VARIABLE: 'INVALID_VARIABLE',
  INSUFFICIENT_ENERGY: 'INSUFFICIENT_ENERGY',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  MODEL_NOT_AVAILABLE: 'MODEL_NOT_AVAILABLE',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
} as const;

export class XYAISDKError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode?: number;
  public readonly requestId?: string;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: ErrorCode,
    statusCode?: number,
    requestId?: string,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'XYAISDKError';
    this.code = code;
    this.statusCode = statusCode;
    this.requestId = requestId;
    this.details = details;
  }

  static unauthorized(message = 'API Key 无效或未提供') {
    return new XYAISDKError(message, ErrorCodes.UNAUTHORIZED, 401);
  }

  static invalidApiKey() {
    return new XYAISDKError('API Key 无效或已禁用', ErrorCodes.INVALID_API_KEY, 401);
  }

  static notFound(skillId?: string) {
    return new XYAISDKError(
      skillId ? `技能不存在: ${skillId}` : '技能不存在',
      ErrorCodes.SKILL_NOT_FOUND,
      404
    );
  }

  static notPublished(skillId?: string) {
    return new XYAISDKError(
      skillId ? `技能未发布: ${skillId}` : '技能未发布或已下架',
      ErrorCodes.SKILL_NOT_PUBLISHED,
      403
    );
  }

  static insufficientEnergy(required: number, current: number) {
    return new XYAISDKError(
      `能量不足，当前 ${current}，需要 ${required}`,
      ErrorCodes.INSUFFICIENT_ENERGY,
      402,
      undefined,
      { required, current }
    );
  }

  static validation(message: string) {
    return new XYAISDKError(message, ErrorCodes.VALIDATION_ERROR, 400);
  }

  static rateLimit(retryAfter?: number) {
    return new XYAISDKError(
      retryAfter ? `请求过于频繁，请 ${retryAfter} 秒后重试` : '请求过于频繁',
      ErrorCodes.RATE_LIMIT_EXCEEDED,
      429
    );
  }

  static network(message: string, cause?: Error) {
    const err = new XYAISDKError(message, ErrorCodes.NETWORK_ERROR, undefined, undefined, {
      originalError: cause?.message,
    });
    if (cause) err.cause = cause;
    return err;
  }

  static timeout(requestId?: string) {
    return new XYAISDKError('请求超时', ErrorCodes.TIMEOUT, 408, requestId);
  }

  static internal(message = '服务器内部错误', requestId?: string) {
    return new XYAISDKError(message, ErrorCodes.INTERNAL_ERROR, 500, requestId);
  }
}
