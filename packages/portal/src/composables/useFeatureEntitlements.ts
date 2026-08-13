import { ref } from 'vue'
import {
  acknowledgeFeatureGuide,
  getFeatureEntitlements,
  type FeatureEntitlement,
} from '../api/features.ts'

export const LUCKY_DRAW_FEATURE_KEY = 'lucky_draw'

export const isFeatureUnlocked = (entitlements: FeatureEntitlement[], featureKey: string) =>
  entitlements.some((entitlement) => entitlement.featureKey === featureKey && entitlement.unlocked)

export const isFeatureGuidePending = (entitlements: FeatureEntitlement[], featureKey: string) =>
  entitlements.some((entitlement) => entitlement.featureKey === featureKey && entitlement.guidePending)

export const useFeatureEntitlements = () => {
  const entitlements = ref<FeatureEntitlement[]>([])
  const isLoading = ref(false)

  const loadEntitlements = async () => {
    isLoading.value = true
    try {
      entitlements.value = await getFeatureEntitlements()
      return entitlements.value
    } finally {
      isLoading.value = false
    }
  }

  const ackGuide = async (featureKey: string) => {
    await acknowledgeFeatureGuide(featureKey)
    entitlements.value = entitlements.value.map((entitlement) =>
      entitlement.featureKey === featureKey
        ? { ...entitlement, guidePending: false }
        : entitlement,
    )
  }

  return { entitlements, isLoading, loadEntitlements, ackGuide }
}
