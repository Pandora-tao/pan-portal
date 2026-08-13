/**
 * 未来新后端接口统一响应结构。
 * 注意：当前旧接口 POST /chat/api/chat 返回 { answer: string }，不强制使用 ApiResult。
 */
export interface ApiResult<T> {
  code: number
  message: string
  data: T
}

export interface ApiError {
  code: number
  message: string
  details?: unknown
}

export interface RequestOptions extends RequestInit {
  skipJsonParse?: boolean
}

export interface ApiRequestConfig {
  signal?: AbortSignal
}
