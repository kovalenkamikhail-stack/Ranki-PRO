import { describe, expect, it } from 'vitest'
import type { Card } from '@/entities/card'
import type { ReviewRating } from '@/entities/review-log'
import {
  AGAIN_RETRY_DELAY_MS,
  applyReviewRating,
  getNextCardScheduling,
  HARD_RETRY_DELAY_MS,
  STUDY_LADDER_STEPS_MS,
} from '@/domain/study/scheduler'

function buildCard(overrides: Partial<Card> = {}): Card {
  return {
    id: 'card-1',
    deckId: 'deck-1',
    frontText: 'Front',
    backText: 'Back',
    backImageAssetId: null,
    state: 'new',
    ladderStepIndex: null,
    dueAt: null,
    lastReviewedAt: null,
    createdAt: 100,
    updatedAt: 100,
    ...overrides,
  }
}

describe('applyReviewRating', () => {
  const now = Date.UTC(2026, 2, 7, 10, 0, 0)

  it.each<
    [label: string, card: Card, rating: ReviewRating, expected: Partial<Card>]
  >([
    [
      'resets a new card to learning on again',
      buildCard(),
      'again',
      {
        state: 'learning',
        ladderStepIndex: null,
        dueAt: now + AGAIN_RETRY_DELAY_MS,
      },
    ],
    [
      'keeps a new card in short-term learning on hard',
      buildCard(),
      'hard',
      {
        state: 'learning',
        ladderStepIndex: null,
        dueAt: now + HARD_RETRY_DELAY_MS,
      },
    ],
    [
      'promotes a new card to the first ladder step on good',
      buildCard(),
      'good',
      {
        state: 'review',
        ladderStepIndex: 0,
        dueAt: now + STUDY_LADDER_STEPS_MS[0],
      },
    ],
    [
      'promotes a new card two ladder steps on easy',
      buildCard(),
      'easy',
      {
        state: 'review',
        ladderStepIndex: 1,
        dueAt: now + STUDY_LADDER_STEPS_MS[1],
      },
    ],
    [
      'graduates a learning card with no long-term progress to the first step on good',
      buildCard({
        state: 'learning',
        dueAt: now - 60_000,
      }),
      'good',
      {
        state: 'review',
        ladderStepIndex: 0,
        dueAt: now + STUDY_LADDER_STEPS_MS[0],
      },
    ],
    [
      'jumps a learning card forward by two steps on easy',
      buildCard({
        state: 'learning',
        ladderStepIndex: 1,
        dueAt: now - 60_000,
      }),
      'easy',
      {
        state: 'review',
        ladderStepIndex: 3,
        dueAt: now + STUDY_LADDER_STEPS_MS[3],
      },
    ],
    [
      'keeps review progress on hard',
      buildCard({
        state: 'review',
        ladderStepIndex: 2,
        dueAt: now - 60_000,
      }),
      'hard',
      {
        state: 'learning',
        ladderStepIndex: 2,
        dueAt: now + HARD_RETRY_DELAY_MS,
      },
    ],
    [
      'resets review progress to the start on again',
      buildCard({
        state: 'review',
        ladderStepIndex: 4,
        dueAt: now - 60_000,
      }),
      'again',
      {
        state: 'learning',
        ladderStepIndex: null,
        dueAt: now + AGAIN_RETRY_DELAY_MS,
      },
    ],
    [
      'caps a good rating at the top ladder step',
      buildCard({
        state: 'review',
        ladderStepIndex: 5,
        dueAt: now - 60_000,
      }),
      'good',
      {
        state: 'review',
        ladderStepIndex: 5,
        dueAt: now + STUDY_LADDER_STEPS_MS[5],
      },
    ],
    [
      'caps an easy rating at the top ladder step',
      buildCard({
        state: 'review',
        ladderStepIndex: 5,
        dueAt: now - 60_000,
      }),
      'easy',
      {
        state: 'review',
        ladderStepIndex: 5,
        dueAt: now + STUDY_LADDER_STEPS_MS[5],
      },
    ],
  ])('%s', (_label, card, rating, expected) => {
    const { updatedCard, reviewLog } = applyReviewRating(card, rating, now)

    expect(updatedCard).toMatchObject({
      ...expected,
      lastReviewedAt: now,
      updatedAt: now,
    })
    expect(reviewLog).toEqual({
      cardId: card.id,
      deckId: card.deckId,
      rating,
      previousState: card.state,
      newState: expected.state,
      previousLadderStepIndex: card.ladderStepIndex,
      newLadderStepIndex: expected.ladderStepIndex,
      reviewedAt: now,
      previousDueAt: card.dueAt,
      newDueAt: expected.dueAt,
    })
  })

  it('returns the same scheduling snapshot through the dedicated helper', () => {
    const card = buildCard({
      state: 'review',
      ladderStepIndex: 3,
      dueAt: now - 1,
      lastReviewedAt: now - 60_000,
    })

    const snapshot = getNextCardScheduling(card, 'easy', now)
    const outcome = applyReviewRating(card, 'easy', now)

    expect(snapshot).toEqual({
      state: 'review',
      ladderStepIndex: 5,
      dueAt: now + STUDY_LADDER_STEPS_MS[5],
      lastReviewedAt: now,
      updatedAt: now,
    })
    expect(outcome.updatedCard).toMatchObject(snapshot)
  })

  it('fails fast when persisted ladder progress is outside the supported ladder', () => {
    const card = buildCard({
      state: 'review',
      ladderStepIndex: 9,
      dueAt: now - 1,
    })

    expect(() => applyReviewRating(card, 'good', now)).toThrow(
      'Invalid ladder step index: 9.',
    )
  })
})
