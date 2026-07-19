/**
 * 第一阶段角色类型。
 * 当前旧接口只支持 user / assistant，不强行引入 system。
 */
export type ChatRole = 'user' | 'assistant'

/**
 * 消息状态。
 * streaming / stopped 用于 SSE 生成中和用户主动停止后的状态。
 */
export type MessageStatus = 'pending' | 'streaming' | 'completed' | 'failed' | 'stopped'
export type MessageContentType = 'TEXT' | 'STICKER'
export type MessageOrigin = 'REACTIVE' | 'PROACTIVE'

export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  status: MessageStatus
  createdAt: string
  contentType?: MessageContentType
  stickerKey?: 'lulu' | 'pudding-dog' | 'crab'
  origin?: MessageOrigin
  errorMessage?: string
  feedback?: ChatMessageFeedback
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
  answers?: string[]
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

export type FeedbackRating = 'like' | 'dislike'

export interface ChatMessageFeedback {
  rating?: FeedbackRating
  categories: string[]
  comment?: string
  submittedAt?: string
}

export interface MessageFeedbackInput {
  rating?: FeedbackRating
  categories?: string[]
  comment?: string
}

export interface ChatStreamStartEvent {
  userMessage?: PersistedChatMessage | null
  assistantMessage: PersistedChatMessage
}

export interface ChatStreamDeltaEvent {
  messageId?: string
  delta: string
}

export interface ChatStreamDoneEvent {
  assistantMessages: PersistedChatMessage[]
}

export interface ChatStreamErrorEvent {
  message: string
  assistantMessage?: PersistedChatMessage
  retryable: boolean
}

export interface SendMessageResponse {
  userMessage: PersistedChatMessage
  assistantMessage?: PersistedChatMessage
  assistantMessages?: PersistedChatMessage[]
}

export interface UserInfo {
  id: string
  email: string
  displayName: string
  realName: string | null
  createdAt: string
}
