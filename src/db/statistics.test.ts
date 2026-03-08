import { afterEach, describe, expect, it } from 'vitest'
import { RankiDb } from '@/db/app-db'
import {
  loadStudyActivityStatistics,
  STUDY_ACTIVITY_RECENT_WINDOW_DAYS,
} from '@/db/statistics'
import type { Deck } from '@/entities/deck'
import type { ReviewLog } from '@/entities/review-log'

function buildDeck(overrides: Partial<Deck> = {}): Deck {
  return {
    id: crypto.randomUUID(),
    name: 'English',
    description: null,
    useGlobalLimits: true,
    newCardsPerDayOverride: null,
    maxReviewsPerDayOverride: null,
    newCardOrder: 'oldest_first',
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

describe('statistics aggregation', () => {
  let database: RankiDb | undefined

  afterEach(async () => {
    if (database) {
      await database.delete()
      database = undefined
    }
  })

  it('returns an honest empty snapshot when no review history exists yet', async () => {
    database = new RankiDb(`ranki-statistics-${crypto.randomUUID()}`)
    const now = new Date(2026, 2, 8, 12, 0, 0, 0).getTime()

    const statistics = await loadStudyActivityStatistics(now, database)

    expect(statistics.recentWindowDays).toBe(STUDY_ACTIVITY_RECENT_WINDOW_DAYS)
    expect(statistics.totalReviewHistoryCount).toBe(0)
    expect(statistics.hasAnyReviewHistory).toBe(false)
    expect(statistics.hasRecentActivity).toBe(false)
    expect(statistics.reviewsCompletedToday).toBe(0)
    expect(statistics.reviewsCompletedLast7Days).toBe(0)
    expect(statistics.cardsStudiedToday).toBe(0)
    expect(statistics.activeDeckCountLast7Days).toBe(0)
    expect(statistics.ratingDistributionLast7Days).toEqual({
      again: 0,
      hard: 0,
      good: 0,
      easy: 0,
      total: 0,
    })
    expect(statistics.mostActiveDecksLast7Days).toEqual([])
  })

  it('aggregates today, recent-window, rating, and deck activity from persisted review logs', async () => {
    database = new RankiDb(`ranki-statistics-${crypto.randomUUID()}`)
    const now = new Date(2026, 2, 8, 12, 0, 0, 0).getTime()
    const todayMorning = new Date(2026, 2, 8, 9, 0, 0, 0).getTime()
    const todayLateMorning = new Date(2026, 2, 8, 11, 0, 0, 0).getTime()
    const recentDay = new Date(2026, 2, 4, 18, 0, 0, 0).getTime()
    const windowStart = new Date(2026, 2, 2, 0, 0, 0, 0).getTime()
    const olderThanWindow = new Date(2026, 2, 1, 23, 59, 59, 999).getTime()
    const englishDeck = buildDeck({ id: 'deck-1', name: 'English' })
    const spanishDeck = buildDeck({ id: 'deck-2', name: 'Spanish' })

    await database.decks.bulkAdd([englishDeck, spanishDeck])
    await database.reviewLogs.bulkAdd([
      buildReviewLog({
        id: 'review-1',
        deckId: englishDeck.id,
        cardId: 'card-1',
        rating: 'good',
        reviewedAt: todayMorning,
      }),
      buildReviewLog({
        id: 'review-2',
        deckId: englishDeck.id,
        cardId: 'card-1',
        rating: 'hard',
        reviewedAt: todayLateMorning,
      }),
      buildReviewLog({
        id: 'review-3',
        deckId: spanishDeck.id,
        cardId: 'card-2',
        rating: 'again',
        reviewedAt: windowStart,
      }),
      buildReviewLog({
        id: 'review-4',
        deckId: englishDeck.id,
        cardId: 'card-3',
        rating: 'easy',
        reviewedAt: recentDay,
      }),
      buildReviewLog({
        id: 'review-5',
        deckId: spanishDeck.id,
        cardId: 'card-4',
        rating: 'good',
        reviewedAt: olderThanWindow,
      }),
    ])

    const statistics = await loadStudyActivityStatistics(now, database)

    expect(statistics.totalReviewHistoryCount).toBe(5)
    expect(statistics.hasAnyReviewHistory).toBe(true)
    expect(statistics.hasRecentActivity).toBe(true)
    expect(statistics.reviewsCompletedToday).toBe(2)
    expect(statistics.cardsStudiedToday).toBe(1)
    expect(statistics.reviewsCompletedLast7Days).toBe(4)
    expect(statistics.activeDeckCountLast7Days).toBe(2)
    expect(statistics.ratingDistributionLast7Days).toEqual({
      again: 1,
      hard: 1,
      good: 1,
      easy: 1,
      total: 4,
    })
    expect(statistics.mostActiveDecksLast7Days).toEqual([
      {
        deckId: englishDeck.id,
        deckName: englishDeck.name,
        reviewCount: 3,
        cardsStudiedCount: 2,
        lastReviewedAt: todayLateMorning,
      },
      {
        deckId: spanishDeck.id,
        deckName: spanishDeck.name,
        reviewCount: 1,
        cardsStudiedCount: 1,
        lastReviewedAt: windowStart,
      },
    ])
  })

  it('treats older saved history honestly when the recent window is quiet', async () => {
    database = new RankiDb(`ranki-statistics-${crypto.randomUUID()}`)
    const now = new Date(2026, 2, 8, 12, 0, 0, 0).getTime()
    const oldDeck = buildDeck({ id: 'deck-1', name: 'Archive deck' })

    await database.decks.add(oldDeck)
    await database.reviewLogs.add(
      buildReviewLog({
        deckId: oldDeck.id,
        cardId: 'card-1',
        rating: 'good',
        reviewedAt: new Date(2026, 1, 20, 12, 0, 0, 0).getTime(),
      }),
    )

    const statistics = await loadStudyActivityStatistics(now, database)

    expect(statistics.totalReviewHistoryCount).toBe(1)
    expect(statistics.hasAnyReviewHistory).toBe(true)
    expect(statistics.hasRecentActivity).toBe(false)
    expect(statistics.reviewsCompletedToday).toBe(0)
    expect(statistics.reviewsCompletedLast7Days).toBe(0)
    expect(statistics.cardsStudiedToday).toBe(0)
    expect(statistics.mostActiveDecksLast7Days).toEqual([])
  })
})
