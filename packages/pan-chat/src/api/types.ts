export interface RequestOptions extends RequestInit {
  skipJsonParse?: boolean
}

export interface ApiRequestConfig {
  signal?: AbortSignal
}
