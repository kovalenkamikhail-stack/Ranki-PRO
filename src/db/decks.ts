import { appDb, type RankiDb } from '@/db/app-db'
import {
  DEFAULT_NEW_CARD_ORDER,
  type Deck,
} from '@/entities/deck'
import { createId } from '@/lib/ids'
import { nowMs } from '@/lib/time'

export interface DeckDraft {
  name: string
  description: string | null
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
  const deck: Deck = {
    id: createId(),
    name: normalized.name,
    description: normalized.description,
    useGlobalLimits: true,
    newCardsPerDayOverride: null,
    maxReviewsPerDayOverride: null,
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
    const normalized = normalizeDeckDraft(draft)

    if (!existing) {
      throw new Error('Deck not found.')
    }

    const updated: Deck = {
      ...existing,
      name: normalized.name,
      description: normalized.description,
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
    database.decks,
    database.cards,
    database.mediaAssets,
    database.reviewLogs,
    async () => {
      const cardIds = (await database.cards
        .where('deckId')
        .equals(deckId)
        .primaryKeys()) as string[]

      if (cardIds.length > 0) {
        await database.mediaAssets.where('cardId').anyOf(cardIds).delete()
        await database.reviewLogs.where('cardId').anyOf(cardIds).delete()
      }

      await database.reviewLogs.where('deckId').equals(deckId).delete()
      await database.cards.where('deckId').equals(deckId).delete()
      await database.decks.delete(deckId)
    },
  )
}
