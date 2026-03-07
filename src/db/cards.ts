import Dexie from 'dexie'
import { appDb, type RankiDb } from '@/db/app-db'
import type { Card } from '@/entities/card'
import { createId } from '@/lib/ids'
import { nowMs } from '@/lib/time'

export interface CardDraft {
  frontText: string
  backText: string
}

function normalizeCardDraft(draft: CardDraft) {
  const frontText = draft.frontText.trim()
  const backText = draft.backText.trim()

  if (!frontText) {
    throw new Error('Front text is required.')
  }

  if (!backText) {
    throw new Error('Back text is required.')
  }

  return {
    frontText,
    backText,
  }
}

export async function listCardsByDeck(
  deckId: string,
  database: RankiDb = appDb,
) {
  return database.cards
    .where('[deckId+createdAt]')
    .between([deckId, Dexie.minKey], [deckId, Dexie.maxKey])
    .toArray()
}

export async function getCard(cardId: string, database: RankiDb = appDb) {
  return database.cards.get(cardId)
}

export async function createCard(
  deckId: string,
  draft: CardDraft,
  database: RankiDb = appDb,
) {
  return database.transaction('rw', database.decks, database.cards, async () => {
    const deck = await database.decks.get(deckId)

    if (!deck) {
      throw new Error('Deck not found.')
    }

    const timestamp = nowMs()
    const normalized = normalizeCardDraft(draft)
    const card: Card = {
      id: createId(),
      deckId,
      frontText: normalized.frontText,
      backText: normalized.backText,
      backImageAssetId: null,
      state: 'new',
      ladderStepIndex: null,
      dueAt: null,
      lastReviewedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    await database.cards.add(card)
    await database.decks.put({
      ...deck,
      updatedAt: timestamp,
    })

    return card
  })
}

export async function updateCard(
  cardId: string,
  draft: CardDraft,
  database: RankiDb = appDb,
) {
  return database.transaction('rw', database.cards, database.decks, async () => {
    const existing = await database.cards.get(cardId)

    if (!existing) {
      throw new Error('Card not found.')
    }

    const deck = await database.decks.get(existing.deckId)

    if (!deck) {
      throw new Error('Deck not found.')
    }

    const timestamp = nowMs()
    const normalized = normalizeCardDraft(draft)
    const updated: Card = {
      ...existing,
      frontText: normalized.frontText,
      backText: normalized.backText,
      updatedAt: timestamp,
    }

    await database.cards.put(updated)
    await database.decks.put({
      ...deck,
      updatedAt: timestamp,
    })

    return updated
  })
}

export async function deleteCardCascade(
  cardId: string,
  database: RankiDb = appDb,
) {
  return database.transaction(
    'rw',
    database.cards,
    database.decks,
    database.mediaAssets,
    database.reviewLogs,
    async () => {
      const existing = await database.cards.get(cardId)

      if (!existing) {
        throw new Error('Card not found.')
      }

      const timestamp = nowMs()
      const deck = await database.decks.get(existing.deckId)

      await database.mediaAssets.where('cardId').equals(cardId).delete()
      await database.reviewLogs.where('cardId').equals(cardId).delete()
      await database.cards.delete(cardId)

      if (deck) {
        await database.decks.put({
          ...deck,
          updatedAt: timestamp,
        })
      }

      return existing
    },
  )
}

export const listCardsForDeck = listCardsByDeck
