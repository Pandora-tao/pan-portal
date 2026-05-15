import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createDefaultDrawState } from '../drawState.ts'

test('createDefaultDrawState returns a clean independent draw state', () => {
  const dirtyState = createDefaultDrawState()

  dirtyState.chances = 0
  dirtyState.draws.push({ prize: '测试奖品', time: '2026-05-15T00:00:00.000Z' })
  dirtyState.bonusClaimed = true
  dirtyState.basicFailedQuestionIds.push('basic-1')
  dirtyState.friendshipSunk = true
  dirtyState.advancedAnsweredQuestionIds.push('advanced-1')
  dirtyState.advancedScore = 1

  const cleanState = createDefaultDrawState()

  assert.deepEqual(cleanState, {
    chances: 1,
    draws: [],
    bonusClaimed: false,
    basicFailedQuestionIds: [],
    friendshipSunk: false,
    advancedAnsweredQuestionIds: [],
    advancedScore: 0,
  })
  assert.notEqual(cleanState.draws, dirtyState.draws)
  assert.notEqual(cleanState.basicFailedQuestionIds, dirtyState.basicFailedQuestionIds)
  assert.notEqual(cleanState.advancedAnsweredQuestionIds, dirtyState.advancedAnsweredQuestionIds)
})
