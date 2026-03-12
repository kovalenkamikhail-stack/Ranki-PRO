import { describe, expect, it } from 'vitest'
import type { Card } from '@/entities/card'
import { buildDeckStudyQueue, isCardDue, selectNextStudyCard } from '@/domain/study/queue'
import {
  AGAIN_RETRY_DELAY_MS,
  applyReviewRating,
  HARD_RETRY_DELAY_MS,
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

describe('buildDeckStudyQueue', () => {
  const now = Date.UTC(2026, 2, 7, 10, 0, 0)

  it('keeps due cards first and new cards oldest-first inside one selected deck', () => {
    const cards = [
      buildCard({
        id: 'new-late',
        createdAt: 400,
      }),
      buildCard({
        id: 'due-late',
        state: 'review',
        ladderStepIndex: 1,
        dueAt: now - 30_000,
        lastReviewedAt: now - 3_000,
        createdAt: 300,
      }),
      buildCard({
        id: 'due-early',
        state: 'learning',
        dueAt: now - 120_000,
        lastReviewedAt: now - 2_000,
        createdAt: 200,
      }),
      buildCard({
        id: 'new-early',
        createdAt: 150,
      }),
    ]

    const queue = buildDeckStudyQueue({
      deckId: 'deck-1',
      cards,
      now,
      newCardsPerDay: 10,
      maxReviewsPerDay: null,
      newCardOrder: 'oldest_first',
    })

    expect(queue.dueCards.map((card) => card.id)).toEqual(['due-early', 'due-late'])
    expect(queue.newCards.map((card) => card.id)).toEqual(['new-early', 'new-late'])
    expect(queue.cards.map((card) => card.id)).toEqual([
      'due-early',
      'due-late',
      'new-early',
      'new-late',
    ])
  })

  it('keeps due cards first and applies a deterministic daily shuffle to new cards', () => {
    const randomNow = new Date(2026, 2, 7, 12, 0, 0, 0).getTime()
    const cards = [
      buildCard({
        id: 'new-4',
        createdAt: 400,
      }),
      buildCard({
        id: 'due-1',
        state: 'review',
        ladderStepIndex: 1,
        dueAt: randomNow - 30_000,
        lastReviewedAt: randomNow - 3_000,
        createdAt: 250,
      }),
      buildCard({
        id: 'new-2',
        createdAt: 200,
      }),
      buildCard({
        id: 'new-1',
        createdAt: 100,
      }),
      buildCard({
        id: 'new-3',
        createdAt: 300,
      }),
    ]

    const queue = buildDeckStudyQueue({
      deckId: 'deck-1',
      cards,
      now: randomNow,
      newCardsPerDay: 10,
      maxReviewsPerDay: null,
      newCardOrder: 'random',
    })
    const reorderedInputQueue = buildDeckStudyQueue({
      deckId: 'deck-1',
      cards: [...cards].reverse(),
      now: randomNow,
      newCardsPerDay: 10,
      maxReviewsPerDay: null,
      newCardOrder: 'random',
    })

    expect(queue.dueCards.map((card) => card.id)).toEqual(['due-1'])
    expect(queue.newCards.map((card) => card.id)).toEqual([
      'new-2',
      'new-3',
      'new-1',
      'new-4',
    ])
    expect(queue.cards.map((card) => card.id)).toEqual([
      'due-1',
      'new-2',
      'new-3',
      'new-1',
      'new-4',
    ])
    expect(reorderedInputQueue.newCards.map((card) => card.id)).toEqual(
      queue.newCards.map((card) => card.id),
    )
  })

  it('uses deterministic due tie-breakers before falling back to card id', () => {
    const cards = [
      buildCard({
        id: 'card-c',
        state: 'review',
        ladderStepIndex: 0,
        dueAt: now - 60_000,
        lastReviewedAt: now - 10_000,
        createdAt: 300,
      }),
      buildCard({
        id: 'card-b',
        state: 'review',
        ladderStepIndex: 0,
        dueAt: now - 60_000,
        lastReviewedAt: now - 20_000,
        createdAt: 400,
      }),
      buildCard({
        id: 'card-a',
        state: 'review',
        ladderStepIndex: 0,
        dueAt: now - 60_000,
        lastReviewedAt: now - 20_000,
        createdAt: 200,
      }),
    ]

    const queue = buildDeckStudyQueue({
      deckId: 'deck-1',
      cards,
      now,
      newCardsPerDay: 10,
      maxReviewsPerDay: null,
    })

    expect(queue.dueCards.map((card) => card.id)).toEqual([
      'card-a',
      'card-b',
      'card-c',
    ])
  })

  it('filters out cards from other decks', () => {
    const cards = [
      buildCard({
        id: 'deck-one-due',
        state: 'review',
        ladderStepIndex: 1,
        dueAt: now - 1,
      }),
      buildCard({
        id: 'deck-two-due',
        deckId: 'deck-2',
        state: 'review',
        ladderStepIndex: 1,
        dueAt: now - 1,
      }),
      buildCard({
        id: 'deck-two-new',
        deckId: 'deck-2',
      }),
    ]

    const queue = buildDeckStudyQueue({
      deckId: 'deck-1',
      cards,
      now,
      newCardsPerDay: 10,
      maxReviewsPerDay: null,
    })

    expect(queue.cards.map((card) => card.id)).toEqual(['deck-one-due'])
  })

  it('truncates due cards by the review limit and new cards by the remaining daily new allowance', () => {
    const cards = [
      buildCard({
        id: 'due-1',
        state: 'review',
        ladderStepIndex: 0,
        dueAt: now - 3_000,
        createdAt: 100,
      }),
      buildCard({
        id: 'due-2',
        state: 'review',
        ladderStepIndex: 1,
        dueAt: now - 2_000,
        createdAt: 200,
      }),
      buildCard({
        id: 'due-3',
        state: 'learning',
        dueAt: now - 1_000,
        createdAt: 300,
      }),
      buildCard({
        id: 'new-1',
        createdAt: 400,
      }),
      buildCard({
        id: 'new-2',
        createdAt: 500,
      }),
    ]

    const queue = buildDeckStudyQueue({
      deckId: 'deck-1',
      cards,
      now,
      newCardsPerDay: 2,
      introducedNewCardsToday: 1,
      maxReviewsPerDay: 2,
    })

    expect(queue.dueCards.map((card) => card.id)).toEqual(['due-1', 'due-2'])
    expect(queue.newCards.map((card) => card.id)).toEqual(['new-1'])
    expect(queue.cards.map((card) => card.id)).toEqual(['due-1', 'due-2', 'new-1'])
  })

  it('allows a hard-rated card to re-enter the same session once it becomes due again', () => {
    const original = buildCard({
      id: 'retry-card',
      state: 'review',
      ladderStepIndex: 2,
      dueAt: now - 1,
      lastReviewedAt: now - 5_000,
    })
    const newCard = buildCard({
      id: 'new-card',
      createdAt: 200,
    })
    const { updatedCard } = applyReviewRating(original, 'hard', now)
    const cards = [updatedCard, newCard]

    const oneMinuteLater = buildDeckStudyQueue({
      deckId: 'deck-1',
      cards,
      now: now + 60_000,
      newCardsPerDay: 10,
      maxReviewsPerDay: null,
    })
    const twoMinutesLater = buildDeckStudyQueue({
      deckId: 'deck-1',
      cards,
      now: now + HARD_RETRY_DELAY_MS,
      newCardsPerDay: 10,
      maxReviewsPerDay: null,
    })

    expect(oneMinuteLater.cards.map((card) => card.id)).toEqual(['new-card'])
    expect(twoMinutesLater.cards.map((card) => card.id)).toEqual([
      'retry-card',
      'new-card',
    ])
  })

  it('allows an again-rated card to re-enter the same session at the ten-minute mark', () => {
    const original = buildCard({
      id: 'repeat-again',
      state: 'review',
      ladderStepIndex: 3,
      dueAt: now - 1,
      lastReviewedAt: now - 5_000,
    })
    const { updatedCard } = applyReviewRating(original, 'again', now)

    const beforeDue = buildDeckStudyQueue({
      deckId: 'deck-1',
      cards: [updatedCard],
      now: now + AGAIN_RETRY_DELAY_MS - 1,
      newCardsPerDay: 10,
      maxReviewsPerDay: null,
    })
    const atDue = buildDeckStudyQueue({
      deckId: 'deck-1',
      cards: [updatedCard],
      now: now + AGAIN_RETRY_DELAY_MS,
      newCardsPerDay: 10,
      maxReviewsPerDay: null,
    })

    expect(beforeDue.cards).toEqual([])
    expect(atDue.cards.map((card) => card.id)).toEqual(['repeat-again'])
  })

  it('selects the next due card deterministically after a repeated card becomes eligible again', () => {
    const original = buildCard({
      id: 'repeat-due',
      state: 'review',
      ladderStepIndex: 2,
      dueAt: now - 1,
      lastReviewedAt: now - 5_000,
    })
    const anotherDue = buildCard({
      id: 'older-due',
      state: 'review',
      ladderStepIndex: 1,
      dueAt: now + HARD_RETRY_DELAY_MS - 1_000,
      lastReviewedAt: now - 10_000,
      createdAt: 50,
    })
    const { updatedCard } = applyReviewRating(original, 'hard', now)

    const nextCard = selectNextStudyCard({
      deckId: 'deck-1',
      cards: [updatedCard, anotherDue],
      now: now + HARD_RETRY_DELAY_MS,
      newCardsPerDay: 10,
      maxReviewsPerDay: null,
    })

    expect(nextCard?.id).toBe('older-due')
  })
})

describe('isCardDue', () => {
  const now = Date.UTC(2026, 2, 7, 10, 0, 0)

  it('returns true only for non-new cards whose due time has passed', () => {
    expect(
      isCardDue(
        buildCard({
          state: 'review',
          ladderStepIndex: 0,
          dueAt: now,
        }),
        now,
      ),
    ).toBe(true)
    expect(
      isCardDue(
        buildCard({
          state: 'new',
          dueAt: now - 1,
        }),
        now,
      ),
    ).toBe(false)
    expect(
      isCardDue(
        buildCard({
          state: 'learning',
          dueAt: now + 1,
        }),
        now,
      ),
    ).toBe(false)
  })
})
