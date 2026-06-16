/**
 * 第一阶段角色类型。
 * 当前旧接口只支持 user / assistant，不强行引入 system。
 */
export type ChatRole = 'user' | 'assistant'

/**
 * 消息状态。
 * streaming / stopped 在模块十一 SSE 阶段落地。
 */
export type MessageStatus = 'pending' | 'streaming' | 'completed' | 'failed' | 'stopped'

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

export interface CurrentChatState {
  messages: ChatMessage[]
  sending: boolean
  error: string | null
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
  titleManuallyEdited?: boolean
}

export type ChatMessagesMap = Record<string, ChatMessage[]>

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

// ─── 新后端接口契约类型（PC-FE-020） ────────────────────────────────
// 以下类型为后续新后端接口预留，当前阶段不直接调用。

/** PATCH /api/chat/sessions/{sessionId} 请求体 */
export interface UpdateSessionPayload {
  title: string
}

/** POST /api/chat/sessions/{sessionId}/messages 响应体 data */
export interface SendMessageResponse {
  userMessage: ChatMessage
  assistantMessage: ChatMessage
}

/** POST /api/chat/messages/{messageId}/regenerate 请求体 */
export interface RegenerateMessageRequest {
  model?: string
}
