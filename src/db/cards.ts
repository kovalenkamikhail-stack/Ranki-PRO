import Dexie from 'dexie'
import { appDb, type RankiDb } from '@/db/app-db'

export async function listCardsByDeck(
  deckId: string,
  database: RankiDb = appDb,
) {
  return database.cards
    .where('[deckId+createdAt]')
    .between([deckId, Dexie.minKey], [deckId, Dexie.maxKey])
    .toArray()
}

export const listCardsForDeck = listCardsByDeck
