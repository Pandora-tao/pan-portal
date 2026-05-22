export type ChatRole = 'assistant' | 'user'

export type MessageStatus = 'pending' | 'completed' | 'failed'

export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  status?: MessageStatus
}

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
