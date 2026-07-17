import { computed, ref } from 'vue'
import { luckyDrawApi } from '../api/luckyDraw'
import { basicQuizzes } from '../data/activity'
import { createDefaultDrawState, type DrawRecord } from './drawState'

export const useLuckyDraw = () => {
  const state = ref(createDefaultDrawState())
  const isLoading = ref(true)

  const canDraw = computed(() => state.value.chances > 0 && !state.value.friendshipSunk)
  const totalDraws = computed(() => state.value.draws.length)
  const allBasicQuestionsFailed = computed(() => state.value.basicFailedQuestionIds.length >= basicQuizzes.length)

  const initialize = async () => {
    isLoading.value = true
    try {
      state.value = await luckyDrawApi.state()
    } finally {
      isLoading.value = false
    }
  }

  const drawPrize = async (): Promise<DrawRecord | null> => {
    if (!canDraw.value) {
      return null
    }
    const result = await luckyDrawApi.draw()
    state.value = result.state
    return result.draw
  }

  const recordBasicAnswer = async (questionId: string, selectedAnswer: string) => {
    const result = await luckyDrawApi.answer(questionId, 'BASIC', selectedAnswer)
    state.value = result.state
    return result
  }

  const recordAdvancedAnswer = async (questionId: string, selectedAnswer: string) => {
    const result = await luckyDrawApi.answer(questionId, 'ADVANCED', selectedAnswer)
    state.value = result.state
    return result
  }

  const claimPrize = async (drawId: string) => {
    const claimed = await luckyDrawApi.claim(drawId)
    state.value.draws = state.value.draws.map((draw) => (draw.id === claimed.id ? claimed : draw))
    return claimed
  }

  return {
    state,
    canDraw,
    totalDraws,
    allBasicQuestionsFailed,
    isLoading,
    initialize,
    drawPrize,
    recordBasicAnswer,
    recordAdvancedAnswer,
    claimPrize,
  }
}
