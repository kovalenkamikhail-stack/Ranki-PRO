import { appDb, type RankiDb } from '@/db/app-db'
import { DEFAULT_GLOBAL_NEW_CARDS_PER_DAY } from '@/entities/app-settings'
import {
  DEFAULT_NEW_CARD_ORDER,
  type Deck,
} from '@/entities/deck'
import { createId } from '@/lib/ids'
import { nowMs } from '@/lib/time'

export interface DeckDraft {
  name: string
  description: string | null
  useGlobalLimits?: boolean
  newCardsPerDayOverride?: number | null
  maxReviewsPerDayOverride?: number | null
}

function normalizeDeckDraft(draft: DeckDraft) {
  const name = draft.name.trim()

  if (!name) {
    throw new Error('Deck name is required.')
  }

  const description = draft.description?.trim() ?? ''

  return {
    name,
    description: description.length > 0 ? description : null,
  }
}

function normalizeNonNegativeInteger(value: number, fieldName: string) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${fieldName} must be 0 or greater.`)
  }

  return value
}

function normalizeOptionalNonNegativeInteger(
  value: number | null,
  fieldName: string,
) {
  if (value === null) {
    return null
  }

  return normalizeNonNegativeInteger(value, fieldName)
}

function normalizeDeckStudySettings(draft: DeckDraft, existing?: Deck) {
  const useGlobalLimits =
    draft.useGlobalLimits ?? existing?.useGlobalLimits ?? true

  if (useGlobalLimits) {
    return {
      useGlobalLimits: true,
      newCardsPerDayOverride:
        draft.useGlobalLimits === undefined
          ? existing?.newCardsPerDayOverride ?? null
          : null,
      maxReviewsPerDayOverride:
        draft.useGlobalLimits === undefined
          ? existing?.maxReviewsPerDayOverride ?? null
          : null,
    }
  }

  return {
    useGlobalLimits: false,
    newCardsPerDayOverride: normalizeNonNegativeInteger(
      draft.newCardsPerDayOverride ??
        existing?.newCardsPerDayOverride ??
        DEFAULT_GLOBAL_NEW_CARDS_PER_DAY,
      'Deck new cards per day',
    ),
    maxReviewsPerDayOverride: normalizeOptionalNonNegativeInteger(
      draft.maxReviewsPerDayOverride ??
        existing?.maxReviewsPerDayOverride ??
        null,
      'Deck max reviews per day',
    ),
  }
}

export async function listDecks(database: RankiDb = appDb) {
  return database.decks.orderBy('updatedAt').reverse().toArray()
}

export async function getDeck(deckId: string, database: RankiDb = appDb) {
  return database.decks.get(deckId)
}

export async function createDeck(
  draft: DeckDraft,
  database: RankiDb = appDb,
) {
  const timestamp = nowMs()
  const normalized = normalizeDeckDraft(draft)
  const normalizedStudySettings = normalizeDeckStudySettings(draft)
  const deck: Deck = {
    id: createId(),
    name: normalized.name,
    description: normalized.description,
    ...normalizedStudySettings,
    newCardOrder: DEFAULT_NEW_CARD_ORDER,
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  await database.decks.add(deck)
  return deck
}

export async function updateDeck(
  deckId: string,
  draft: DeckDraft,
  database: RankiDb = appDb,
) {
  return database.transaction('rw', database.decks, async () => {
    const existing = await database.decks.get(deckId)

    if (!existing) {
      throw new Error('Deck not found.')
    }

    const normalized = normalizeDeckDraft(draft)
    const normalizedStudySettings = normalizeDeckStudySettings(draft, existing)

    const updated: Deck = {
      ...existing,
      name: normalized.name,
      description: normalized.description,
      ...normalizedStudySettings,
      updatedAt: nowMs(),
    }

    await database.decks.put(updated)
    return updated
  })
}

export async function deleteDeckCascade(
  deckId: string,
  database: RankiDb = appDb,
) {
  return database.transaction(
    'rw',
    [
      database.decks,
      database.cards,
      database.mediaAssets,
      database.mediaBlobs,
      database.reviewLogs,
    ],
    async () => {
      const cardIds = (await database.cards
        .where('deckId')
        .equals(deckId)
        .primaryKeys()) as string[]

      if (cardIds.length > 0) {
        const mediaAssets = await database.mediaAssets
          .where('cardId')
          .anyOf(cardIds)
          .toArray()

        if (mediaAssets.length > 0) {
          await database.mediaBlobs
            .where('blobRef')
            .anyOf(mediaAssets.map((asset) => asset.blobRef))
            .delete()
          await database.mediaAssets.where('cardId').anyOf(cardIds).delete()
        }

        await database.reviewLogs.where('cardId').anyOf(cardIds).delete()
      }

      await database.reviewLogs.where('deckId').equals(deckId).delete()
      await database.cards.where('deckId').equals(deckId).delete()
      await database.decks.delete(deckId)
    },
  )
}
