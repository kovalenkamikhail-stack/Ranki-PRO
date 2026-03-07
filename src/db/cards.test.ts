import { afterEach, describe, expect, it } from 'vitest'
import { RankiDb } from '@/db/app-db'
import { listCardsByDeck } from '@/db/cards'
import type { Card } from '@/entities/card'

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
})
