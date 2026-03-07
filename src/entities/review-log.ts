import type { CardState } from '@/entities/card'

export type ReviewRating = 'hard' | 'again' | 'good' | 'easy'

export interface ReviewLog {
  id: string
  cardId: string
  deckId: string
  rating: ReviewRating
  previousState: CardState
  newState: CardState
  previousLadderStepIndex: number | null
  newLadderStepIndex: number | null
  reviewedAt: number
  previousDueAt: number | null
  newDueAt: number | null
}
