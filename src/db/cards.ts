import Dexie from 'dexie'
import { appDb, type RankiDb } from '@/db/app-db'
import {
  normalizeBackImageDraft,
  type BackImageDraft,
} from '@/db/media-assets'
import type { Card } from '@/entities/card'
import type { MediaAsset } from '@/entities/media-asset'
import type { MediaBlob } from '@/entities/media-blob'
import { createId } from '@/lib/ids'
import { nowMs } from '@/lib/time'

export interface CardDraft {
  frontText: string
  backText: string
  backImage?: BackImageDraft | null
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

async function deleteCardMediaAssets(
  cardId: string,
  database: RankiDb,
) {
  const existingAssets = await database.mediaAssets.where('cardId').equals(cardId).toArray()

  if (existingAssets.length === 0) {
    return
  }

  await database.mediaBlobs
    .where('blobRef')
    .anyOf(existingAssets.map((asset) => asset.blobRef))
    .delete()
  await database.mediaAssets.where('cardId').equals(cardId).delete()
}

async function persistCardBackImage(
  card: Card,
  backImage: BackImageDraft,
  timestamp: number,
  database: RankiDb,
) {
  const normalizedBackImage = normalizeBackImageDraft(backImage)

  await deleteCardMediaAssets(card.id, database)

  const assetId = createId()
  const blobRef = `media-blob:${createId()}`
  const mediaAsset: MediaAsset = {
    id: assetId,
    cardId: card.id,
    kind: 'image',
    mimeType: normalizedBackImage.mimeType,
    fileName: normalizedBackImage.fileName,
    sizeBytes: normalizedBackImage.sizeBytes,
    blobRef,
    width: normalizedBackImage.width,
    height: normalizedBackImage.height,
    createdAt: timestamp,
  }
  const mediaBlob: MediaBlob = {
    blobRef,
    blob: normalizedBackImage.blob,
    createdAt: timestamp,
  }

  await database.mediaBlobs.put(mediaBlob)
  await database.mediaAssets.put(mediaAsset)

  return {
    ...card,
    backImageAssetId: assetId,
  }
}

async function removeCardBackImage(card: Card, database: RankiDb) {
  if (!card.backImageAssetId) {
    return card
  }

  await deleteCardMediaAssets(card.id, database)

  return {
    ...card,
    backImageAssetId: null,
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
  return database.transaction(
    'rw',
    database.decks,
    database.cards,
    database.mediaAssets,
    database.mediaBlobs,
    async () => {
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

    let createdCard = card

    if (draft.backImage) {
      createdCard = await persistCardBackImage(
        card,
        draft.backImage,
        timestamp,
        database,
      )
    }

    await database.cards.add(createdCard)
    await database.decks.put({
      ...deck,
      updatedAt: timestamp,
    })

    return createdCard
    },
  )
}

export async function updateCard(
  cardId: string,
  draft: CardDraft,
  database: RankiDb = appDb,
) {
  return database.transaction(
    'rw',
    database.cards,
    database.decks,
    database.mediaAssets,
    database.mediaBlobs,
    async () => {
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
      let updated: Card = {
        ...existing,
        frontText: normalized.frontText,
        backText: normalized.backText,
        updatedAt: timestamp,
      }

      if (draft.backImage === null) {
        updated = await removeCardBackImage(updated, database)
      } else if (draft.backImage) {
        updated = await persistCardBackImage(
          updated,
          draft.backImage,
          timestamp,
          database,
        )
      }

      await database.cards.put(updated)
      await database.decks.put({
        ...deck,
        updatedAt: timestamp,
      })

      return updated
    },
  )
}

export async function deleteCardCascade(
  cardId: string,
  database: RankiDb = appDb,
) {
  return database.transaction(
    'rw',
    [
      database.cards,
      database.decks,
      database.mediaAssets,
      database.mediaBlobs,
      database.reviewLogs,
    ],
    async () => {
      const existing = await database.cards.get(cardId)

      if (!existing) {
        throw new Error('Card not found.')
      }

      const timestamp = nowMs()
      const deck = await database.decks.get(existing.deckId)

      await deleteCardMediaAssets(cardId, database)
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
