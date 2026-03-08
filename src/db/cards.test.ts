import { afterEach, describe, expect, it, vi } from 'vitest'
import { RankiDb } from '@/db/app-db'
import {
  createCard,
  deleteCardCascade,
  listCardsByDeck,
  updateCard,
} from '@/db/cards'
import type { BackImageDraft } from '@/db/media-assets'
import type { Card } from '@/entities/card'
import type { Deck } from '@/entities/deck'
import type { MediaAsset } from '@/entities/media-asset'
import type { MediaBlob } from '@/entities/media-blob'
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

function buildBackImageDraft(
  overrides: Partial<BackImageDraft> = {},
): BackImageDraft {
  const blob = new Blob(['ranki-image-bytes'], { type: 'image/png' })

  return {
    blob,
    mimeType: blob.type,
    fileName: 'hello.png',
    sizeBytes: blob.size,
    width: null,
    height: null,
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

  it('creates a card with one persisted back image and local blob linkage', async () => {
    database = new RankiDb(`ranki-cards-${crypto.randomUUID()}`)
    const deck = buildDeck({ id: 'deck-1', updatedAt: 100 })
    const backImage = buildBackImageDraft()
    nowMsMock.mockReturnValue(2_100)

    await database.decks.add(deck)

    const createdCard = await createCard(
      deck.id,
      {
        frontText: 'bonjour',
        backText: 'hello',
        backImage,
      },
      database,
    )

    expect(createdCard.backImageAssetId).not.toBeNull()

    const storedAsset = await database.mediaAssets.get(createdCard.backImageAssetId!)
    expect(storedAsset).toMatchObject({
      cardId: createdCard.id,
      kind: 'image',
      mimeType: 'image/png',
      fileName: 'hello.png',
      sizeBytes: backImage.sizeBytes,
      width: null,
      height: null,
      createdAt: 2_100,
    })

    const storedBlob = await database.mediaBlobs.get(storedAsset!.blobRef)
    expect(storedBlob).toBeDefined()
    expect(storedBlob?.createdAt).toBe(2_100)
    expect(storedBlob?.blob).toBeDefined()
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

  it('keeps an existing back image when editing text without a new image draft', async () => {
    database = new RankiDb(`ranki-cards-${crypto.randomUUID()}`)
    const deck = buildDeck({ id: 'deck-1', updatedAt: 100 })
    const card = buildCard({
      id: 'card-1',
      deckId: deck.id,
      frontText: 'hello',
      backText: 'hola',
      backImageAssetId: 'asset-1',
      updatedAt: 300,
    })
    const existingAsset: MediaAsset = {
      id: 'asset-1',
      cardId: card.id,
      kind: 'image',
      mimeType: 'image/png',
      fileName: 'hello.png',
      sizeBytes: 123,
      blobRef: 'media-blob:asset-1',
      width: null,
      height: null,
      createdAt: 250,
    }
    const existingBlob: MediaBlob = {
      blobRef: existingAsset.blobRef,
      blob: new Blob(['existing-image'], { type: 'image/png' }),
      createdAt: 250,
    }
    nowMsMock.mockReturnValue(2_550)

    await database.decks.add(deck)
    await database.cards.add(card)
    await database.mediaAssets.add(existingAsset)
    await database.mediaBlobs.add(existingBlob)

    const updatedCard = await updateCard(
      card.id,
      {
        frontText: '  hello there  ',
        backText: '  salut  ',
      },
      database,
    )

    expect(updatedCard.backImageAssetId).toBe(existingAsset.id)
    expect(await database.mediaAssets.get(existingAsset.id)).toEqual(existingAsset)
    const storedBlob = await database.mediaBlobs.get(existingBlob.blobRef)
    expect(storedBlob?.createdAt).toBe(existingBlob.createdAt)
    expect(storedBlob?.blob).toBeDefined()
  })

  it('replaces and removes an existing back image without orphaning blobs', async () => {
    database = new RankiDb(`ranki-cards-${crypto.randomUUID()}`)
    const deck = buildDeck({ id: 'deck-1', updatedAt: 100 })
    const card = buildCard({
      id: 'card-1',
      deckId: deck.id,
      frontText: 'hello',
      backText: 'hola',
      backImageAssetId: 'asset-1',
      updatedAt: 300,
    })
    const existingAsset: MediaAsset = {
      id: 'asset-1',
      cardId: card.id,
      kind: 'image',
      mimeType: 'image/png',
      fileName: 'hello.png',
      sizeBytes: 123,
      blobRef: 'media-blob:asset-1',
      width: null,
      height: null,
      createdAt: 250,
    }
    const existingBlob: MediaBlob = {
      blobRef: existingAsset.blobRef,
      blob: new Blob(['existing-image'], { type: 'image/png' }),
      createdAt: 250,
    }
    const replacementBackImage = buildBackImageDraft({
      blob: new Blob(['replacement-image'], { type: 'image/jpeg' }),
      mimeType: 'image/jpeg',
      fileName: 'replacement.jpg',
      sizeBytes: new Blob(['replacement-image'], { type: 'image/jpeg' }).size,
    })

    nowMsMock.mockReturnValue(2_600)

    await database.decks.add(deck)
    await database.cards.add(card)
    await database.mediaAssets.add(existingAsset)
    await database.mediaBlobs.add(existingBlob)

    const replacedCard = await updateCard(
      card.id,
      {
        frontText: 'hello',
        backText: 'hola',
        backImage: replacementBackImage,
      },
      database,
    )

    expect(replacedCard.backImageAssetId).not.toBe(existingAsset.id)
    expect(await database.mediaAssets.get(existingAsset.id)).toBeUndefined()
    expect(await database.mediaBlobs.get(existingBlob.blobRef)).toBeUndefined()

    const replacementAsset = await database.mediaAssets.get(
      replacedCard.backImageAssetId!,
    )
    const replacementBlob = await database.mediaBlobs.get(
      replacementAsset!.blobRef,
    )
    expect(replacementAsset).toMatchObject({
      cardId: card.id,
      mimeType: 'image/jpeg',
      fileName: 'replacement.jpg',
      sizeBytes: replacementBackImage.sizeBytes,
    })
    expect(replacementBlob?.blob).toBeDefined()

    const removedCard = await updateCard(
      card.id,
      {
        frontText: 'hello',
        backText: 'hola',
        backImage: null,
      },
      database,
    )

    expect(removedCard.backImageAssetId).toBeNull()
    expect(await database.mediaAssets.count()).toBe(0)
    expect(await database.mediaBlobs.count()).toBe(0)
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
    const targetBlob: MediaBlob = {
      blobRef: targetAsset.blobRef,
      blob: new Blob(['target-image'], { type: 'image/png' }),
      createdAt: 10,
    }
    const keepBlob: MediaBlob = {
      blobRef: keepAsset.blobRef,
      blob: new Blob(['keep-image'], { type: 'image/png' }),
      createdAt: 10,
    }
    nowMsMock.mockReturnValue(3_000)

    await database.decks.bulkAdd([targetDeck, keepDeck])
    await database.cards.bulkAdd([targetCard, keepCard])
    await database.mediaAssets.bulkAdd([targetAsset, keepAsset])
    await database.mediaBlobs.bulkAdd([targetBlob, keepBlob])
    await database.reviewLogs.bulkAdd([targetLog, keepLog])

    await deleteCardCascade(targetCard.id, database)

    expect(await database.cards.get(targetCard.id)).toBeUndefined()
    expect(await database.mediaAssets.get(targetAsset.id)).toBeUndefined()
    expect(await database.mediaBlobs.get(targetBlob.blobRef)).toBeUndefined()
    expect(await database.reviewLogs.get(targetLog.id)).toBeUndefined()
    expect((await database.decks.get(targetDeck.id))?.updatedAt).toBe(3_000)

    expect(await database.cards.get(keepCard.id)).toEqual(keepCard)
    expect(await database.mediaAssets.get(keepAsset.id)).toEqual(keepAsset)
    const keptBlob = await database.mediaBlobs.get(keepBlob.blobRef)
    expect(keptBlob?.createdAt).toBe(keepBlob.createdAt)
    expect(keptBlob?.blob).toBeDefined()
    expect(await database.reviewLogs.get(keepLog.id)).toEqual(keepLog)
    expect(await database.decks.get(keepDeck.id)).toEqual(keepDeck)
  })
})
