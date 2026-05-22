import { getVisitorId } from '../composables/useVisitorId'
import type { RequestOptions } from './types'

export async function request<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers)

  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json')
  }

  headers.set('X-Visitor-Id', getVisitorId())

  const response = await fetch(url, {
    ...options,
    headers,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => null)
    const message = typeof errorData?.error === 'string' ? errorData.error : '消息发送失败，请稍后再试。'

    throw new Error(message)
  }

  if (options.skipJsonParse) {
    return undefined as T
  }

  return response.json() as Promise<T>
}
