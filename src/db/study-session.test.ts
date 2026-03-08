import { afterEach, describe, expect, it } from 'vitest'
import { RankiDb } from '@/db/app-db'
import { bootstrapAppDb } from '@/db/bootstrap'
import {
  loadDeckStudySession,
  reviewDeckStudyCard,
} from '@/db/study-session'
import type { AppSettings } from '@/entities/app-settings'
import type { Card } from '@/entities/card'
import type { Deck } from '@/entities/deck'
import type { ReviewLog, ReviewRating } from '@/entities/review-log'
import {
  AGAIN_RETRY_DELAY_MS,
  HARD_RETRY_DELAY_MS,
  STUDY_LADDER_STEPS_MS,
} from '@/domain/study/scheduler'

function buildDeck(overrides: Partial<Deck> = {}): Deck {
  return {
    id: crypto.randomUUID(),
    name: 'English',
    description: 'Core vocabulary',
    useGlobalLimits: true,
    newCardsPerDayOverride: null,
    maxReviewsPerDayOverride: null,
    newCardOrder: 'oldest_first',
    createdAt: 10,
    updatedAt: 10,
    ...overrides,
  }
}

function buildCard(overrides: Partial<Card> = {}): Card {
  return {
    id: crypto.randomUUID(),
    deckId: 'deck-1',
    frontText: 'Front',
    backText: 'Back',
    backImageAssetId: null,
    state: 'new',
    ladderStepIndex: null,
    dueAt: null,
    lastReviewedAt: null,
    createdAt: 10,
    updatedAt: 10,
    ...overrides,
  }
}

function buildReviewLog(overrides: Partial<ReviewLog> = {}): ReviewLog {
  return {
    id: crypto.randomUUID(),
    cardId: 'card-1',
    deckId: 'deck-1',
    rating: 'good',
    previousState: 'review',
    newState: 'review',
    previousLadderStepIndex: 0,
    newLadderStepIndex: 1,
    reviewedAt: 10,
    previousDueAt: 1,
    newDueAt: 2,
    ...overrides,
  }
}

async function updateSettings(
  database: RankiDb,
  overrides: Partial<AppSettings> = {},
) {
  const settings = await bootstrapAppDb(database)

  await database.appSettings.put({
    ...settings,
    ...overrides,
  })
}

describe('study-session persistence seam', () => {
  let database: RankiDb | undefined

  afterEach(async () => {
    if (database) {
      await database.delete()
      database = undefined
    }
  })

  it('loads a persisted deck queue with due-first ordering and local-day limits', async () => {
    database = new RankiDb(`ranki-study-session-${crypto.randomUUID()}`)
    const now = new Date(2026, 2, 8, 12, 0, 0, 0).getTime()
    const earlierToday = new Date(2026, 2, 8, 9, 0, 0, 0).getTime()
    const yesterday = new Date(2026, 2, 7, 18, 0, 0, 0).getTime()
    const deck = buildDeck({ id: 'deck-1' })

    await updateSettings(database, {
      globalNewCardsPerDay: 2,
      globalMaxReviewsPerDay: 3,
    })
    await database.decks.add(deck)
    await database.cards.bulkAdd([
      buildCard({
        id: 'due-earliest',
        deckId: deck.id,
        frontText: 'earliest due',
        state: 'review',
        ladderStepIndex: 1,
        dueAt: now - 120_000,
        lastReviewedAt: now - 5_000,
        createdAt: 100,
      }),
      buildCard({
        id: 'due-later',
        deckId: deck.id,
        frontText: 'later due',
        state: 'learning',
        dueAt: now - 30_000,
        lastReviewedAt: now - 3_000,
        createdAt: 200,
      }),
      buildCard({
        id: 'new-oldest',
        deckId: deck.id,
        frontText: 'new oldest',
        createdAt: 50,
      }),
      buildCard({
        id: 'new-latest',
        deckId: deck.id,
        frontText: 'new latest',
        createdAt: 400,
      }),
      buildCard({
        id: 'future-due',
        deckId: deck.id,
        frontText: 'future due',
        state: 'review',
        ladderStepIndex: 2,
        dueAt: now + 30 * 60_000,
        lastReviewedAt: now - 1_000,
        createdAt: 300,
      }),
      buildCard({
        id: 'other-deck',
        deckId: 'deck-2',
        frontText: 'ignore me',
        state: 'review',
        ladderStepIndex: 1,
        dueAt: now - 1,
      }),
    ])
    await database.reviewLogs.bulkAdd([
      buildReviewLog({
        deckId: deck.id,
        previousState: 'new',
        newState: 'review',
        reviewedAt: earlierToday,
      }),
      buildReviewLog({
        deckId: deck.id,
        previousState: 'review',
        newState: 'review',
        reviewedAt: earlierToday,
      }),
      buildReviewLog({
        deckId: deck.id,
        previousState: 'new',
        newState: 'review',
        reviewedAt: yesterday,
      }),
    ])

    const session = await loadDeckStudySession(deck.id, now, database)

    expect(session).not.toBeNull()
    expect(session?.cardsInDeckCount).toBe(5)
    expect(session?.queue.dueCards.map((card) => card.id)).toEqual([
      'due-earliest',
      'due-later',
    ])
    expect(session?.queue.newCards.map((card) => card.id)).toEqual(['new-oldest'])
    expect(session?.queue.cards.map((card) => card.id)).toEqual([
      'due-earliest',
      'due-later',
      'new-oldest',
    ])
    expect(session?.currentCard?.id).toBe('due-earliest')
    expect(session?.nextDueAt).toBe(now + 30 * 60_000)
    expect(session?.limits).toEqual({
      newCardsPerDay: 2,
      maxReviewsPerDay: 3,
      introducedNewCardsToday: 1,
      reviewedCardsToday: 1,
      remainingReviewCardsToday: 2,
    })
  })

  it.each<
    [
      label: string,
      card: Card,
      rating: ReviewRating,
      expected: {
        state: Card['state']
        ladderStepIndex: Card['ladderStepIndex']
        dueAt: (timestamp: number) => number
      },
    ]
  >([
    [
      'persists again on a new card',
      buildCard({
        id: 'again-card',
        deckId: 'deck-1',
      }),
      'again',
      {
        state: 'learning',
        ladderStepIndex: null,
        dueAt: (timestamp) => timestamp + AGAIN_RETRY_DELAY_MS,
      },
    ],
    [
      'persists hard on a review card',
      buildCard({
        id: 'hard-card',
        deckId: 'deck-1',
        state: 'review',
        ladderStepIndex: 2,
        dueAt: 5,
        lastReviewedAt: 4,
      }),
      'hard',
      {
        state: 'learning',
        ladderStepIndex: 2,
        dueAt: (timestamp) => timestamp + HARD_RETRY_DELAY_MS,
      },
    ],
    [
      'persists good on a new card',
      buildCard({
        id: 'good-card',
        deckId: 'deck-1',
      }),
      'good',
      {
        state: 'review',
        ladderStepIndex: 0,
        dueAt: (timestamp) => timestamp + STUDY_LADDER_STEPS_MS[0],
      },
    ],
    [
      'persists easy on a learning card',
      buildCard({
        id: 'easy-card',
        deckId: 'deck-1',
        state: 'learning',
        ladderStepIndex: 1,
        dueAt: 5,
        lastReviewedAt: 4,
      }),
      'easy',
      {
        state: 'review',
        ladderStepIndex: 3,
        dueAt: (timestamp) => timestamp + STUDY_LADDER_STEPS_MS[3],
      },
    ],
  ])('%s and writes a ReviewLog entry', async (_label, card, rating, expected) => {
    database = new RankiDb(`ranki-study-session-${crypto.randomUUID()}`)
    const now = new Date(2026, 2, 8, 12, 0, 0, 0).getTime()
    const deck = buildDeck({ id: 'deck-1' })

    await bootstrapAppDb(database)
    await database.decks.add(deck)
    await database.cards.add(card)

    await reviewDeckStudyCard(
      {
        deckId: deck.id,
        cardId: card.id,
        rating,
        now,
      },
      database,
    )

    const storedCard = await database.cards.get(card.id)
    const reviewLogs = await database.reviewLogs.toArray()

    expect(storedCard).toMatchObject({
      ...card,
      state: expected.state,
      ladderStepIndex: expected.ladderStepIndex,
      dueAt: expected.dueAt(now),
      lastReviewedAt: now,
      updatedAt: now,
    })
    expect(reviewLogs).toHaveLength(1)
    expect(reviewLogs[0]).toMatchObject({
      cardId: card.id,
      deckId: deck.id,
      rating,
      previousState: card.state,
      newState: expected.state,
      previousLadderStepIndex: card.ladderStepIndex,
      newLadderStepIndex: expected.ladderStepIndex,
      reviewedAt: now,
      previousDueAt: card.dueAt,
      newDueAt: expected.dueAt(now),
    })
  })

  it('advances to the next eligible card after persisting a rating', async () => {
    database = new RankiDb(`ranki-study-session-${crypto.randomUUID()}`)
    const now = new Date(2026, 2, 8, 12, 0, 0, 0).getTime()
    const deck = buildDeck({ id: 'deck-1' })

    await bootstrapAppDb(database)
    await database.decks.add(deck)
    await database.cards.bulkAdd([
      buildCard({
        id: 'first-due',
        deckId: deck.id,
        frontText: 'first due',
        state: 'review',
        ladderStepIndex: 1,
        dueAt: now - 2_000,
        lastReviewedAt: now - 8_000,
      }),
      buildCard({
        id: 'second-due',
        deckId: deck.id,
        frontText: 'second due',
        state: 'review',
        ladderStepIndex: 0,
        dueAt: now - 1_000,
        lastReviewedAt: now - 4_000,
      }),
      buildCard({
        id: 'new-card',
        deckId: deck.id,
        frontText: 'new card',
        createdAt: now - 500,
      }),
    ])

    const session = await reviewDeckStudyCard(
      {
        deckId: deck.id,
        cardId: 'first-due',
        rating: 'good',
        now,
      },
      database,
    )

    expect(session.currentCard?.id).toBe('second-due')
    expect(session.queue.cards.map((card) => card.id)).toEqual([
      'second-due',
      'new-card',
    ])
  })

  it('returns an empty snapshot when the deck has no cards yet', async () => {
    database = new RankiDb(`ranki-study-session-${crypto.randomUUID()}`)
    const now = new Date(2026, 2, 8, 12, 0, 0, 0).getTime()
    const deck = buildDeck({ id: 'deck-1' })

    await bootstrapAppDb(database)
    await database.decks.add(deck)

    const session = await loadDeckStudySession(deck.id, now, database)

    expect(session).not.toBeNull()
    expect(session?.cardsInDeckCount).toBe(0)
    expect(session?.currentCard).toBeNull()
    expect(session?.queue.cards).toEqual([])
    expect(session?.nextDueAt).toBeNull()
  })

  it('returns a completed-for-now snapshot when no cards are currently eligible', async () => {
    database = new RankiDb(`ranki-study-session-${crypto.randomUUID()}`)
    const now = new Date(2026, 2, 8, 12, 0, 0, 0).getTime()
    const nextRetryAt = now + HARD_RETRY_DELAY_MS
    const deck = buildDeck({ id: 'deck-1' })

    await bootstrapAppDb(database)
    await database.decks.add(deck)
    await database.cards.add(
      buildCard({
        id: 'waiting-card',
        deckId: deck.id,
        state: 'learning',
        dueAt: nextRetryAt,
        lastReviewedAt: now - 30_000,
      }),
    )

    const session = await loadDeckStudySession(deck.id, now, database)

    expect(session).not.toBeNull()
    expect(session?.cardsInDeckCount).toBe(1)
    expect(session?.currentCard).toBeNull()
    expect(session?.queue.cards).toEqual([])
    expect(session?.nextDueAt).toBe(nextRetryAt)
  })
})
