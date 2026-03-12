export type NewCardOrder = 'oldest_first' | 'random'

export const DEFAULT_NEW_CARD_ORDER: NewCardOrder = 'oldest_first'

export const NEW_CARD_ORDER_OPTIONS = [
  {
    value: 'oldest_first',
    label: 'Oldest first',
    description: 'Show older new cards before newer ones.',
  },
  {
    value: 'random',
    label: 'Randomized daily',
    description:
      'Shuffle new cards deterministically for this deck once per local day.',
  },
] as const satisfies ReadonlyArray<{
  value: NewCardOrder
  label: string
  description: string
}>

const NEW_CARD_ORDER_LABELS: Record<NewCardOrder, string> = {
  oldest_first: 'Oldest first',
  random: 'Randomized daily',
}

export function isNewCardOrder(value: unknown): value is NewCardOrder {
  return value === 'oldest_first' || value === 'random'
}

export function getNewCardOrderLabel(newCardOrder: NewCardOrder) {
  return NEW_CARD_ORDER_LABELS[newCardOrder]
}

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
