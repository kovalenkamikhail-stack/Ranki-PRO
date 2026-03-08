import { appDb, type RankiDb } from '@/db/app-db'
import { bootstrapAppDb } from '@/db/bootstrap'
import { listCardsByDeck } from '@/db/cards'
import { getDeck } from '@/db/decks'
import { buildDeckStudyQueue, type DeckStudyQueue } from '@/domain/study/queue'
import { applyReviewRating } from '@/domain/study/scheduler'
import type { Card } from '@/entities/card'
import type { Deck } from '@/entities/deck'
import type { ReviewLog, ReviewRating } from '@/entities/review-log'
import { createId } from '@/lib/ids'
import { nowMs, startOfLocalDayMs, startOfNextLocalDayMs } from '@/lib/time'

export interface DeckStudySessionLimits {
  newCardsPerDay: number
  maxReviewsPerDay: number | null
  introducedNewCardsToday: number
  reviewedCardsToday: number
  remainingReviewCardsToday: number | null
}

export interface DeckStudySessionSnapshot {
  deck: Deck
  state: 'empty' | 'completed' | 'ready'
  cardsInDeckCount: number
  totalCardsInDeck: number
  queue: DeckStudyQueue
  currentCard: Card | null
  nextDueAt: number | null
  limits: DeckStudySessionLimits
}

export interface ReviewDeckStudyCardOptions {
  deckId: string
  cardId: string
  rating: ReviewRating
  now?: number
}

function resolveDeckLimits(
  deck: Deck,
  globalNewCardsPerDay: number,
  globalMaxReviewsPerDay: number | null,
) {
  return {
    newCardsPerDay: deck.useGlobalLimits
      ? globalNewCardsPerDay
      : deck.newCardsPerDayOverride ?? globalNewCardsPerDay,
    maxReviewsPerDay: deck.useGlobalLimits
      ? globalMaxReviewsPerDay
      : deck.maxReviewsPerDayOverride,
  }
}

async function listDeckReviewLogsForDay(
  deckId: string,
  now: number,
  database: RankiDb,
) {
  const dayStart = startOfLocalDayMs(now)
  const nextDayStart = startOfNextLocalDayMs(now)

  return database.reviewLogs
    .where('deckId')
    .equals(deckId)
    .filter(
      (reviewLog) =>
        reviewLog.reviewedAt >= dayStart &&
        reviewLog.reviewedAt < nextDayStart,
    )
    .toArray()
}

function countIntroducedNewCardsToday(reviewLogs: readonly ReviewLog[]) {
  return reviewLogs.filter((reviewLog) => reviewLog.previousState === 'new').length
}

function countReviewedCardsToday(reviewLogs: readonly ReviewLog[]) {
  return reviewLogs.filter((reviewLog) => reviewLog.previousState !== 'new').length
}

function getNextDueAt(
  cards: readonly Card[],
  now: number,
  remainingReviewCardsToday: number | null,
) {
  if (remainingReviewCardsToday === 0) {
    return null
  }

  const nextDueCard = cards
    .filter(
      (card) => card.state !== 'new' && card.dueAt !== null && card.dueAt > now,
    )
    .sort(
      (left, right) =>
        (left.dueAt ?? Number.MAX_SAFE_INTEGER) -
        (right.dueAt ?? Number.MAX_SAFE_INTEGER),
    )[0]

  return nextDueCard?.dueAt ?? null
}

function buildStudySessionSnapshot({
  deck,
  cards,
  reviewLogs,
  now,
  globalNewCardsPerDay,
  globalMaxReviewsPerDay,
}: {
  deck: Deck
  cards: readonly Card[]
  reviewLogs: readonly ReviewLog[]
  now: number
  globalNewCardsPerDay: number
  globalMaxReviewsPerDay: number | null
}): DeckStudySessionSnapshot {
  const resolvedLimits = resolveDeckLimits(
    deck,
    globalNewCardsPerDay,
    globalMaxReviewsPerDay,
  )
  const introducedNewCardsToday = countIntroducedNewCardsToday(reviewLogs)
  const reviewedCardsToday = countReviewedCardsToday(reviewLogs)
  const remainingReviewCardsToday =
    resolvedLimits.maxReviewsPerDay === null
      ? null
      : Math.max(resolvedLimits.maxReviewsPerDay - reviewedCardsToday, 0)
  const queue = buildDeckStudyQueue({
    deckId: deck.id,
    cards,
    now,
    newCardsPerDay: resolvedLimits.newCardsPerDay,
    introducedNewCardsToday,
    maxReviewsPerDay: remainingReviewCardsToday,
    newCardOrder: deck.newCardOrder,
  })

  return {
    deck,
    state:
      cards.length === 0
        ? 'empty'
        : queue.cards.length === 0
          ? 'completed'
          : 'ready',
    cardsInDeckCount: cards.length,
    totalCardsInDeck: cards.length,
    queue,
    currentCard: queue.cards[0] ?? null,
    nextDueAt: getNextDueAt(cards, now, remainingReviewCardsToday),
    limits: {
      ...resolvedLimits,
      introducedNewCardsToday,
      reviewedCardsToday,
      remainingReviewCardsToday,
    },
  }
}

export async function loadDeckStudySession(
  deckId: string,
  now: number = nowMs(),
  database: RankiDb = appDb,
): Promise<DeckStudySessionSnapshot | null> {
  const [settings, deck] = await Promise.all([
    bootstrapAppDb(database),
    getDeck(deckId, database),
  ])

  if (!deck) {
    return null
  }

  const [cards, reviewLogs] = await Promise.all([
    listCardsByDeck(deckId, database),
    listDeckReviewLogsForDay(deckId, now, database),
  ])

  return buildStudySessionSnapshot({
    deck,
    cards,
    reviewLogs,
    now,
    globalNewCardsPerDay: settings.globalNewCardsPerDay,
    globalMaxReviewsPerDay: settings.globalMaxReviewsPerDay,
  })
}

export async function reviewDeckStudyCard(
  options: ReviewDeckStudyCardOptions,
  database: RankiDb = appDb,
): Promise<DeckStudySessionSnapshot> {
  const reviewedAt = options.now ?? nowMs()

  await bootstrapAppDb(database)

  await database.transaction(
    'rw',
    database.decks,
    database.cards,
    database.reviewLogs,
    async () => {
      const deck = await database.decks.get(options.deckId)

      if (!deck) {
        throw new Error('Deck not found.')
      }

      const card = await database.cards.get(options.cardId)

      if (!card || card.deckId !== options.deckId) {
        throw new Error('Card not found in the selected deck.')
      }

      const { updatedCard, reviewLog } = applyReviewRating(
        card,
        options.rating,
        reviewedAt,
      )

      await database.cards.put(updatedCard)
      await database.reviewLogs.add({
        id: createId(),
        ...reviewLog,
      })
      await database.decks.put({
        ...deck,
        updatedAt: reviewedAt,
      })
    },
  )

  const session = await loadDeckStudySession(options.deckId, reviewedAt, database)

  if (!session) {
    throw new Error('Deck not found.')
  }

  return session
}

export async function applyStudySessionRating(
  deckId: string,
  cardId: string,
  rating: ReviewRating,
  database: RankiDb = appDb,
  now?: number,
): Promise<DeckStudySessionSnapshot> {
  return reviewDeckStudyCard(
    {
      deckId,
      cardId,
      rating,
      now,
    },
    database,
  )
}
