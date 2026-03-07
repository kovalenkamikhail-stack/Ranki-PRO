import { afterEach, describe, expect, it, vi } from 'vitest'
import { RankiDb } from '@/db/app-db'
import {
  createDeck,
  deleteDeckCascade,
  listDecks,
  updateDeck,
} from '@/db/decks'
import type { Card } from '@/entities/card'
import type { MediaAsset } from '@/entities/media-asset'
import type { ReviewLog } from '@/entities/review-log'

const { nowMsMock } = vi.hoisted(() => ({
  nowMsMock: vi.fn(),
}))

vi.mock('@/lib/time', () => ({
  nowMs: nowMsMock,
}))

describe('deck persistence', () => {
  let database: RankiDb | undefined

  afterEach(async () => {
    nowMsMock.mockReset()

    if (database) {
      await database.delete()
      database = undefined
    }
  })

  it('creates and lists decks with trimmed values and MVP defaults', async () => {
    database = new RankiDb(`ranki-decks-${crypto.randomUUID()}`)
    nowMsMock.mockReturnValue(1_000)

    const createdDeck = await createDeck(
      {
        name: '  English  ',
        description: '  Core vocabulary  ',
      },
      database,
    )

    const storedDecks = await listDecks(database)

    expect(createdDeck.name).toBe('English')
    expect(createdDeck.description).toBe('Core vocabulary')
    expect(createdDeck.useGlobalLimits).toBe(true)
    expect(createdDeck.newCardsPerDayOverride).toBeNull()
    expect(createdDeck.maxReviewsPerDayOverride).toBeNull()
    expect(storedDecks).toHaveLength(1)
    expect(storedDecks[0]).toEqual(createdDeck)
  })

  it('updates an existing deck without changing its creation timestamp', async () => {
    database = new RankiDb(`ranki-decks-${crypto.randomUUID()}`)
    nowMsMock.mockReturnValueOnce(1_000).mockReturnValueOnce(2_000)

    const createdDeck = await createDeck(
      {
        name: 'English',
        description: null,
      },
      database,
    )

    const updatedDeck = await updateDeck(
      createdDeck.id,
      {
        name: '  English B1  ',
        description: '  Daily review  ',
      },
      database,
    )

    expect(updatedDeck.name).toBe('English B1')
    expect(updatedDeck.description).toBe('Daily review')
    expect(updatedDeck.createdAt).toBe(1_000)
    expect(updatedDeck.updatedAt).toBe(2_000)
  })

  it('rejects blank deck names', async () => {
    database = new RankiDb(`ranki-decks-${crypto.randomUUID()}`)

    await expect(
      createDeck(
        {
          name: '   ',
          description: null,
        },
        database,
      ),
    ).rejects.toThrow('Deck name is required.')
  })

  it('deletes the deck and its deck-scoped records in one transaction', async () => {
    database = new RankiDb(`ranki-decks-${crypto.randomUUID()}`)
    nowMsMock.mockReturnValue(1_000)

    const targetDeck = await createDeck(
      {
        name: 'English',
        description: null,
      },
      database,
    )

    const keepDeck = await createDeck(
      {
        name: 'Spanish',
        description: null,
      },
      database,
    )

    const targetCard: Card = {
      id: crypto.randomUUID(),
      deckId: targetDeck.id,
      frontText: 'hello',
      backText: 'hola',
      backImageAssetId: null,
      state: 'new',
      ladderStepIndex: null,
      dueAt: null,
      lastReviewedAt: null,
      createdAt: 10,
      updatedAt: 10,
    }

    const keepCard: Card = {
      ...targetCard,
      id: crypto.randomUUID(),
      deckId: keepDeck.id,
    }

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

    await database.cards.bulkAdd([targetCard, keepCard])
    await database.mediaAssets.bulkAdd([targetAsset, keepAsset])
    await database.reviewLogs.bulkAdd([targetLog, keepLog])

    await deleteDeckCascade(targetDeck.id, database)

    expect(await database.decks.get(targetDeck.id)).toBeUndefined()
    expect(await database.cards.get(targetCard.id)).toBeUndefined()
    expect(await database.mediaAssets.get(targetAsset.id)).toBeUndefined()
    expect(await database.reviewLogs.get(targetLog.id)).toBeUndefined()

    expect(await database.decks.get(keepDeck.id)).toEqual(keepDeck)
    expect(await database.cards.get(keepCard.id)).toEqual(keepCard)
    expect(await database.mediaAssets.get(keepAsset.id)).toEqual(keepAsset)
    expect(await database.reviewLogs.get(keepLog.id)).toEqual(keepLog)
  })
})
