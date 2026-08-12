import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  isFeatureGuidePending,
  isFeatureUnlocked,
  LUCKY_DRAW_FEATURE_KEY,
} from '../useFeatureEntitlements.ts'
import type { FeatureEntitlement } from '../../api/features'

const unlockedPending: FeatureEntitlement = {
  featureKey: LUCKY_DRAW_FEATURE_KEY,
  unlocked: true,
  guidePending: true,
}

const unlockedAcked: FeatureEntitlement = {
  featureKey: LUCKY_DRAW_FEATURE_KEY,
  unlocked: true,
  guidePending: false,
}

const locked: FeatureEntitlement = {
  featureKey: LUCKY_DRAW_FEATURE_KEY,
  unlocked: false,
  guidePending: false,
}

test('empty entitlements hide the feature for guests and unverified sessions', () => {
  assert.equal(isFeatureUnlocked([], LUCKY_DRAW_FEATURE_KEY), false)
  assert.equal(isFeatureGuidePending([], LUCKY_DRAW_FEATURE_KEY), false)
})

test('locked entitlement hides the entry even when a row exists', () => {
  assert.equal(isFeatureUnlocked([locked], LUCKY_DRAW_FEATURE_KEY), false)
  assert.equal(isFeatureGuidePending([locked], LUCKY_DRAW_FEATURE_KEY), false)
})

test('unlocked entitlement with pending guide shows entry and pending guide', () => {
  assert.equal(isFeatureUnlocked([unlockedPending], LUCKY_DRAW_FEATURE_KEY), true)
  assert.equal(isFeatureGuidePending([unlockedPending], LUCKY_DRAW_FEATURE_KEY), true)
})

test('after ACK the entry stays unlocked but the guide never repeats', () => {
  assert.equal(isFeatureUnlocked([unlockedAcked], LUCKY_DRAW_FEATURE_KEY), true)
  assert.equal(isFeatureGuidePending([unlockedAcked], LUCKY_DRAW_FEATURE_KEY), false)
})

test('other feature keys never affect the lucky draw decision', () => {
  const other: FeatureEntitlement = {
    featureKey: 'another_feature',
    unlocked: true,
    guidePending: true,
  }

  assert.equal(isFeatureUnlocked([other], LUCKY_DRAW_FEATURE_KEY), false)
  assert.equal(isFeatureGuidePending([other], LUCKY_DRAW_FEATURE_KEY), false)
})
