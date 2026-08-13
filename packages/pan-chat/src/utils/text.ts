import { chatConfig } from '../config/chat'

export function normalizeMessageContent(content: string): string {
  return content.trim()
}

export function isEmptyMessage(content: string): boolean {
  return normalizeMessageContent(content).length === 0
}

export function isMessageTooLong(content: string, maxLength?: number): boolean {
  return content.length > (maxLength ?? chatConfig.maxInputLength)
}
