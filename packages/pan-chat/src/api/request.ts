import type { ApiResult, RequestOptions } from './types'

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'HttpError'
  }
}

export async function request<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers)

  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  let response: Response

  try {
    response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers,
    })
  } catch (err) {
    if (err instanceof TypeError) {
      throw new Error('网络连接失败，请检查网络后重试。')
    }
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new Error('请求已取消。')
    }
    throw new Error('请求失败，请稍后再试。')
  }

  if (!response.ok) {
    throw new HttpError(response.status, await getResponseError(response))
  }

  if (options.skipJsonParse) {
    return undefined as T
  }

  try {
    return (await response.json()) as T
  } catch {
    throw new Error('服务器响应格式异常，请稍后再试。')
  }
}

export async function apiRequest<T>(url: string, options: RequestOptions = {}): Promise<T> {
  const result = await request<ApiResult<T>>(url, options)
  return result.data
}

export function isUnauthorizedError(error: unknown): error is HttpError {
  return error instanceof HttpError && error.status === 401
}

export async function getResponseError(response: Response): Promise<string> {
  try {
    const result = (await response.json()) as Partial<ApiResult<unknown>>
    if (typeof result.message === 'string' && result.message.trim()) {
      return result.message
    }
  } catch {
    // Use the stable status fallback below for non-JSON responses.
  }

  return getHttpStatusMessage(response.status)
}

function getHttpStatusMessage(status: number): string {
  switch (status) {
    case 400:
      return '请求参数有误，请检查后重试。'
    case 401:
      return '身份验证失败，请重新登录。'
    case 403:
      return '没有权限执行此操作。'
    case 404:
      return '请求的资源不存在。'
    case 429:
      return '请求太频繁，请稍后再试。'
    case 500:
      return '服务器内部错误，请稍后再试。'
    case 502:
    case 503:
    case 504:
      return '服务暂时不可用，请稍后再试。'
    default:
      return `请求失败（${status}），请稍后再试。`
  }
}
