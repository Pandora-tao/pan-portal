export interface UserInfo {
  id: string
  email: string
  displayName: string
  realName: string | null
  createdAt: string
}

interface ApiResult<T> {
  code: number
  message: string
  data: T
}

interface RegisterPayload {
  email: string
  displayName: string
  realName?: string
  password: string
}

interface LoginPayload {
  email: string
  password: string
}

export async function register(payload: RegisterPayload): Promise<UserInfo> {
  return authRequest<UserInfo>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function login(payload: LoginPayload): Promise<UserInfo> {
  return authRequest<UserInfo>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function logout(): Promise<void> {
  await authRequest<void>('/api/auth/logout', { method: 'POST' })
}

export async function getCurrentUser(): Promise<UserInfo | null> {
  const response = await fetch('/api/me', { credentials: 'include' })
  if (response.status === 401) {
    return null
  }
  return parseResponse<UserInfo>(response)
}

async function authRequest<T>(url: string, init: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })
  return parseResponse<T>(response)
}

async function parseResponse<T>(response: Response): Promise<T> {
  let result: ApiResult<T> | null = null
  try {
    result = (await response.json()) as ApiResult<T>
  } catch {
    // The fallback below provides a stable user-facing error for non-JSON failures.
  }

  if (!response.ok || !result) {
    throw new Error(result?.message || '服务暂时不可用，请稍后再试')
  }

  return result.data
}
