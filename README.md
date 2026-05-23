# @aixianyun/sdk

闲云智链开放平台 JavaScript/TypeScript SDK。通过 API Key 即可调用平台上的 AI 技能，支持非流式和流式输出。

---

## 安装

```bash
npm install @aixianyun/sdk
```

```bash
yarn add @aixianyun/sdk
```

```bash
pnpm add @xyai/sdk
```

---

## 获取 API Key

### 方式一：从开放平台控制台获取（推荐）

1. 访问 [闲云智链开放平台](https://openapi.xyaichain.com) 并登录
2. 进入 **开发者控制台** → **API Keys**
3. 点击 **创建 API Key**，填写名称后确认
4. 复制生成的 Key（创建后仅显示一次，请妥善保管）

### 方式二：REST API 调用

如果你已经有平台账号，也可以通过 API 创建 Key：

```bash
# 先登录获取 Cookie，再调用创建接口
curl -X POST https://openapi.xyaichain.com/api/keys \
  -H "Content-Type: application/json" \
  -H "Cookie: xyai_user_id=你的用户ID" \
  -d '{"name": "我的SDK Key"}'
```

返回示例：

```json
{
  "success": true,
  "item": {
    "id": "key_xxx",
    "name": "我的SDK Key",
    "key": "xyai-xxxxxxxxxxxxxxxxxxxx",
    "createdAt": "2026-05-23T00:00:00.000Z",
    "isActive": true
  }
}
```

> **注意**：`key` 字段仅在创建时返回一次，请立即保存。后续查询只会返回脱敏值（如 `xyai-****xxxx`）。

---

## 快速开始

```typescript
import { XYAIClient } from '@aixianyun/sdk'

const client = new XYAIClient({ apiKey: process.env.XYAI_API_KEY! })

// 列出已发布的技能
const { items } = await client.skills.list({ page: 1, pageSize: 20 })
console.log(items)

// 获取技能详情（含变量定义）
const skill = await client.skills.info('sk_xxx')
console.log(skill.variables) // 查看需要哪些输入变量

// 调用技能
const res = await client.skills.invoke({
  skillId: 'sk_xxx',
  variables: { topic: 'AI写作', style: '小红书' },
})
console.log(res.result)     // AI 生成的内容
console.log(res.energyCost) // 本次消耗能量
```

---

## 流式调用

```typescript
for await (const chunk of client.skills.stream({
  skillId: 'sk_xxx',
  variables: { topic: 'AI写作', style: '小红书' },
})) {
  switch (chunk.type) {
    case 'text':
      process.stdout.write(chunk.text)  // 逐字输出
      break
    case 'done':
      console.log(`\n完成，耗时 ${chunk.latency}ms`)
      break
    case 'error':
      console.error('错误:', chunk.error)
      break
  }
}
```

---

## API 文档

### XYAIClient

```typescript
const client = new XYAIClient({
  apiKey: 'your-api-key',         // 必填，平台颁发的 API Key
  baseURL: '...',                 // 可选，默认 https://api.xyaichain.com/api/v1
  timeout: 60000,                 // 可选，默认 60000ms
  headers: {},                    // 可选，自定义请求头
  defaultModel: 'Pro/...',       // 可选，默认模型
})
```

#### client.validateKey()

验证 API Key 是否有效。

```typescript
const ok = await client.validateKey()
if (!ok) throw new Error('API Key 无效')
```

---

### client.skills

#### skills.list(params?)

列出已发布的技能。

```typescript
const result = await client.skills.list({
  page: 1,
  pageSize: 20,
  type: 'text_generation',       // 可选，筛选类型
  keyword: '小红书',              // 可选，搜索关键词
  sort: 'created_at',            // 可选，默认 created_at，可选 invocation_count
})
// result.items: SkillListItem[]
// result.total: number
// result.page: number
// result.page_size: number
```

#### skills.info(skillId)

获取技能详情。

```typescript
const skill = await client.skills.info('sk_xxx')
// skill.variables: SkillVariable[]  // 变量列表（含类型、是否必填等）
// skill.model: { name, parameters }
```

#### skills.invoke(options)

非流式调用技能。

```typescript
const res = await client.skills.invoke({
  skillId: 'sk_xxx',
  variables: { topic: 'AI写作', style: '小红书' },
  model: 'Pro/...',              // 可选，覆盖默认模型
  maxTokens: 2048,               // 可选
  temperature: 0.7,              // 可选
})
// res.requestId    请求 ID
// res.logId        调用日志 ID
// res.result       生成结果
// res.usage        Token 使用量 { promptTokens, completionTokens, totalTokens }
// res.latency      耗时（ms）
// res.energyCost   本次消耗能量
```

#### skills.stream(options)

流式调用技能，返回 `AsyncGenerator<StreamChunk>`。

```typescript
for await (const chunk of client.skills.stream({
  skillId: 'sk_xxx',
  variables: { topic: 'AI写作', style: '小红书' },
  model: 'Pro/...',
  maxTokens: 2048,
  temperature: 0.7,
})) {
  // chunk.type === 'start'  { requestId, logId }
  // chunk.type === 'text'   { text, requestId }
  // chunk.type === 'done'   { requestId, latency, logId }
  // chunk.type === 'error'  { requestId, error }
}
```

---

## 错误处理

SDK 会将服务端错误映射为 `XYAISDKError`：

```typescript
import { XYAIClient, XYAISDKError, ErrorCodes } from '@xyai/sdk'

try {
  const res = await client.skills.invoke({ skillId: 'sk_xxx', variables: {} })
} catch (err) {
  if (err instanceof XYAISDKError) {
    console.error(err.code)      // 错误码
    console.error(err.message)   // 错误信息
    console.error(err.statusCode) // HTTP 状态码
    console.error(err.requestId) // 请求 ID

    switch (err.code) {
      case ErrorCodes.INVALID_API_KEY:
        // API Key 无效
        break
      case ErrorCodes.SKILL_NOT_FOUND:
        // 技能不存在
        break
      case ErrorCodes.INSUFFICIENT_ENERGY:
        // 能量不足
        console.error('详情:', err.details) // { required, current }
        break
      case ErrorCodes.RATE_LIMIT_EXCEEDED:
        // 请求过于频繁
        break
      default:
        // 其他错误
    }
  }
}
```

### 错误码

| 错误码 | 说明 | HTTP Status |
|--------|------|-------------|
| `INVALID_API_KEY` | API Key 无效或已禁用 | 401 |
| `UNAUTHORIZED` | 未提供认证信息 | 401 |
| `SKILL_NOT_FOUND` | 技能不存在 | 404 |
| `SKILL_NOT_PUBLISHED` | 技能未发布或已下架 | 403 |
| `MISSING_VARIABLES` | 缺少必填变量 | 400 |
| `INVALID_VARIABLE` | 变量类型错误 | 400 |
| `INSUFFICIENT_ENERGY` | 能量不足 | 402 |
| `RATE_LIMIT_EXCEEDED` | 请求过于频繁 | 429 |
| `VALIDATION_ERROR` | 请求参数错误 | 400 |
| `INTERNAL_ERROR` | 服务器内部错误 | 500 |

---

## 类型参考

```typescript
// 技能列表项
interface SkillListItem {
  skill_id: string
  name: string
  description: string
  author: string
  skill_type: 'text_generation' | 'image_generation' | 'video_generation' | 'audio_generation'
  tags: string[]
  need_paid: boolean
  price: number
  version: string
  create_time: string
}

// 技能详情
interface SkillDetail extends SkillListItem {
  update_time?: string
  variables: SkillVariable[]
  output: { format: OutputFormat }
  model: {
    name: string
    parameters: ModelParameters
  }
}

// 调用响应
interface SkillResponse {
  requestId: string
  logId: string
  result: string
  usage?: TokenUsage
  finishReason: string
  latency: number
  energyCost: number
}

// Token 使用量
interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}
```

---

## 能量消耗

技能调用会按类型扣减能量：

能量不足时会返回 `INSUFFICIENT_ENERGY` 错误，消耗的能量可在平台控制台查看。

---

## 兼容性

- Node.js >= 18.0（原生 fetch + AbortSignal.timeout）
- 浏览器（需支持 `fetch` 和 `AbortController`）
- TypeScript >= 5.0（完整类型推导）

---

## License

MIT
