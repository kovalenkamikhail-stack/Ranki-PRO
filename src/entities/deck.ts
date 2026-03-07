export type NewCardOrder = 'oldest_first'

export const DEFAULT_NEW_CARD_ORDER: NewCardOrder = 'oldest_first'

export interface Deck {
  id: string
  name: string
  description: string | null
  useGlobalLimits: boolean
  newCardsPerDayOverride: number | null
  maxReviewsPerDayOverride: number | null
  newCardOrder: NewCardOrder
  createdAt: number
  updatedAt: number
}
