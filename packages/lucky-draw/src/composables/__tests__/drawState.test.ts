import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createDefaultDrawState } from '../drawState.ts'

test('createDefaultDrawState returns a clean independent draw state', () => {
  const dirtyState = createDefaultDrawState()

  dirtyState.chances = 0
  dirtyState.draws.push({
    id: 'draw-1',
    prizeKey: 'test',
    prizeType: 'TEXT',
    prizeName: '测试奖品',
    prizeAmount: null,
    prizeDisplayName: '测试奖品',
    claimStatus: 'UNCLAIMED',
    claimedAt: null,
    redeemedAt: null,
    redeemNote: null,
    createdAt: '2026-05-15T00:00:00.000Z',
  })
  dirtyState.bonusClaimed = true
  dirtyState.basicFailedQuestionIds.push('basic-1')
  dirtyState.friendshipSunk = true
  dirtyState.advancedAnsweredQuestionIds.push('advanced-1')
  dirtyState.advancedScore = 1

  const cleanState = createDefaultDrawState()

  assert.deepEqual(cleanState, {
    activityVersion: '',
    chances: 0,
    draws: [],
    bonusClaimed: false,
    basicFailedQuestionIds: [],
    friendshipSunk: false,
    advancedAnsweredQuestionIds: [],
    advancedScore: 0,
    drawReady: false,
  })
  assert.notEqual(cleanState.draws, dirtyState.draws)
  assert.notEqual(cleanState.basicFailedQuestionIds, dirtyState.basicFailedQuestionIds)
  assert.notEqual(cleanState.advancedAnsweredQuestionIds, dirtyState.advancedAnsweredQuestionIds)
})
