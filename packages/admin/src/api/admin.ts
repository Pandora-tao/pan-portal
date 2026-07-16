import type {
  AdminMe,
  AuditView,
  ConversationDetail,
  ConversationSummary,
  DashboardSummary,
  PageResponse,
  TrendPoint,
  UserDetail,
  UserSummary,
} from '../types/admin'

interface ApiResult<T> {
  code: number
  message: string
  data: T
}

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  })
  let result: ApiResult<T> | null = null
  try {
    result = (await response.json()) as ApiResult<T>
  } catch {
    // Non-JSON failures use the stable fallback below.
  }
  if (!response.ok || !result) {
    throw new HttpError(response.status, result?.message || '服务暂时不可用')
  }
  return result.data
}

function query(params: Record<string, string | number | null | undefined>) {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') search.set(key, String(value))
  })
  const suffix = search.toString()
  return suffix ? `?${suffix}` : ''
}

export const adminApi = {
  login: (email: string, password: string) =>
    request<AdminMe>('/api/auth/admin/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  logout: () => request<void>('/api/auth/admin/logout', { method: 'POST' }),
  me: () => request<AdminMe>('/api/admin/me'),
  summary: () => request<DashboardSummary>('/api/admin/dashboard/summary'),
  trends: (days: number) => request<TrendPoint[]>(`/api/admin/dashboard/trends${query({ days })}`),
  users: (params: Record<string, string | number | null | undefined>) =>
    request<PageResponse<UserSummary>>(`/api/admin/users${query(params)}`),
  user: (id: string) => request<UserDetail>(`/api/admin/users/${id}`),
  updateProfile: (id: string, body: { displayName: string; realName: string | null }) =>
    request<UserSummary>(`/api/admin/users/${id}/profile`, { method: 'PATCH', body: JSON.stringify(body) }),
  userAction: (id: string, action: 'disable' | 'enable' | 'sessions/revoke', reason: string) =>
    request<UserSummary | void>(`/api/admin/users/${id}/${action}`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  updateRole: (id: string, role: 'USER' | 'SUPER_ADMIN', reason: string) =>
    request<UserSummary>(`/api/admin/users/${id}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role, reason }),
    }),
  createPasswordReset: (id: string, reason: string) =>
    request<{ resetUrl: string; expiresAt: string }>(`/api/admin/users/${id}/password-reset`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),
  superAdmins: () => request<UserSummary[]>('/api/admin/super-admins'),
  conversations: (params: Record<string, string | number | null | undefined>) =>
    request<PageResponse<ConversationSummary>>(`/api/admin/conversations${query(params)}`),
  conversation: (id: string) => request<ConversationDetail>(`/api/admin/conversations/${id}`),
  auditConversationCopy: (id: string, messageId: string) =>
    request<void>(`/api/admin/conversations/${id}/copy-audit`, {
      method: 'POST',
      body: JSON.stringify({ messageId }),
    }),
  deleteConversation: (id: string, reason: string) =>
    request<void>(`/api/admin/conversations/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ reason }),
    }),
  audits: (params: Record<string, string | number | null | undefined>) =>
    request<PageResponse<AuditView>>(`/api/admin/audit-logs${query(params)}`),
}
