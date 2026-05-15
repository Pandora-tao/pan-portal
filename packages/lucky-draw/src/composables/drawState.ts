export const STORAGE_KEY = 'taopan-dragon-boat-lucky-draw-v3'

export interface DrawRecord {
  prize: string
  time: string
}

export interface DrawState {
  chances: number
  draws: DrawRecord[]
  bonusClaimed: boolean
  basicFailedQuestionIds: string[]
  friendshipSunk: boolean
  advancedAnsweredQuestionIds: string[]
  advancedScore: number
}

export const createDefaultDrawState = (): DrawState => ({
  chances: 1,
  draws: [],
  bonusClaimed: false,
  basicFailedQuestionIds: [],
  friendshipSunk: false,
  advancedAnsweredQuestionIds: [],
  advancedScore: 0,
})
