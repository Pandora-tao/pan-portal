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
export type MessageContentType = 'TEXT' | 'STICKER' | 'FILE' | 'VOICE'
export type MessageOrigin = 'REACTIVE' | 'PROACTIVE'

export type ChatAttachmentKind = 'FILE' | 'VOICE'

export interface ChatAttachment {
  kind: ChatAttachmentKind
  name: string
  size: number
  mime: string
  durationMs?: number | null
  url: string
}

export interface ChatAttachmentInput {
  attachmentId: string
  kind: ChatAttachmentKind
  name: string
  size: number
  mime: string
  durationMs?: number | null
}

export interface ChatMessage {
  id: string
  clientMessageId?: string | null
  generationId?: string | null
  role: ChatRole
  content: string
  status: MessageStatus
  createdAt: string
  contentType?: MessageContentType
  stickerKey?: 'lulu' | 'pudding-dog' | 'crab'
  attachment?: ChatAttachment
  attachmentKind?: ChatAttachmentKind
  attachmentName?: string
  attachmentSize?: number
  attachmentMime?: string
  attachmentDurationMs?: number | null
  attachmentUrl?: string
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
  clientMessageId?: string | null
  generationId?: string | null
  updatedAt?: string
  metadata?: ChatMessageMetadata
}

export type GenerationStatus = 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'STOPPED'

export interface ChatGenerationSnapshot {
  generationId: string
  status: GenerationStatus
  userMessage: PersistedChatMessage | null
  assistantMessages: PersistedChatMessage[]
  errorCode: string | null
  retryable: boolean
  updatedAt: string
}

export interface ChatMessagePage {
  items: PersistedChatMessage[]
  nextCursor: string | null
  hasMore: boolean
}

export interface ChatIntroduction {
  session: ChatSession
  message: PersistedChatMessage
}

export interface ChatMessageMetadata {
  model?: string
  tokens?: number
  durationMs?: number
  steps?: number
  toolExecutions?: Array<{
    id: string
    name: string
    status: string
  }>
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

export interface ChatStreamDeltaEvent {
  messageId?: string
  delta: string
}

export interface ChatStreamErrorEvent {
  message: string
  assistantMessage?: PersistedChatMessage
  retryable: boolean
}

export interface UserInfo {
  id: string
  email: string
  displayName: string
  realName: string | null
  realNameVerificationStatus: 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED'
  realNameVerifiedAt: string | null
  realNameReviewReason: string | null
  createdAt: string
}
