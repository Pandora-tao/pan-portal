export interface FeatureEntitlement {
  featureKey: string
  unlocked: boolean
  guidePending: boolean
}

interface ApiResult<T> {
  code: number
  message: string
  data: T
}

export async function getFeatureEntitlements(): Promise<FeatureEntitlement[]> {
  const response = await fetch('/api/features', { credentials: 'include' })
  return parseResponse<FeatureEntitlement[]>(response)
}

export async function acknowledgeFeatureGuide(featureKey: string): Promise<void> {
  const response = await fetch(`/api/features/${encodeURIComponent(featureKey)}/guide-ack`, {
    method: 'POST',
    credentials: 'include',
  })
  await parseResponse<void>(response)
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
