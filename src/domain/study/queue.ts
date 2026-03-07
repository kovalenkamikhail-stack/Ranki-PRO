import type { Card } from '@/entities/card'
import {
  DEFAULT_NEW_CARD_ORDER,
  type NewCardOrder,
} from '@/entities/deck'

export interface DeckStudyQueueLimits {
  newCardsPerDay: number
  maxReviewsPerDay: number | null
  introducedNewCardsToday?: number
  newCardOrder?: NewCardOrder
}

export interface BuildDeckStudyQueueOptions extends DeckStudyQueueLimits {
  deckId: string
  cards: readonly Card[]
  now: number
}

export interface DeckStudyQueue {
  dueCards: Card[]
  newCards: Card[]
  cards: Card[]
}

function compareDueCards(left: Card, right: Card) {
  const dueAtComparison = (left.dueAt ?? 0) - (right.dueAt ?? 0)

  if (dueAtComparison !== 0) {
    return dueAtComparison
  }

  const lastReviewedAtComparison =
    (left.lastReviewedAt ?? left.createdAt) -
    (right.lastReviewedAt ?? right.createdAt)

  if (lastReviewedAtComparison !== 0) {
    return lastReviewedAtComparison
  }

  const createdAtComparison = left.createdAt - right.createdAt

  if (createdAtComparison !== 0) {
    return createdAtComparison
  }

  return left.id.localeCompare(right.id)
}

function compareNewCards(left: Card, right: Card, newCardOrder: NewCardOrder) {
  if (newCardOrder === 'oldest_first') {
    const createdAtComparison = left.createdAt - right.createdAt

    if (createdAtComparison !== 0) {
      return createdAtComparison
    }

    return left.id.localeCompare(right.id)
  }

  return 0
}

function clampLimit(limit: number) {
  return Math.max(limit, 0)
}

export function isCardDue(card: Card, now: number) {
  return card.state !== 'new' && card.dueAt !== null && card.dueAt <= now
}

export function buildDeckStudyQueue(
  options: BuildDeckStudyQueueOptions,
): DeckStudyQueue {
  const {
    cards,
    deckId,
    now,
    maxReviewsPerDay,
    newCardsPerDay,
    introducedNewCardsToday = 0,
    newCardOrder = DEFAULT_NEW_CARD_ORDER,
  } = options
  const deckCards = cards.filter((card) => card.deckId === deckId)
  const dueCandidates = deckCards.filter((card) => isCardDue(card, now))
  const newCandidates = deckCards.filter((card) => card.state === 'new')
  const dueLimit =
    maxReviewsPerDay === null ? dueCandidates.length : clampLimit(maxReviewsPerDay)
  const remainingNewCards = clampLimit(newCardsPerDay) - clampLimit(introducedNewCardsToday)

  const dueCards = dueCandidates.sort(compareDueCards).slice(0, dueLimit)
  const newCards = newCandidates
    .sort((left, right) => compareNewCards(left, right, newCardOrder))
    .slice(0, Math.max(remainingNewCards, 0))

  return {
    dueCards,
    newCards,
    cards: [...dueCards, ...newCards],
  }
}

export function selectNextStudyCard(options: BuildDeckStudyQueueOptions) {
  return buildDeckStudyQueue(options).cards[0] ?? null
}
