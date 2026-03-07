import type { Card, CardState } from '@/entities/card'
import type { ReviewLog, ReviewRating } from '@/entities/review-log'

const MINUTE_MS = 60_000
const DAY_MS = 24 * 60 * MINUTE_MS

export const HARD_RETRY_DELAY_MS = 2 * MINUTE_MS
export const AGAIN_RETRY_DELAY_MS = 10 * MINUTE_MS
export const STUDY_LADDER_STEPS_DAYS = [1, 3, 7, 14, 30, 60] as const
export const STUDY_LADDER_STEPS_MS = STUDY_LADDER_STEPS_DAYS.map(
  (days) => days * DAY_MS,
) as readonly number[]
export const MAX_LADDER_STEP_INDEX = STUDY_LADDER_STEPS_MS.length - 1

export interface CardSchedulingSnapshot {
  state: CardState
  ladderStepIndex: number | null
  dueAt: number
  lastReviewedAt: number
  updatedAt: number
}

export type ReviewLogDraft = Omit<ReviewLog, 'id'>

export interface ReviewOutcome {
  updatedCard: Card
  reviewLog: ReviewLogDraft
}

function assertValidLadderStepIndex(stepIndex: number | null) {
  if (
    stepIndex !== null &&
    (!Number.isInteger(stepIndex) ||
      stepIndex < 0 ||
      stepIndex > MAX_LADDER_STEP_INDEX)
  ) {
    throw new Error(`Invalid ladder step index: ${stepIndex}.`)
  }
}

export function promoteLadderStepIndex(
  currentStepIndex: number | null,
  jump: 1 | 2,
) {
  assertValidLadderStepIndex(currentStepIndex)

  const baselineStepIndex = currentStepIndex ?? -1

  return Math.min(baselineStepIndex + jump, MAX_LADDER_STEP_INDEX)
}

export function getLadderDueAt(stepIndex: number, now: number) {
  assertValidLadderStepIndex(stepIndex)

  return now + STUDY_LADDER_STEPS_MS[stepIndex]
}

export function getNextCardScheduling(
  card: Card,
  rating: ReviewRating,
  now: number,
): CardSchedulingSnapshot {
  if (rating === 'again') {
    return {
      state: 'learning',
      ladderStepIndex: null,
      dueAt: now + AGAIN_RETRY_DELAY_MS,
      lastReviewedAt: now,
      updatedAt: now,
    }
  }

  if (rating === 'hard') {
    return {
      state: 'learning',
      ladderStepIndex: card.ladderStepIndex,
      dueAt: now + HARD_RETRY_DELAY_MS,
      lastReviewedAt: now,
      updatedAt: now,
    }
  }

  const nextStepIndex = promoteLadderStepIndex(
    card.ladderStepIndex,
    rating === 'easy' ? 2 : 1,
  )

  return {
    state: 'review',
    ladderStepIndex: nextStepIndex,
    dueAt: getLadderDueAt(nextStepIndex, now),
    lastReviewedAt: now,
    updatedAt: now,
  }
}

export function applyReviewRating(
  card: Card,
  rating: ReviewRating,
  now: number,
): ReviewOutcome {
  const nextScheduling = getNextCardScheduling(card, rating, now)
  const updatedCard: Card = {
    ...card,
    ...nextScheduling,
  }

  return {
    updatedCard,
    reviewLog: {
      cardId: card.id,
      deckId: card.deckId,
      rating,
      previousState: card.state,
      newState: updatedCard.state,
      previousLadderStepIndex: card.ladderStepIndex,
      newLadderStepIndex: updatedCard.ladderStepIndex,
      reviewedAt: now,
      previousDueAt: card.dueAt,
      newDueAt: updatedCard.dueAt,
    },
  }
}
