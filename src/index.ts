/**
 * XYAI SDK - 闲云智链开放平台 SDK
 *
 * @example
 * import { XYAIClient } from '@xyai/sdk'
 *
 * const client = new XYAIClient({ apiKey: 'your-api-key' })
 *
 * // 列出技能
 * const { items } = await client.skills.list({ page: 1, pageSize: 20 })
 *
 * // 调用技能
 * const res = await client.skills.invoke({
 *   skillId: 'sk_xxx',
 *   variables: { topic: 'AI写作', style: '小红书' },
 * })
 * console.log(res.result)
 *
 * // 流式调用
 * for await (const chunk of client.skills.stream({ skillId: 'sk_xxx', variables: {} })) {
 *   if (chunk.type === 'text') process.stdout.write(chunk.text)
 * }
 */

export { XYAIClient } from './client/client';
export { SkillsModule } from './client/skills';

export type {
  XYAIClientConfig,
  SkillType,
  OutputFormat,
  SkillListItem,
  SkillListResult,
  SkillVariable,
  SkillDetail,
  SkillInvokeOptions,
  SkillResponse,
  TokenUsage,
  StreamChunk,
  XYAISDKErrorResponse,
} from './types/index';

export { XYAISDKError, ErrorCodes } from './errors/index';
export type { ErrorCode } from './errors/index';

export { generateRequestId, deepMerge, delay, safeJsonParse, isNode, isBrowser } from './utils/index';
