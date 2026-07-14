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

export interface ChatSession {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  pinned?: boolean
  lastMessagePreview?: string
  titleManuallyEdited?: boolean
}

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

export interface SendMessageResponse {
  userMessage: PersistedChatMessage
  assistantMessage: PersistedChatMessage
}

export interface UserInfo {
  id: string
  email: string
  displayName: string
  createdAt: string
}
