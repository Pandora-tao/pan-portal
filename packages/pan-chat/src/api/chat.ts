import { request } from './request'
import { streamSse } from './sse'
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

export function streamLegacyChat(
  payload: LegacyChatRequest,
  onEvent: (event: string, payload: unknown) => void,
  signal?: AbortSignal,
) {
  return streamSse(`${getLegacyChatApiUrl()}/stream`, {
    method: 'POST',
    body: JSON.stringify(payload),
    signal,
  }, onEvent)
}
