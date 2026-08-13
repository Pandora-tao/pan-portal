export type PrizeClaimStatus = 'UNCLAIMED' | 'CLAIMED' | 'REDEEMED'

export interface DrawRecord {
  id: string
  prizeKey: string
  prizeType: 'TEXT' | 'RED_PACKET'
  prizeName: string
  prizeAmount: number | null
  prizeDisplayName: string
  claimStatus: PrizeClaimStatus
  claimedAt: string | null
  redeemedAt: string | null
  redeemNote: string | null
  createdAt: string
}

export interface DrawState {
  activityVersion: string
  chances: number
  draws: DrawRecord[]
  bonusClaimed: boolean
  basicFailedQuestionIds: string[]
  friendshipSunk: boolean
  advancedAnsweredQuestionIds: string[]
  advancedScore: number
  drawReady: boolean
}

export const createDefaultDrawState = (): DrawState => ({
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
