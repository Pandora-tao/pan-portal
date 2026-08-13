import type { DrawRecord, DrawState } from '../composables/drawState'

interface ApiResult<T> {
  code: number
  message: string
  data: T
}

export interface AnswerResponse {
  correct: boolean
  gainedChance: boolean
  state: DrawState
}

export interface DrawResponse {
  draw: DrawRecord
  state: DrawState
}

export class LuckyDrawHttpError extends Error {
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
    throw new LuckyDrawHttpError(response.status, result?.message || '服务暂时不可用，请稍后再试')
  }
  return result.data
}

export const luckyDrawApi = {
  state: () => request<DrawState>('/api/lucky-draw/state'),
  answer: (questionId: string, questionType: 'BASIC' | 'ADVANCED', selectedAnswer: string) =>
    request<AnswerResponse>('/api/lucky-draw/answers', {
      method: 'POST',
      body: JSON.stringify({ questionId, questionType, selectedAnswer }),
    }),
  draw: () => request<DrawResponse>('/api/lucky-draw/draws', { method: 'POST' }),
  claim: (drawId: string) =>
    request<DrawRecord>(`/api/lucky-draw/draws/${drawId}/claim`, { method: 'POST' }),
}
