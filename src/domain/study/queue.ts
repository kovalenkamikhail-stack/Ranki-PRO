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

function compareNewCardsOldestFirst(left: Card, right: Card) {
  const createdAtComparison = left.createdAt - right.createdAt

  if (createdAtComparison !== 0) {
    return createdAtComparison
  }

  return left.id.localeCompare(right.id)
}

function hashString(value: string) {
  let hash = 2_166_136_261

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16_777_619)
  }

  return hash >>> 0
}

function formatLocalDaySeedKey(now: number) {
  const day = new Date(now)

  return [
    day.getFullYear(),
    String(day.getMonth() + 1).padStart(2, '0'),
    String(day.getDate()).padStart(2, '0'),
  ].join('-')
}

function createSeededRandom(seed: number) {
  let state = seed >>> 0

  return () => {
    state = (state + 0x6d2b79f5) >>> 0

    let mixed = state
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1)
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61)

    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296
  }
}

function seededShuffle<T>(items: readonly T[], seed: number) {
  const shuffled = [...items]
  const nextRandom = createSeededRandom(seed)

  for (
    let currentIndex = shuffled.length - 1;
    currentIndex > 0;
    currentIndex -= 1
  ) {
    const randomIndex = Math.floor(nextRandom() * (currentIndex + 1))
    const currentItem = shuffled[currentIndex]

    shuffled[currentIndex] = shuffled[randomIndex]
    shuffled[randomIndex] = currentItem
  }

  return shuffled
}

function orderNewCards(
  cards: readonly Card[],
  deckId: string,
  now: number,
  newCardOrder: NewCardOrder,
) {
  const oldestFirstCards = [...cards].sort(compareNewCardsOldestFirst)

  if (newCardOrder === 'oldest_first') {
    return oldestFirstCards
  }

  // Keep random order stable for one deck within one local day.
  return seededShuffle(
    oldestFirstCards,
    hashString(`${deckId}:${formatLocalDaySeedKey(now)}`),
  )
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
  const newCards = orderNewCards(
    newCandidates,
    deckId,
    now,
    newCardOrder,
  ).slice(0, Math.max(remainingNewCards, 0))

  return {
    dueCards,
    newCards,
    cards: [...dueCards, ...newCards],
  }
}

export function selectNextStudyCard(options: BuildDeckStudyQueueOptions) {
  return buildDeckStudyQueue(options).cards[0] ?? null
}
