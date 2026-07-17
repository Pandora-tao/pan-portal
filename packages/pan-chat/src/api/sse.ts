import { getResponseError, HttpError } from './request'

export class SseEventError<T = unknown> extends Error {
  constructor(
    message: string,
    public readonly payload: T,
  ) {
    super(message)
    this.name = 'SseEventError'
  }
}

export async function streamSse(
  url: string,
  options: RequestInit,
  onEvent: (event: string, payload: unknown) => void,
): Promise<void> {
  const headers = new Headers(options.headers)
  if (options.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  headers.set('Accept', 'text/event-stream')

  let response: Response
  try {
    response = await fetch(url, { ...options, credentials: 'include', headers })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new Error('网络连接失败，请检查网络后重试。')
  }

  if (!response.ok) {
    throw new HttpError(response.status, await getResponseError(response))
  }
  if (!response.body) {
    throw new Error('浏览器无法读取流式响应，请稍后再试。')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    buffer += decoder.decode(value, { stream: !done })
    buffer = consumeFrames(buffer, onEvent)
    if (done) break
  }
  if (buffer.trim()) consumeFrame(buffer, onEvent)
}

function consumeFrames(
  source: string,
  onEvent: (event: string, payload: unknown) => void,
): string {
  let buffer = source
  let boundary = buffer.search(/\r?\n\r?\n/)
  while (boundary >= 0) {
    const match = buffer.slice(boundary).match(/^\r?\n\r?\n/)
    const separatorLength = match?.[0].length ?? 2
    consumeFrame(buffer.slice(0, boundary), onEvent)
    buffer = buffer.slice(boundary + separatorLength)
    boundary = buffer.search(/\r?\n\r?\n/)
  }
  return buffer
}

function consumeFrame(frame: string, onEvent: (event: string, payload: unknown) => void) {
  let event = 'message'
  const data: string[] = []
  for (const line of frame.split(/\r?\n/)) {
    if (line.startsWith('event:')) event = line.slice(6).trim()
    if (line.startsWith('data:')) data.push(line.slice(5).trimStart())
  }
  if (data.length === 0) return

  const raw = data.join('\n')
  let payload: unknown
  try {
    payload = JSON.parse(raw)
  } catch {
    payload = raw
  }
  if (event === 'error') {
    const message = isMessagePayload(payload) ? payload.message : '消息生成失败，请稍后再试。'
    throw new SseEventError(message, payload)
  }
  onEvent(event, payload)
}

function isMessagePayload(payload: unknown): payload is { message: string } {
  return typeof payload === 'object'
    && payload !== null
    && 'message' in payload
    && typeof payload.message === 'string'
}
