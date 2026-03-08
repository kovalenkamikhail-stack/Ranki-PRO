import { appDb, type RankiDb } from '@/db/app-db'
import type { Deck } from '@/entities/deck'
import type { ReviewLog } from '@/entities/review-log'
import { nowMs, startOfLocalDayMs, startOfNextLocalDayMs } from '@/lib/time'

export const STUDY_ACTIVITY_RECENT_WINDOW_DAYS = 7

export interface RatingDistribution {
  again: number
  hard: number
  good: number
  easy: number
  total: number
}

export interface ActiveDeckStudyActivity {
  deckId: string
  deckName: string
  reviewCount: number
  cardsStudiedCount: number
  lastReviewedAt: number
}

export interface StudyActivityStatistics {
  generatedAt: number
  todayStart: number
  nextDayStart: number
  recentWindowStart: number
  recentWindowDays: number
  totalReviewHistoryCount: number
  hasAnyReviewHistory: boolean
  hasRecentActivity: boolean
  reviewsCompletedToday: number
  reviewsCompletedLast7Days: number
  cardsStudiedToday: number
  activeDeckCountLast7Days: number
  ratingDistributionLast7Days: RatingDistribution
  mostActiveDecksLast7Days: ActiveDeckStudyActivity[]
}

function getRecentWindowStartMs(
  now: number,
  recentWindowDays: number = STUDY_ACTIVITY_RECENT_WINDOW_DAYS,
) {
  const start = new Date(startOfLocalDayMs(now))
  start.setDate(start.getDate() - (recentWindowDays - 1))

  return start.getTime()
}

function buildRatingDistribution(reviewLogs: readonly ReviewLog[]): RatingDistribution {
  return reviewLogs.reduce<RatingDistribution>(
    (distribution, reviewLog) => {
      distribution[reviewLog.rating] += 1
      distribution.total += 1

      return distribution
    },
    {
      again: 0,
      hard: 0,
      good: 0,
      easy: 0,
      total: 0,
    },
  )
}

function countDistinctCards(reviewLogs: readonly ReviewLog[]) {
  return new Set(reviewLogs.map((reviewLog) => reviewLog.cardId)).size
}

function buildDeckNameById(decks: readonly Deck[]) {
  return new Map(decks.map((deck) => [deck.id, deck.name]))
}

function buildMostActiveDecks(
  reviewLogs: readonly ReviewLog[],
  deckNameById: ReadonlyMap<string, string>,
) {
  const activityByDeckId = new Map<string, ActiveDeckStudyActivity>()
  const distinctCardsByDeckId = new Map<string, Set<string>>()

  for (const reviewLog of reviewLogs) {
    const existing = activityByDeckId.get(reviewLog.deckId)

    if (!existing) {
      activityByDeckId.set(reviewLog.deckId, {
        deckId: reviewLog.deckId,
        deckName: deckNameById.get(reviewLog.deckId) ?? 'Unknown deck',
        reviewCount: 1,
        cardsStudiedCount: 1,
        lastReviewedAt: reviewLog.reviewedAt,
      })
      distinctCardsByDeckId.set(reviewLog.deckId, new Set([reviewLog.cardId]))
      continue
    }

    const distinctCards = distinctCardsByDeckId.get(reviewLog.deckId) ?? new Set()
    distinctCards.add(reviewLog.cardId)
    distinctCardsByDeckId.set(reviewLog.deckId, distinctCards)

    activityByDeckId.set(reviewLog.deckId, {
      ...existing,
      reviewCount: existing.reviewCount + 1,
      cardsStudiedCount: distinctCards.size,
      lastReviewedAt: Math.max(existing.lastReviewedAt, reviewLog.reviewedAt),
    })
  }

  return [...activityByDeckId.values()].sort((left, right) => {
    if (right.reviewCount !== left.reviewCount) {
      return right.reviewCount - left.reviewCount
    }

    if (right.cardsStudiedCount !== left.cardsStudiedCount) {
      return right.cardsStudiedCount - left.cardsStudiedCount
    }

    if (right.lastReviewedAt !== left.lastReviewedAt) {
      return right.lastReviewedAt - left.lastReviewedAt
    }

    return left.deckName.localeCompare(right.deckName)
  })
}

export async function loadStudyActivityStatistics(
  now: number = nowMs(),
  database: RankiDb = appDb,
): Promise<StudyActivityStatistics> {
  const todayStart = startOfLocalDayMs(now)
  const nextDayStart = startOfNextLocalDayMs(now)
  const recentWindowStart = getRecentWindowStartMs(now)

  const [totalReviewHistoryCount, recentReviewLogs] = await Promise.all([
    database.reviewLogs.count(),
    database.reviewLogs
      .where('reviewedAt')
      .between(recentWindowStart, nextDayStart, true, false)
      .toArray(),
  ])

  const todayReviewLogs = recentReviewLogs.filter(
    (reviewLog) => reviewLog.reviewedAt >= todayStart,
  )
  const recentDeckIds = [...new Set(recentReviewLogs.map((reviewLog) => reviewLog.deckId))]
  const recentDecks =
    recentDeckIds.length === 0
      ? []
      : (await database.decks.bulkGet(recentDeckIds)).filter(
          (deck): deck is Deck => deck !== undefined,
        )

  return {
    generatedAt: now,
    todayStart,
    nextDayStart,
    recentWindowStart,
    recentWindowDays: STUDY_ACTIVITY_RECENT_WINDOW_DAYS,
    totalReviewHistoryCount,
    hasAnyReviewHistory: totalReviewHistoryCount > 0,
    hasRecentActivity: recentReviewLogs.length > 0,
    reviewsCompletedToday: todayReviewLogs.length,
    reviewsCompletedLast7Days: recentReviewLogs.length,
    cardsStudiedToday: countDistinctCards(todayReviewLogs),
    activeDeckCountLast7Days: recentDeckIds.length,
    ratingDistributionLast7Days: buildRatingDistribution(recentReviewLogs),
    mostActiveDecksLast7Days: buildMostActiveDecks(
      recentReviewLogs,
      buildDeckNameById(recentDecks),
    ),
  }
}
