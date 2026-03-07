import { afterEach, describe, expect, it, vi } from 'vitest'
import { RankiDb } from '@/db/app-db'
import {
  createCard,
  deleteCardCascade,
  listCardsByDeck,
  updateCard,
} from '@/db/cards'
import type { Card } from '@/entities/card'
import type { Deck } from '@/entities/deck'
import type { MediaAsset } from '@/entities/media-asset'
import type { ReviewLog } from '@/entities/review-log'

const { nowMsMock } = vi.hoisted(() => ({
  nowMsMock: vi.fn(),
}))

vi.mock('@/lib/time', () => ({
  nowMs: nowMsMock,
}))

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

describe('card read models', () => {
  let database: RankiDb | undefined

  afterEach(async () => {
    nowMsMock.mockReset()

    if (database) {
      await database.delete()
      database = undefined
    }
  })

  it('lists only the selected deck cards in creation order', async () => {
    database = new RankiDb(`ranki-cards-${crypto.randomUUID()}`)

    const earliestCard = buildCard({
      deckId: 'deck-1',
      frontText: 'hello',
      createdAt: 10,
      updatedAt: 10,
    })
    const latestCard = buildCard({
      deckId: 'deck-1',
      frontText: 'goodbye',
      createdAt: 30,
      updatedAt: 30,
    })
    const otherDeckCard = buildCard({
      deckId: 'deck-2',
      frontText: 'ignored',
      createdAt: 20,
      updatedAt: 20,
    })

    await database.cards.bulkAdd([latestCard, otherDeckCard, earliestCard])

    const cards = await listCardsByDeck('deck-1', database)

    expect(cards).toHaveLength(2)
    expect(cards.map((card) => card.frontText)).toEqual(['hello', 'goodbye'])
  })

  it('creates a trimmed text-first card with MVP defaults', async () => {
    database = new RankiDb(`ranki-cards-${crypto.randomUUID()}`)
    const deck = buildDeck({ id: 'deck-1', updatedAt: 100 })
    nowMsMock.mockReturnValue(2_000)

    await database.decks.add(deck)

    const createdCard = await createCard(
      deck.id,
      {
        frontText: '  hello  ',
        backText: '  hola  ',
      },
      database,
    )

    expect(createdCard.deckId).toBe(deck.id)
    expect(createdCard.frontText).toBe('hello')
    expect(createdCard.backText).toBe('hola')
    expect(createdCard.backImageAssetId).toBeNull()
    expect(createdCard.state).toBe('new')
    expect(createdCard.ladderStepIndex).toBeNull()
    expect(createdCard.dueAt).toBeNull()
    expect(createdCard.lastReviewedAt).toBeNull()
    expect(createdCard.createdAt).toBe(2_000)
    expect(createdCard.updatedAt).toBe(2_000)
    expect(await database.cards.get(createdCard.id)).toEqual(createdCard)
    expect((await database.decks.get(deck.id))?.updatedAt).toBe(2_000)
  })

  it('updates front and back text without resetting scheduler fields', async () => {
    database = new RankiDb(`ranki-cards-${crypto.randomUUID()}`)
    const deck = buildDeck({ id: 'deck-1', updatedAt: 100 })
    const card = buildCard({
      id: 'card-1',
      deckId: deck.id,
      frontText: 'hello',
      backText: 'hola',
      state: 'review',
      ladderStepIndex: 2,
      dueAt: 500,
      lastReviewedAt: 450,
      createdAt: 300,
      updatedAt: 300,
    })
    nowMsMock.mockReturnValue(2_500)

    await database.decks.add(deck)
    await database.cards.add(card)

    const updatedCard = await updateCard(
      card.id,
      {
        frontText: '  hello there  ',
        backText: '  salut  ',
      },
      database,
    )

    expect(updatedCard.frontText).toBe('hello there')
    expect(updatedCard.backText).toBe('salut')
    expect(updatedCard.state).toBe('review')
    expect(updatedCard.ladderStepIndex).toBe(2)
    expect(updatedCard.dueAt).toBe(500)
    expect(updatedCard.lastReviewedAt).toBe(450)
    expect(updatedCard.createdAt).toBe(300)
    expect(updatedCard.updatedAt).toBe(2_500)
    expect((await database.decks.get(deck.id))?.updatedAt).toBe(2_500)
  })

  it('rejects blank front or back text', async () => {
    database = new RankiDb(`ranki-cards-${crypto.randomUUID()}`)
    const deck = buildDeck({ id: 'deck-1' })

    await database.decks.add(deck)

    await expect(
      createCard(
        deck.id,
        {
          frontText: '   ',
          backText: 'hola',
        },
        database,
      ),
    ).rejects.toThrow('Front text is required.')

    await expect(
      createCard(
        deck.id,
        {
          frontText: 'hello',
          backText: '   ',
        },
        database,
      ),
    ).rejects.toThrow('Back text is required.')
  })

  it('deletes the card and its card-scoped records in one transaction', async () => {
    database = new RankiDb(`ranki-cards-${crypto.randomUUID()}`)
    const targetDeck = buildDeck({ id: 'deck-1', updatedAt: 100 })
    const keepDeck = buildDeck({ id: 'deck-2', updatedAt: 200 })
    const targetCard = buildCard({
      id: 'card-1',
      deckId: targetDeck.id,
      frontText: 'hello',
      backText: 'hola',
    })
    const keepCard = buildCard({
      id: 'card-2',
      deckId: keepDeck.id,
      frontText: 'goodbye',
      backText: 'adios',
    })
    const targetAsset: MediaAsset = {
      id: crypto.randomUUID(),
      cardId: targetCard.id,
      kind: 'image',
      mimeType: 'image/png',
      fileName: 'hello.png',
      sizeBytes: 123,
      blobRef: 'blob://hello',
      width: 100,
      height: 100,
      createdAt: 10,
    }
    const keepAsset: MediaAsset = {
      ...targetAsset,
      id: crypto.randomUUID(),
      cardId: keepCard.id,
      blobRef: 'blob://keep',
    }
    const targetLog: ReviewLog = {
      id: crypto.randomUUID(),
      cardId: targetCard.id,
      deckId: targetDeck.id,
      rating: 'good',
      previousState: 'new',
      newState: 'review',
      previousLadderStepIndex: null,
      newLadderStepIndex: 0,
      reviewedAt: 10,
      previousDueAt: null,
      newDueAt: 20,
    }
    const keepLog: ReviewLog = {
      ...targetLog,
      id: crypto.randomUUID(),
      cardId: keepCard.id,
      deckId: keepDeck.id,
    }
    nowMsMock.mockReturnValue(3_000)

    await database.decks.bulkAdd([targetDeck, keepDeck])
    await database.cards.bulkAdd([targetCard, keepCard])
    await database.mediaAssets.bulkAdd([targetAsset, keepAsset])
    await database.reviewLogs.bulkAdd([targetLog, keepLog])

    await deleteCardCascade(targetCard.id, database)

    expect(await database.cards.get(targetCard.id)).toBeUndefined()
    expect(await database.mediaAssets.get(targetAsset.id)).toBeUndefined()
    expect(await database.reviewLogs.get(targetLog.id)).toBeUndefined()
    expect((await database.decks.get(targetDeck.id))?.updatedAt).toBe(3_000)

    expect(await database.cards.get(keepCard.id)).toEqual(keepCard)
    expect(await database.mediaAssets.get(keepAsset.id)).toEqual(keepAsset)
    expect(await database.reviewLogs.get(keepLog.id)).toEqual(keepLog)
    expect(await database.decks.get(keepDeck.id)).toEqual(keepDeck)
  })
})
