export type CardState = 'new' | 'learning' | 'review'

export interface Card {
  id: string
  deckId: string
  frontText: string
  backText: string
  backImageAssetId: string | null
  state: CardState
  ladderStepIndex: number | null
  dueAt: number | null
  lastReviewedAt: number | null
  createdAt: number
  updatedAt: number
}
