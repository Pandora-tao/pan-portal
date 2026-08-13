# PanChat 前端功能完善与重构需求文档

文件名：`panchat-frontend-refactoring-requirements.md`

版本：v1.0  
适用范围：`packages/pan-chat`  
当前阶段：前端重构需求整理  
目标：让 `pan-chat` 从 Demo 聊天页升级为可长期维护、可对接后端、可扩展登录/会话/流式输出的标准聊天应用前端。

---

## 0. 背景说明

当前 `pan-chat` 已具备基础聊天能力，但整体仍偏 Demo 形态。

现状特点：

1. 当前没有 Vue Router。
2. 当前没有登录、注册、鉴权、用户态或 token 逻辑。
3. 当前没有统一 API client，也没有 axios/request wrapper。
4. 当前唯一核心接口是 `POST /chat/api/chat`。
5. 当前前端直接在 `App.vue` 中使用 `fetch` 调用聊天接口。
6. 当前消息只存在前端内存中，刷新页面后丢失。
7. 当前没有会话 ID、消息 ID、历史记录、消息状态、附件、模型配置。
8. 当前没有 WebSocket、SSE 或流式输出。
9. 当前服务端返回 `{ answer: string }`，尚未统一为标准 `ApiResult<T>`。
10. 当前 `pan-chat` 需要优先完成前端结构重构，再推动后端接口设计与实现。

---

# 1. 重构总目标

## 1.1 产品目标

将 `pan-chat` 从“单页聊天 Demo”重构为“标准 AI 聊天应用前端”。

重构后应具备：

1. 清晰的组件结构。
2. 清晰的数据模型。
3. 清晰的 API 层。
4. 可扩展的会话体系。
5. 可扩展的消息状态体系。
6. 可预留登录能力。
7. 可接入普通聊天接口。
8. 可接入 SSE 流式聊天接口。
9. 可支持后端历史记录持久化。
10. 可支持后续文件上传、模型配置、用户设置等功能扩展。

## 1.2 技术目标

1. 降低 `App.vue` 复杂度。
2. 避免业务逻辑、请求逻辑、UI 逻辑混在同一个组件中。
3. 建立统一类型定义。
4. 建立统一 API 请求层。
5. 建立可复用 composables。
6. 建立清晰的目录结构。
7. 保持当前已有功能可用。
8. 保持当前 `/chat/api/chat` 接口兼容。
9. 支持后续平滑切换到新后端接口。
10. 不在第一阶段引入过重设计。

---

# 2. 重构边界

## 2.1 本文档只讨论 `pan-chat`

本文档只覆盖：

```txt
packages/pan-chat
```

不讨论：

```txt
packages/portal
packages/lucky-draw
```

除非后续 `pan-chat` 需要与 portal 的入口、登录态或用户信息联动。

## 2.2 当前阶段不做的内容

当前阶段不强制实现：

1. 真实登录注册。
2. 权限系统。
3. 管理后台。
4. 文件上传。
5. 付费额度。
6. 多模型完整配置中心。
7. 多人协作。
8. 消息搜索。
9. Markdown 高级渲染。
10. 语音输入。
11. 图片生成。
12. WebSocket。
13. 移动端完整适配。

这些功能可以预留结构，但不要在当前阶段过度实现。

---

# 3. 模块一：目录结构重构

## 3.1 优化事项编号：PC-FE-001

### 名称

重构 `pan-chat` 前端目录结构。

### 问题

当前核心逻辑集中在 `App.vue`，不利于维护和扩展。

### 目标

建立标准前端模块结构，让 UI、请求、类型、状态和业务逻辑分层。

### 建议目录结构

```txt
packages/pan-chat/src/
├─ api/
│  ├─ request.ts              # 统一普通 JSON 请求封装
│  ├─ chat.ts                 # 聊天相关 API
│  └─ types.ts                # API 通用类型
├─ components/
│  ├─ MessageList.vue         # 消息列表
│  ├─ MessageItem.vue         # 单条消息
│  ├─ ChatInput.vue           # 输入区
│  └─ EmptyState.vue          # 空状态
├─ composables/
│  ├─ useChat.ts              # 当前聊天主流程
│  ├─ useVisitorId.ts         # 游客身份
│  └─ useAutoScroll.ts        # 消息滚动
├─ constants/
│  └─ storageKeys.ts          # localStorage key 常量
├─ types/
│  ├─ chat.ts                 # 聊天领域类型
│  └─ common.ts               # 通用类型
├─ utils/
│  ├─ id.ts                   # ID 生成
│  └─ text.ts                 # 文本处理
├─ App.vue
└─ main.ts
```

### 第一阶段暂不创建的目录/文件

以下目录或文件只作为后续阶段预留，不要求在 PC-FE-001 中一次性创建：

```txt
src/api/auth.ts
src/components/ChatLayout.vue
src/components/ChatSidebar.vue
src/components/ChatHeader.vue
src/components/ErrorState.vue
src/components/LoadingState.vue
src/composables/useChatSessions.ts
src/composables/useChatMessages.ts
src/composables/useChatStream.ts
src/composables/useAbortController.ts
src/config/chat.ts
src/services/chatLocalStorage.ts
src/services/chatMockService.ts
src/stores/chat.ts
src/stores/auth.ts
src/types/user.ts
src/utils/date.ts
```

原因：这些文件对应会话管理、登录预留、SSE、状态管理、mock 服务等后续模块。第一阶段如果提前全部创建，容易出现空文件、伪抽象和 agent 过度实现。

### 验收标准

1. `App.vue` 不再直接包含 API 请求逻辑。
2. 当前聊天主流程可以迁移到 `useChat.ts`，但不强制在第一阶段完成完整会话管理。
3. API 请求统一从 `src/api/chat.ts` 发起。
4. 普通请求封装统一放在 `src/api/request.ts`。
5. 消息类型、接口返回类型集中定义，避免散落在组件中。
6. 第一阶段只拆出当前页面已经真实需要的组件，不为了“看起来完整”创建无业务支撑的组件。
7. 不创建空目录、空组件、空 store、空 service。
8. 当前 `/chat/api/chat` 聊天功能仍然可用。
9. 页面视觉效果不因目录重构发生明显变化。

### Grill-me 结论

模块一不追求一步到位的“完美目录”，而是追求最小可执行重构。

第一阶段只解决三个问题：

1. `App.vue` 不再直接发请求。
2. 类型和 API 不再散落在组件中。
3. 为后续会话、SSE、登录预留清晰扩展点。

不允许为了显得架构完整而提前创建大量没有真实业务的文件。否则会增加 agent 幻觉空间，后续维护成本也会变高。

---

# 4. 模块二：统一类型定义

## 4.1 优化事项编号：PC-FE-002

### 名称

定义聊天核心数据模型。

### 问题

当前消息结构过于简单，只包含：

```ts
interface ChatMessage {
  id: number
  role: 'assistant' | 'user'
  content: string
}
```

无法支撑会话、历史记录、流式输出、错误状态、重新生成等功能。

### 目标

建立分阶段演进的聊天类型系统：第一阶段先兼容当前旧接口和单页聊天；后续阶段再扩展为完整会话模型。类型设计不能为了“最终态好看”而破坏当前旧接口兼容性。

### 需求

新增文件：

```txt
src/types/chat.ts
```

### 类型定义

```ts
/**
 * 第一阶段角色类型。
 * 当前旧接口只支持 user / assistant，不强行引入 system。
 */
export type ChatRole = 'user' | 'assistant'

/**
 * 第一阶段消息状态。
 * streaming / stopped 属于 SSE 阶段，暂不在模块二第一阶段强制落地。
 */
export type MessageStatus = 'pending' | 'completed' | 'failed'

/**
 * 当前前端 UI 使用的消息模型。
 * 第一阶段不强制包含 sessionId，因为当前还没有会话管理。
 */
export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  status: MessageStatus
  createdAt: string
  errorMessage?: string
}

/**
 * 旧接口请求消息。
 * 用于兼容 POST /chat/api/chat。
 */
export interface LegacyChatMessage {
  role: ChatRole
  content: string
}

export interface LegacyChatRequest {
  messages: LegacyChatMessage[]
}

export interface LegacyChatResponse {
  answer: string
}

/**
 * 后续会话阶段再启用的完整会话模型。
 * 不要求在 PC-FE-002 第一阶段立即落地。
 */
export interface ChatSession {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  pinned?: boolean
  lastMessagePreview?: string
}

/**
 * 后续会话阶段的持久化消息模型。
 * 用于和后端接口对齐，不直接替代第一阶段 ChatMessage。
 */
export interface PersistedChatMessage extends ChatMessage {
  sessionId: string
  updatedAt?: string
  metadata?: ChatMessageMetadata
}

export interface ChatMessageMetadata {
  model?: string
  tokens?: number
  durationMs?: number
}

export interface SendMessagePayload {
  sessionId: string
  content: string
  model?: string
}

export interface CreateSessionPayload {
  title?: string
}
```

### 类型分层说明

模块二的核心不是一次性定义一个“最终完美模型”，而是明确哪些类型现在用，哪些类型后面用。

第一阶段立即使用：

```txt
ChatRole
MessageStatus
ChatMessage
LegacyChatMessage
LegacyChatRequest
LegacyChatResponse
```

后续会话阶段使用：

```txt
ChatSession
PersistedChatMessage
ChatMessageMetadata
SendMessagePayload
CreateSessionPayload
```

这样做的原因是：当前旧接口没有 `sessionId`，也没有服务端消息 ID。如果第一阶段强制所有消息都带 `sessionId`，会让当前重构变复杂，还会诱导 agent 提前实现会话管理。

### 验收标准

1. 不再使用纯数字 `Date.now()` 作为正式消息 ID，统一通过 `createId()` 生成字符串 ID。
2. 第一阶段 `ChatMessage` 不强制包含 `sessionId`，避免提前引入会话管理。
3. 第一阶段 `ChatMessage` 必须包含 `status` 和 `createdAt`。
4. 旧接口请求/响应类型必须单独定义为 `LegacyChatRequest`、`LegacyChatResponse`，不要混用最终后端接口类型。
5. `ChatRole` 第一阶段只包含 `user` 和 `assistant`，不提前引入 `system`。
6. 完整会话模型通过 `ChatSession` 和 `PersistedChatMessage` 预留，但不要求第一阶段使用。
7. 类型文件不和具体组件强绑定。
8. 类型设计必须和模块一执行边界保持一致，不能诱导 agent 提前实现会话、SSE 或登录。

### Grill-me 结论

模块二最容易犯的错是“为了未来，把现在搞复杂”。

当前阶段的类型设计应该遵守：

1. 当前真实用到的类型要简单、直接、可运行。
2. 后续需要的类型可以预留，但不能强制进入当前业务流。
3. 旧接口兼容类型必须独立存在，不能和未来新接口混在一起。
4. `sessionId` 是会话管理阶段的核心字段，不应该在模块二第一阶段强制落地。
5. `streaming`、`stopped` 是 SSE 阶段的状态，不应该在模块二第一阶段强制落地。

换句话说，模块二要做的是“类型地基”，不是“类型宇宙”。

---

# 5. 模块三：统一 API 请求层

## 5.1 优化事项编号：PC-FE-003

### 名称

新增统一请求封装 `request.ts`。

### 问题

当前请求直接写在 `App.vue` 中，后续登录、错误处理、baseURL、请求头都会难以维护。

### 目标

建立轻量统一请求入口：第一阶段只负责封装 `fetch`、统一 JSON 请求、自动携带 `X-Visitor-Id`、集中处理 HTTP 错误；`ApiResult<T>` 作为未来新后端接口规范预留，但不强制套用到当前旧接口 `/chat/api/chat`。

### 新增文件

```txt
src/api/request.ts
src/api/types.ts
```

### API 类型定义

```ts
/**
 * 未来新后端接口统一响应结构。
 * 注意：当前旧接口 POST /chat/api/chat 返回 { answer: string }，不强制使用 ApiResult。
 */
export interface ApiResult<T> {
  code: number
  message: string
  data: T
}

export interface ApiError {
  code: number
  message: string
  details?: unknown
}

export interface RequestOptions extends RequestInit {
  skipJsonParse?: boolean
}

export interface ApiRequestConfig {
  signal?: AbortSignal
}
```

### 第一阶段 request 行为边界

第一阶段的 `request.ts` 只做这些事：

1. 基于原生 `fetch` 封装普通 JSON 请求。
2. 请求有 body 时自动补充 `Content-Type: application/json`。
3. 每次请求自动携带 `X-Visitor-Id`。
4. 透传 `AbortSignal`。
5. HTTP 状态码非 2xx 时抛出错误。
6. 默认按 JSON 解析响应。
7. 支持 `skipJsonParse`，为后续无响应体接口预留。

第一阶段暂不做：

1. 不处理 `Authorization` token 注入，只预留设计方向。
2. 不做 refresh token。
3. 不做全局 401 跳转登录。
4. 不做 SSE / stream 解析。
5. 不强行解析 `ApiResult<T>` 业务 code。
6. 不实现请求重试。
7. 不实现请求取消队列。
8. 不引入 axios。

### 请求封装要求

1. 基于原生 `fetch` 封装，不引入 axios。
2. 默认支持普通 JSON 请求。
3. 当请求存在 body 且未显式传入 `Content-Type` 时，自动设置 `Content-Type: application/json`。
4. 自动携带 `X-Visitor-Id`。
5. 支持传入 `AbortSignal`。
6. HTTP 非 2xx 响应统一抛出错误。
7. 默认解析 JSON 响应。
8. 支持 `skipJsonParse` 选项。
9. 不在第一阶段处理业务 `code`，因为旧接口不是 `ApiResult<T>`。
10. 不在第一阶段注入 `Authorization`，登录预留放到模块六。
11. 不在第一阶段处理 SSE，SSE 放到模块十一。

### 建议 request.ts 结构

```ts
import { getVisitorId } from '../composables/useVisitorId'
import type { RequestOptions } from './types'

export async function request<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers)

  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  headers.set('X-Visitor-Id', getVisitorId())

  const response = await fetch(url, {
    ...options,
    headers,
  })

  if (!response.ok) {
    throw new Error(`请求失败：${response.status}`)
  }

  if (options.skipJsonParse) {
    return undefined as T
  }

  return response.json() as Promise<T>
}
```

注意：这里的错误处理保持轻量，不要在模块三里实现复杂错误码映射。错误展示和消息级失败状态属于模块十四。

### 验收标准

1. 组件中不直接写 `fetch('/xxx')`。
2. 当前旧聊天接口通过 `src/api/chat.ts` 调用，并间接使用 `request.ts`。
3. `request.ts` 能自动携带 `X-Visitor-Id`。
4. `request.ts` 不强制旧接口返回 `ApiResult<T>`。
5. `ApiResult<T>` 可以定义，但只作为未来新接口规范预留。
6. `Authorization` 注入不在模块三实现，避免提前引入登录复杂度。
7. SSE/stream 请求不在模块三实现，避免污染普通 JSON 请求封装。
8. 不引入 axios。
9. 当前 `/chat/api/chat` 功能保持可用。

### Grill-me 结论

模块三最容易犯的错是把 `request.ts` 做成“万能请求宇宙”：token、刷新 token、业务 code、SSE、重试、队列、toast 全塞进去。

当前阶段不要这么做。

模块三只需要解决一件事：让普通 API 请求从组件里消失，并且有一个稳定、轻量、可扩展的入口。

第一阶段的正确边界是：

1. `fetch` 封装起来。
2. `X-Visitor-Id` 自动带上。
3. HTTP 错误集中抛出。
4. 旧接口继续按 `{ answer: string }` 工作。
5. 新接口的 `ApiResult<T>` 先定义，不强用。

换句话说，模块三要做的是“铺路”，不是“修机场”。

---

# 6. 模块四：聊天 API 模块

## 6.1 优化事项编号：PC-FE-004

### 名称

新增 `chat.ts` API 模块。

### 目标

集中管理 `pan-chat` 所有接口调用。

### 新增文件

```txt
src/api/chat.ts
```

### 当前兼容接口

保留旧接口：

```http
POST /chat/api/chat
```

请求：

```ts
interface LegacyChatRequest {
  messages: Array<{
    role: 'assistant' | 'user'
    content: string
  }>
}
```

响应：

```ts
interface LegacyChatResponse {
  answer: string
}
```

### 未来目标接口

#### 6.1.1 获取会话列表

```http
GET /api/chat/sessions
```

#### 6.1.2 创建会话

```http
POST /api/chat/sessions
```

#### 6.1.3 获取会话消息

```http
GET /api/chat/sessions/{sessionId}/messages
```

#### 6.1.4 发送消息

```http
POST /api/chat/sessions/{sessionId}/messages
```

#### 6.1.5 流式发送消息

```http
POST /api/chat/sessions/{sessionId}/messages/stream
```

#### 6.1.6 删除会话

```http
DELETE /api/chat/sessions/{sessionId}
```

#### 6.1.7 修改会话标题

```http
PATCH /api/chat/sessions/{sessionId}
```

#### 6.1.8 重新生成消息

```http
POST /api/chat/messages/{messageId}/regenerate
```

### 验收标准

1. 旧接口调用从 `App.vue` 移入 `src/api/chat.ts`。
2. 新接口函数可以先定义类型和函数占位。
3. 第一阶段不强制全部接通后端。
4. 所有接口函数命名语义清晰。

---

# 7. 模块五：访客身份

## 7.1 优化事项编号：PC-FE-005

### 名称

增加 visitorId 访客身份机制。

### 问题

当前没有登录，也没有游客身份。后端无法区分不同访问者。

### 目标

在不做登录的情况下，为每个浏览器生成稳定访客身份。

### 新增文件

```txt
src/composables/useVisitorId.ts
src/constants/storageKeys.ts
```

### localStorage key

```ts
export const PAN_CHAT_VISITOR_ID_KEY = 'pan-chat-visitor-id'
```

### 规则

1. 首次访问时生成 `visitorId`。
2. 使用 `crypto.randomUUID()`。
3. 如果浏览器不支持，使用 fallback 随机 ID。
4. 保存到 localStorage。
5. 后续请求自动带上：

```http
X-Visitor-Id: visitor_xxx
```

### visitorId 格式建议

```txt
visitor_${uuid}
```

### 验收标准

1. 首次打开页面自动生成 visitorId。
2. 刷新页面 visitorId 不变。
3. 清空 localStorage 后重新生成。
4. API 请求头自动携带 visitorId。
5. 不影响当前无需登录的使用体验。

---

# 8. 模块六：预留登录能力

## 8.1 优化事项编号：PC-FE-006

### 名称

预留登录能力与用户状态契约。

### 当前阶段要求

当前不实现真实登录 UI，不要求用户登录后才能使用；聊天流程继续以游客模式和 visitorId 工作。

### 目标

在文档中明确未来登录接入契约和边界，避免后续引入登录时推翻 visitorId 与请求层设计。

### 当前阶段不新增代码文件

当前阶段默认不创建 `src/api/auth.ts`、`src/stores/auth.ts`、`src/types/user.ts`。

如果后续团队明确要求提前落代码，最多只允许新增纯类型文件 `src/types/user.ts`，且只能包含 `UserInfo`、`AuthState` 等类型定义，不允许运行时代码、接口调用、token 存储或 store 初始化。

### 用户类型

```ts
export interface UserInfo {
  id: string
  nickname: string
  avatar?: string
  type: 'visitor' | 'registered'
}
```

### Auth 状态

```ts
export interface AuthState {
  token: string | null
  visitorId: string
  user: UserInfo | null
  initialized: boolean
}
```

### 未来接口契约

```http
POST /api/auth/login
POST /api/auth/logout
GET /api/me
```

这些接口只作为未来后端契约，当前阶段不创建 `src/api/auth.ts`，不调用 `/api/auth/login`、`/api/auth/logout` 或 `/api/me`。

### 鉴权优先级

未来登录能力真正接入后，请求身份优先级如下。

1. 如果存在 token，普通 API 请求可以使用：

```http
Authorization: Bearer ${token}
```

同时仍然可以携带 `X-Visitor-Id`，用于日志追踪和游客数据绑定线索。

2. 如果不存在 token，继续只使用：

```http
X-Visitor-Id: ${visitorId}
```

当前阶段 `request.ts` 只注入 `X-Visitor-Id`，不读取 token，也不注入 `Authorization`。

### visitorId 与登录用户关系

当前阶段：

```txt
visitorId = 匿名浏览器标识
```

未来登录后：

```txt
token = 登录身份凭证
visitorId = 匿名访问轨迹 / 设备追踪 / 游客数据绑定线索
```

未来可以在登录请求中携带 visitorId，由后端决定是否把游客数据绑定到登录用户；当前阶段不实现该流程。

### 验收标准

1. 当前不登录也能使用。
2. 当前不创建真实登录 UI 或注册 UI。
3. 当前不调用登录、登出或 `/api/me` 接口。
4. 当前不创建真实 auth store。
5. 当前不写死假 token，不向 localStorage 写入 token。
6. 当前不实现 refresh token 或 401 自动跳转登录。
7. 当前 `request.ts` 只注入 `X-Visitor-Id`，不注入 `Authorization`。
8. `UserInfo`、`AuthState`、未来接口契约只作为文档预留。
9. 后续加登录时不用推翻 visitorId 和请求层设计。

---

# 9. 模块七：组件拆分

## 9.1 优化事项编号：PC-FE-007

### 名称

拆分 `App.vue` 聊天页面组件。

### 问题

当前 UI、状态、请求、消息处理集中在 `App.vue` 中。

### 目标

将聊天页面拆分成独立组件。

### 组件列表

```txt
ChatLayout.vue
ChatSidebar.vue
ChatHeader.vue
MessageList.vue
MessageItem.vue
ChatInput.vue
EmptyState.vue
ErrorState.vue
LoadingState.vue
```

### 组件职责

#### ChatLayout.vue

负责整体布局。

#### ChatSidebar.vue

负责会话列表、新建会话、用户入口。

#### ChatHeader.vue

负责展示当前会话标题、模型状态、操作按钮。

#### MessageList.vue

负责消息列表渲染和滚动区域。

#### MessageItem.vue

负责单条消息展示。

#### ChatInput.vue

负责输入框、发送按钮、停止生成按钮。

#### EmptyState.vue

负责无会话或无消息时的空状态。

#### ErrorState.vue

负责错误状态展示。

#### LoadingState.vue

负责加载中状态展示。

### 验收标准

1. `App.vue` 只负责组装页面。
2. 单个组件职责清晰。
3. 输入框组件不直接关心后端接口。
4. 消息组件不直接修改全局状态。
5. 会话组件不直接发模型请求。

---

# 10. 模块八：聊天状态管理

## 10.1 优化事项编号：PC-FE-008

### 名称

建立聊天状态管理。

### 当前阶段选择

可以二选一：

1. 使用 Pinia。
2. 暂时使用 composables + reactive。

推荐使用 Pinia，因为聊天状态会持续变复杂。

### ChatState

```ts
export interface ChatState {
  sessions: ChatSession[]
  currentSessionId: string | null
  messagesMap: Record<string, ChatMessage[]>
  loadingSessions: boolean
  loadingMessages: boolean
  sending: boolean
  streaming: boolean
  error: string | null
}
```

### 必要 actions

```ts
loadSessions()
createSession()
selectSession(sessionId: string)
loadMessages(sessionId: string)
sendMessage(content: string)
sendMessageStream(content: string)
deleteSession(sessionId: string)
renameSession(sessionId: string, title: string)
stopGenerating()
regenerateMessage(messageId: string)
```

### 验收标准

1. 会话列表和消息列表从统一状态读取。
2. 发送中、流式中、加载中都有明确状态。
3. 组件不各自维护重复状态。
4. 当前会话切换后消息正确展示。
5. 错误状态可被 UI 展示。

---

# 11. 模块九：会话管理

## 11.1 优化事项编号：PC-FE-009

### 名称

新增会话管理能力。

### 目标

让聊天从“单次对话”升级为“多会话”。

### 功能项

#### PC-FE-009-01 新建会话

1. 用户点击“新建聊天”。
2. 创建新会话。
3. 自动切换到新会话。
4. 消息列表显示空状态。

#### PC-FE-009-02 切换会话

1. 用户点击左侧会话。
2. 切换当前会话。
3. 加载该会话消息。

#### PC-FE-009-03 删除会话

1. 用户点击删除。
2. 弹出确认。
3. 删除后从列表移除。
4. 如果删除当前会话，自动切换到最近一个会话。
5. 如果没有剩余会话，显示空状态。

#### PC-FE-009-04 重命名会话

1. 用户可以修改会话标题。
2. 标题为空时不允许保存。
3. 标题长度需要限制。

#### PC-FE-009-05 自动生成标题

第一阶段可以不接后端，前端简单截取用户第一条消息作为标题。

规则：

```txt
取第一条用户消息前 20 个字符作为标题
```

### 验收标准

1. 页面有明确会话列表。
2. 用户可以新建、切换、删除会话。
3. 每个会话有独立消息列表。
4. 没有会话时有空状态。
5. 第一阶段允许使用 localStorage mock。

---

# 12. 模块十：消息发送

## 12.1 优化事项编号：PC-FE-010

### 名称

重构消息发送流程。

### 目标

建立标准消息发送流程，支持后续普通接口和流式接口。

### 普通消息发送流程

1. 用户输入内容。
2. 前端校验内容非空。
3. 如果没有当前会话，自动创建会话。
4. 插入用户消息，状态为 `completed`。
5. 插入 assistant 占位消息，状态为 `pending`。
6. 调用后端接口。
7. 成功后更新 assistant 消息内容和状态。
8. 失败后更新 assistant 消息为 `failed`。
9. UI 展示失败原因和重试按钮。

### 输入校验

1. 不允许发送空字符串。
2. 自动 trim。
3. 最大长度建议 4000 字符。
4. 发送中可禁止重复点击。
5. streaming 中发送策略待讨论，默认禁止并提示。

### 验收标准

1. 发送消息有明确状态变化。
2. 请求失败不会导致消息丢失。
3. 可以看到失败状态。
4. 可以基于失败消息重试。
5. 发送逻辑不写在 UI 组件里。

---

# 13. 模块十一：SSE 流式输出

## 13.1 优化事项编号：PC-FE-011

### 名称

预留并实现 SSE 流式聊天能力。

### 当前阶段策略

可以先完成结构预留，后端接口完成后再接入。

### 目标接口

```http
POST /api/chat/sessions/{sessionId}/messages/stream
```

### 事件格式

```txt
event: message-created
data: {"userMessageId":"msg_101","assistantMessageId":"msg_102"}

event: delta
data: {"content":"你好"}

event: delta
data: {"content":"，pan"}

event: done
data: {"messageId":"msg_102"}

event: error
data: {"error":"模型服务异常"}
```

### 前端处理逻辑

1. 发送前创建 `AbortController`。
2. 插入 user 消息。
3. 插入 assistant 占位消息。
4. assistant 状态设为 `streaming`。
5. 收到 `delta` 后拼接 content。
6. 收到 `done` 后状态改为 `completed`。
7. 收到 `error` 后状态改为 `failed`。
8. 用户点击停止时调用 `abort()`。
9. 停止后状态改为 `stopped`。
10. 可以重新生成。

### 新增文件

```txt
src/composables/useChatStream.ts
src/composables/useAbortController.ts
```

### 验收标准

1. 具备流式输出代码结构。
2. 可以根据 SSE delta 增量更新消息。
3. 可以停止生成。
4. 错误和中断有 UI 状态。
5. 流式逻辑不污染普通发送逻辑。

---

# 14. 模块十二：消息操作

## 14.1 优化事项编号：PC-FE-012

### 名称

增加基础消息操作。

### 功能项

#### PC-FE-012-01 复制消息

1. 用户可以复制任意消息内容。
2. 复制成功后显示提示。

#### PC-FE-012-02 重新发送

1. 用户消息发送失败后可以重新发送。
2. 重新发送时复用原始内容。

#### PC-FE-012-03 重新生成

1. 对 assistant 消息支持重新生成。
2. 默认只能重新生成最后一条 assistant 消息。
3. 后续可以扩展为任意历史节点重新生成。

#### PC-FE-012-04 删除消息

第一阶段可以不做。  
如果做，必须考虑上下文截断问题。

### 验收标准

1. 消息可以复制。
2. 失败消息可以重试。
3. assistant 最后一条消息可以重新生成。
4. 操作按钮不会污染消息正文显示。

---

# 15. 模块十三：本地持久化与 Mock

## 15.1 优化事项编号：PC-FE-013

### 名称

增加本地 mock 和 localStorage 持久化。

### 目标

在后端接口未完成时，前端仍可独立开发会话功能。

### 新增文件

```txt
src/services/chatLocalStorage.ts
src/services/chatMockService.ts
```

### localStorage keys

```ts
export const PAN_CHAT_VISITOR_ID_KEY = 'pan-chat-visitor-id'
export const PAN_CHAT_SESSIONS_KEY = 'pan-chat-sessions'
export const PAN_CHAT_MESSAGES_KEY = 'pan-chat-messages'
```

### 要求

1. 本地保存会话列表。
2. 本地保存每个会话的消息。
3. 支持清空本地数据。
4. 后续切换真实后端接口时，尽量不影响 UI 层。

### 验收标准

1. 后端不可用时，前端仍能开发 UI 和交互。
2. 刷新页面后本地会话不丢失。
3. localStorage 操作集中在 service 中。
4. 组件中不直接写 localStorage 读写逻辑。

---

# 16. 模块十四：错误处理

## 16.1 优化事项编号：PC-FE-014

### 名称

统一错误处理机制。

### 必须处理的错误

1. 网络错误。
2. 后端 400。
3. 后端 401。
4. 后端 403。
5. 后端 404。
6. 后端 500。
7. LLM 服务超时。
8. SSE 中断。
9. 用户主动停止生成。
10. visitorId 丢失。
11. 会话不存在。
12. 消息发送失败。

### UI 表现

1. 顶部或局部 toast。
2. 消息级错误状态。
3. 失败消息显示重试按钮。
4. 页面级错误使用 `ErrorState.vue`。
5. 不允许白屏。
6. 不允许错误只在 console 中出现。

### 验收标准

1. 常见错误都有用户可见反馈。
2. 请求失败不会导致 UI 状态错乱。
3. 流式中断有明确状态。
4. token 相关错误预留处理入口。

---

# 17. 模块十五：加载状态与空状态

## 17.1 优化事项编号：PC-FE-015

### 名称

补全 loading、empty、disabled 状态。

### 需要的状态

1. 加载会话列表中。
2. 加载消息中。
3. 发送消息中。
4. 流式生成中。
5. 无会话。
6. 当前会话无消息。
7. 后端不可用。
8. 输入为空时发送按钮 disabled。
9. 请求中发送按钮 disabled。
10. 生成中显示停止按钮。

### 验收标准

1. 用户不会不知道系统正在做什么。
2. 每个主要异步操作都有状态反馈。
3. 空状态有引导操作。
4. 不出现按钮疯狂连点导致重复请求。

---

# 18. 模块十六：输入框体验

## 18.1 优化事项编号：PC-FE-016

### 名称

优化聊天输入框。

### 功能要求

1. 支持多行输入。
2. Enter 发送。
3. Shift + Enter 换行。
4. 输入为空时不能发送。
5. 发送中禁用发送按钮。
6. streaming 时显示“停止生成”。
7. 限制最大输入长度。
8. 显示字数限制或超长提示。
9. 粘贴长文本时不崩 UI。
10. 移动端行为后续再优化。

### 验收标准

1. 输入体验符合常见聊天应用习惯。
2. Enter 和换行逻辑正确。
3. 超长输入有提示。
4. 状态切换清晰。

---

# 19. 模块十七：自动滚动

## 19.1 优化事项编号：PC-FE-017

### 名称

优化消息列表自动滚动。

### 功能要求

1. 新消息出现时自动滚动到底部。
2. 流式输出时默认跟随滚动。
3. 用户手动向上滚动查看历史时，不强制拉回底部。
4. 用户点击“回到底部”后恢复跟随。
5. 会话切换后滚动到底部。

### 新增文件

```txt
src/composables/useAutoScroll.ts
```

### 验收标准

1. 新消息不会出现在屏幕外导致用户看不到。
2. 用户查看历史时不会被强行拽到底部。
3. 流式输出体验自然。

---

# 20. 模块十八：配置管理

## 20.1 优化事项编号：PC-FE-018

### 名称

抽取聊天配置。

### 新增文件

```txt
src/config/chat.ts
```

### 配置项

```ts
export const chatConfig = {
  maxInputLength: 4000,
  defaultModel: 'gpt-4o-mini',
  enableStreaming: false,
  enableLocalMock: true,
  maxLocalMessages: 200,
}
```

### 验收标准

1. 魔法数字不散落在组件中。
2. 是否启用流式可以通过配置控制。
3. 默认模型集中管理。
4. 输入长度限制集中管理。

---

# 21. 模块十九：兼容旧接口

## 21.1 优化事项编号：PC-FE-019

### 名称

保留 `/chat/api/chat` 旧接口兼容能力。

### 背景

当前已有接口是：

```http
POST /chat/api/chat
```

响应：

```json
{
  "answer": "..."
}
```

### 需求

在新后端接口完成前，前端仍应可以调用旧接口。

### 策略

1. 新增 `sendLegacyChat()`。
2. 将当前会话消息转换成旧接口需要的 `messages`。
3. 旧接口返回后，转成新的 `ChatMessage`。
4. 后续新接口稳定后，再考虑移除旧接口。

### 验收标准

1. 重构后当前聊天仍可用。
2. 不因新模型结构导致旧接口无法调用。
3. 兼容逻辑封装在 API/service 层，不散落在组件中。

---

# 22. 模块二十：新后端接口契约

## 22.1 优化事项编号：PC-FE-020

### 名称

定义新后端接口契约。

### 目标

为后端开发提供明确接口设计。

## 22.2 会话接口

### 获取会话列表

```http
GET /api/chat/sessions
```

响应：

```ts
ApiResult<ChatSession[]>
```

### 创建会话

```http
POST /api/chat/sessions
```

请求：

```ts
CreateSessionPayload
```

响应：

```ts
ApiResult<ChatSession>
```

### 修改会话

```http
PATCH /api/chat/sessions/{sessionId}
```

请求：

```ts
{
  title: string
}
```

响应：

```ts
ApiResult<ChatSession>
```

### 删除会话

```http
DELETE /api/chat/sessions/{sessionId}
```

响应：

```ts
ApiResult<null>
```

## 22.3 消息接口

### 获取消息列表

```http
GET /api/chat/sessions/{sessionId}/messages
```

响应：

```ts
ApiResult<ChatMessage[]>
```

### 发送消息

```http
POST /api/chat/sessions/{sessionId}/messages
```

请求：

```ts
{
  content: string
  model?: string
}
```

响应：

```ts
ApiResult<{
  userMessage: ChatMessage
  assistantMessage: ChatMessage
}>
```

### 流式发送消息

```http
POST /api/chat/sessions/{sessionId}/messages/stream
```

响应：

```txt
text/event-stream
```

### 重新生成

```http
POST /api/chat/messages/{messageId}/regenerate
```

请求：

```ts
{
  model?: string
}
```

响应：

```ts
ApiResult<ChatMessage>
```

### 验收标准

1. 前端类型和后端接口字段一致。
2. 接口命名符合 REST 风格。
3. 后续后端可以直接根据本文档实现。
4. 旧接口和新接口有明确过渡策略。

---

# 23. 模块二十一：UI 布局优化

## 23.1 优化事项编号：PC-FE-021

### 名称

将聊天 UI 调整为标准布局。

### 建议布局

```txt
┌───────────────────────────────────────┐
│ ChatSidebar │       ChatHeader         │
│             ├─────────────────────────┤
│             │                         │
│ SessionList │       MessageList        │
│             │                         │
│             ├─────────────────────────┤
│ UserEntry   │        ChatInput         │
└───────────────────────────────────────┘
```

### 页面区域

1. 左侧：会话列表。
2. 顶部：当前会话标题、模型状态、操作按钮。
3. 中间：消息列表。
4. 底部：输入框。
5. 无会话时：展示空状态。

### 验收标准

1. 页面区域清晰。
2. 会话和消息不混在一起。
3. 输入区固定在底部。
4. 消息区可滚动。
5. 左侧会话列表可以后续隐藏或响应式处理。

---

# 24. 模块二十二：代码质量要求

## 24.1 优化事项编号：PC-FE-022

### 名称

统一代码质量要求。

### 要求

1. 使用 TypeScript 类型，不使用大面积 `any`。
2. 组件 props 和 emits 必须定义类型。
3. API 函数必须定义请求和响应类型。
4. 不在组件中硬编码接口地址。
5. 不在组件中直接读写 localStorage。
6. 不在组件中直接拼接复杂请求参数。
7. 不在 UI 组件中写模型调用逻辑。
8. 不在 console 中吞掉错误。
9. 避免超大单文件组件。
10. 避免过早引入复杂抽象。

### 验收标准

1. `vue-tsc --noEmit` 通过。
2. 构建通过。
3. 主要模块职责清晰。
4. 重构后功能不倒退。

---

# 25. 推荐实施顺序

## 25.1 第一阶段：基础结构重构

对应事项：

```txt
PC-FE-001
PC-FE-002
PC-FE-003
PC-FE-004
PC-FE-005
PC-FE-019
```

目标：

1. 抽目录。
2. 抽类型。
3. 抽 API。
4. 增加 visitorId。
5. 保持旧接口可用。

完成后效果：

1. 现有聊天功能不变。
2. 代码结构更清楚。
3. 可以继续接后端。

---

## 25.2 第二阶段：组件拆分与状态管理

对应事项：

```txt
PC-FE-007
PC-FE-008
PC-FE-015
PC-FE-016
PC-FE-017
PC-FE-018
PC-FE-021
PC-FE-022
```

目标：

1. 拆 App.vue。
2. 建立聊天状态。
3. 优化输入框。
4. 补全 loading / empty / error 状态。
5. 补自动滚动。
6. 调整标准聊天布局。

完成后效果：

1. 页面结构接近标准聊天应用。
2. 组件更容易维护。
3. 用户体验明显提升。

---

## 25.3 第三阶段：会话管理

对应事项：

```txt
PC-FE-009
PC-FE-013
PC-FE-020
```

目标：

1. 支持会话列表。
2. 支持本地新建、切换、删除、重命名会话。
3. 支持 localStorage mock。
4. 明确后端会话接口契约。

完成后效果：

1. 前端可以在无后端情况下模拟多会话。
2. 后端可以按接口契约开发。
3. 后续切换真实接口成本低。

---

## 25.4 第四阶段：消息发送与流式输出

对应事项：

```txt
PC-FE-010
PC-FE-011
PC-FE-012
PC-FE-014
```

目标：

1. 标准化消息发送流程。
2. 支持消息状态。
3. 预留/实现 SSE。
4. 支持停止生成。
5. 支持复制、重试、重新生成。
6. 完善错误处理。

完成后效果：

1. 聊天体验接近正式 AI 应用。
2. 支持普通与流式两种后端模式。
3. 异常状态可恢复。

---

## 25.5 第五阶段：登录预留

对应事项：

```txt
PC-FE-006
```

目标：

1. 在文档中预留登录契约。
2. 明确 token 与 visitorId 的关系。
3. 明确 `/api/auth/login`、`/api/auth/logout`、`/api/me` 只作为未来接口契约。
4. 保持游客模式优先可用，不新增 auth 运行时代码。

完成后效果：

1. 当前不登录也能使用。
2. 当前没有 token、auth store 或登录 UI。
3. 后续加登录不用推翻 visitorId 和请求层设计。

---

# 26. Agent 执行建议

## 26.1 不建议一次性执行全部重构

不要让 agent 一次性执行：

```txt
请重构整个 pan-chat
```

这很容易生成一堆看似完整、实际不好联调的代码。

## 26.2 推荐按阶段执行

### Prompt 1：基础结构

```txt
请只执行 panchat-frontend-refactoring-requirements.md 中第一阶段内容：
PC-FE-001、PC-FE-002、PC-FE-003、PC-FE-004、PC-FE-005、PC-FE-019。

要求：
1. 保持当前 UI 和功能不变。
2. 保持旧接口 /chat/api/chat 可用。
3. 不新增会话侧边栏。
4. 不实现 SSE。
5. 不引入登录。
6. 修改后确保 pnpm build 和 vue-tsc 通过。
```

### Prompt 2：组件拆分

```txt
请只执行第二阶段中的组件拆分和基础状态管理：
PC-FE-007、PC-FE-008、PC-FE-015、PC-FE-016、PC-FE-017、PC-FE-018、PC-FE-021、PC-FE-022。

要求：
1. 保持当前聊天功能可用。
2. 不接新后端接口。
3. 不实现真实会话列表。
4. App.vue 只负责页面组装。
```

### Prompt 3：会话管理

```txt
请执行第三阶段：
PC-FE-009、PC-FE-013、PC-FE-020。

要求：
1. 先使用 localStorage mock 实现会话列表。
2. 支持新建、切换、删除、重命名会话。
3. 每个会话独立保存消息。
4. 类型结构必须和后端接口契约一致。
```

### Prompt 4：消息发送与流式输出

```txt
请执行第四阶段：
PC-FE-010、PC-FE-011、PC-FE-012、PC-FE-014。

要求：
1. 标准化消息发送流程。
2. 支持 assistant 占位消息。
3. 支持消息状态。
4. 支持 SSE delta 拼接。
5. 支持停止生成。
6. 支持失败重试和重新生成。
```

### Prompt 5：登录预留

```txt
请执行第五阶段：
PC-FE-006。

要求：
1. 不实现真实登录页面。
2. 不新增 auth store 和 auth api。
3. 只在文档中预留 UserInfo、AuthState 和未来 auth 接口契约。
4. request.ts 当前不注入 Authorization，只继续使用 X-Visitor-Id。
5. 不调用 /api/auth/login、/api/auth/logout 或 /api/me。
```

---

# 27. Grill-me 讨论清单

后续讨论建议按下面问题逐个 grill。

## 27.1 产品边界

1. `pan-chat` 是个人 AI 分身聊天，还是通用 AI 助手？
2. 是否允许用户看到历史会话？
3. 会话历史是否需要永久保存？
4. 是否需要支持匿名用户跨设备同步？
5. 是否需要限制每日聊天次数？

## 27.2 会话设计

1. 新会话什么时候创建？
2. 第一条消息前创建，还是发送第一条消息时创建？
3. 会话标题由前端生成，还是后端/模型生成？
4. 删除会话是软删除还是硬删除？
5. 是否支持置顶会话？

## 27.3 消息设计

1. 是否允许删除单条消息？
2. 删除单条消息后，上下文如何处理？
3. 是否支持编辑用户消息后重新生成？
4. 是否保存失败消息？
5. 是否保存用户主动停止的半截 assistant 回复？

## 27.4 流式输出

1. 第一版是否必须做 SSE？
2. 如果 LLM 流式失败，是否保留已生成内容？
3. 停止生成后消息状态叫 `stopped` 还是 `failed`？
4. 重新生成是否覆盖旧消息，还是生成新版本？
5. 是否需要展示“正在思考中”？

## 27.5 登录预留

1. 游客会话后续能否绑定到登录用户？
2. token 存 localStorage 还是 cookie？
3. 是否需要 refresh token？
4. 游客数据保存多久？
5. 是否需要 `/api/me` 在首屏初始化时调用？

---

# 28. 当前版本结论

当前最优先的重构路线是：

```txt
先抽 API 和类型
再拆组件
再做会话
再做流式
最后预留登录
```

不要一开始就把登录、文件上传、模型配置、抽奖后端化全部塞进来。

当前最关键的 P0 事项：

```txt
PC-FE-001 目录结构重构
PC-FE-002 统一类型定义
PC-FE-003 统一 API 请求层
PC-FE-004 聊天 API 模块
PC-FE-005 访客身份
PC-FE-019 兼容旧接口
```

只要这几个做好，后面 `pan-chat` 才算真正进入“可被后端接管”的状态。
