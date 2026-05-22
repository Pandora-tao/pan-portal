import { request } from './request'
import type { LegacyChatRequest, LegacyChatResponse } from '../types/chat'

export function getLegacyChatApiUrl(): string {
  return new URL('api/chat', window.location.origin + import.meta.env.BASE_URL).pathname
}

export function sendLegacyChat(payload: LegacyChatRequest, signal?: AbortSignal) {
  return request<LegacyChatResponse>(getLegacyChatApiUrl(), {
    method: 'POST',
    body: JSON.stringify(payload),
    signal,
  })
}
