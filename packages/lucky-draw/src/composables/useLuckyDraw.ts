import { computed } from 'vue'
import { useStorage } from '@vueuse/core'
import { basicQuizzes, prizePool, type RedPacketPrize } from '../data/activity'

const STORAGE_KEY = 'taopan-dragon-boat-lucky-draw-v3'

interface DrawRecord {
  prize: string
  time: string
}

interface DrawState {
  chances: number
  draws: DrawRecord[]
  bonusClaimed: boolean
  basicFailedQuestionIds: string[]
  friendshipSunk: boolean
  advancedAnsweredQuestionIds: string[]
  advancedScore: number
}

const defaultDrawState: DrawState = {
  chances: 1,
  draws: [],
  bonusClaimed: false,
  basicFailedQuestionIds: [],
  friendshipSunk: false,
  advancedAnsweredQuestionIds: [],
  advancedScore: 0,
}

const createRedPacketPrize = (prize: RedPacketPrize) => {
  const amount = Math.floor(Math.random() * (prize.max - prize.min + 1)) + prize.min
  return `${prize.name} ${amount} 元`
}

const pickRandomPrize = () => {
  const prize = prizePool[Math.floor(Math.random() * prizePool.length)]

  if (!prize) {
    return ''
  }

  if (prize.type === 'red-packet') {
    return createRedPacketPrize(prize)
  }

  return prize.name
}

export const useLuckyDraw = () => {
  const state = useStorage<DrawState>(STORAGE_KEY, defaultDrawState, localStorage, {
    mergeDefaults: true,
  })

  const canDraw = computed(() => state.value.chances > 0 && !state.value.friendshipSunk)
  const totalDraws = computed(() => state.value.draws.length)
  const allBasicQuestionsFailed = computed(() => state.value.basicFailedQuestionIds.length >= basicQuizzes.length)

  const drawPrize = () => {
    if (!canDraw.value) {
      return ''
    }

    const prize = pickRandomPrize()
    state.value.chances -= 1
    state.value.draws.push({
      prize,
      time: new Date().toISOString(),
    })

    return prize
  }

  const claimBonusChance = () => {
    if (state.value.bonusClaimed || state.value.friendshipSunk) {
      return false
    }

    state.value.chances += 1
    state.value.bonusClaimed = true
    return true
  }

  const recordBasicFailure = (questionId: string) => {
    if (!state.value.basicFailedQuestionIds.includes(questionId)) {
      state.value.basicFailedQuestionIds.push(questionId)
    }

    if (state.value.basicFailedQuestionIds.length >= basicQuizzes.length) {
      state.value.chances = 0
      state.value.bonusClaimed = true
      state.value.friendshipSunk = true
    }

    return state.value.friendshipSunk
  }

  const recordAdvancedAnswer = (questionId: string, correct: boolean) => {
    if (state.value.advancedAnsweredQuestionIds.includes(questionId)) {
      return false
    }

    state.value.advancedAnsweredQuestionIds.push(questionId)

    if (correct) {
      state.value.advancedScore += 1
    }

    return true
  }

  return {
    state,
    canDraw,
    totalDraws,
    allBasicQuestionsFailed,
    drawPrize,
    claimBonusChance,
    recordBasicFailure,
    recordAdvancedAnswer,
  }
}
