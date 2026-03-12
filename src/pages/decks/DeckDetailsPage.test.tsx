import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { appDb } from '@/db/app-db'
import { bootstrapAppDb } from '@/db/bootstrap'
import { DeckDetailsPage } from '@/pages/decks/DeckDetailsPage'
import type { Card } from '@/entities/card'
import type { Deck } from '@/entities/deck'
import type { MediaAsset } from '@/entities/media-asset'
import type { MediaBlob } from '@/entities/media-blob'

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
    updatedAt: 20,
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

function renderDeckDetails(initialEntry = '/decks/deck-1') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/decks/:deckId" element={<DeckDetailsPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('DeckDetailsPage', () => {
  beforeEach(async () => {
    await Promise.all([
      appDb.reviewLogs.clear(),
      appDb.mediaAssets.clear(),
      appDb.mediaBlobs.clear(),
      appDb.cards.clear(),
      appDb.decks.clear(),
      appDb.appSettings.clear(),
    ])
    await bootstrapAppDb(appDb)
  })

  afterEach(async () => {
    await Promise.all([
      appDb.reviewLogs.clear(),
      appDb.mediaAssets.clear(),
      appDb.mediaBlobs.clear(),
      appDb.cards.clear(),
      appDb.decks.clear(),
      appDb.appSettings.clear(),
    ])
  })

  it('shows loading first, then the empty state for a deck without cards', async () => {
    const deck = buildDeck({ id: 'deck-1' })
    await appDb.decks.add(deck)

    renderDeckDetails()

    expect(screen.getByText('Loading deck workspace')).toBeInTheDocument()

    expect(
      await screen.findByRole('heading', { name: 'English' }),
    ).toBeInTheDocument()
    expect(screen.getByText('No cards in this deck yet.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Start study' })).toHaveAttribute(
      'href',
      '/decks/deck-1/study',
    )
    expect(screen.getByText('No saved reviews yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Add first card' })).toHaveAttribute(
      'href',
      '/decks/deck-1/cards/new',
    )
    expect(
      screen.getByRole('link', { name: 'Review deck settings' }),
    ).toHaveAttribute('href', '/decks/deck-1/edit')
  })

  it('renders the deck metadata and stored card list shell', async () => {
    const deck = buildDeck({
      id: 'deck-1',
      useGlobalLimits: false,
      newCardsPerDayOverride: 5,
      maxReviewsPerDayOverride: 30,
      newCardOrder: 'random',
    })
    const firstCard = buildCard({
      deckId: deck.id,
      frontText: 'obscure',
      backText: 'hidden or difficult to understand',
      state: 'learning',
      createdAt: 10,
      updatedAt: 20,
    })
    const secondCard = buildCard({
      deckId: deck.id,
      frontText: 'harbor',
      backText: 'a sheltered place for ships',
      backImageAssetId: 'asset-1',
      state: 'review',
      ladderStepIndex: 2,
      dueAt: 0,
      lastReviewedAt: 35,
      createdAt: 30,
      updatedAt: 40,
    })
    const secondCardAsset: MediaAsset = {
      id: 'asset-1',
      cardId: secondCard.id,
      kind: 'image',
      mimeType: 'image/png',
      fileName: 'harbor.png',
      sizeBytes: 128,
      blobRef: 'media-blob:asset-1',
      width: null,
      height: null,
      createdAt: 35,
    }
    const secondCardBlob: MediaBlob = {
      blobRef: secondCardAsset.blobRef,
      blob: new Blob(['harbor-image'], { type: 'image/png' }),
      createdAt: 35,
    }

    await appDb.decks.add(deck)
    await appDb.cards.bulkAdd([secondCard, firstCard])
    await appDb.mediaAssets.add(secondCardAsset)
    await appDb.mediaBlobs.add(secondCardBlob)

    renderDeckDetails()

    expect(await screen.findByText('Cards stored')).toBeInTheDocument()
    expect(screen.getByText('Deck override')).toBeInTheDocument()
    expect(screen.getByText('Randomized daily')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'obscure' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'harbor' })).toBeInTheDocument()
    expect(
      screen.getByText('hidden or difficult to understand'),
    ).toBeInTheDocument()
    expect(screen.getByText('a sheltered place for ships')).toBeInTheDocument()
    expect(screen.getByText('Learning')).toBeInTheDocument()
    expect(screen.getByText('Review')).toBeInTheDocument()
    expect(
      await screen.findByAltText(`Back image for ${secondCard.frontText}`),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'This card keeps its optional back image local to this device. Review actions still run from the deck-scoped study route.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'Text-only cards still work as before. Review actions now run from the deck-scoped study route.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Edit obscure' })).toHaveAttribute(
      'href',
      `/decks/${deck.id}/cards/${firstCard.id}/edit`,
    )
  })

  it('shows due and new counts from the deck-scoped study queue', async () => {
    const now = Date.now()
    const deck = buildDeck({ id: 'deck-1' })
    const dueCard = buildCard({
      id: 'due-card',
      deckId: deck.id,
      state: 'review',
      ladderStepIndex: 1,
      dueAt: now - 1_000,
      lastReviewedAt: now - 10_000,
      frontText: 'due card',
      createdAt: 10,
      updatedAt: 10,
    })
    const newCard = buildCard({
      id: 'new-card',
      deckId: deck.id,
      frontText: 'new card',
      createdAt: 20,
      updatedAt: 20,
    })
    const futureCard = buildCard({
      id: 'future-card',
      deckId: deck.id,
      state: 'review',
      ladderStepIndex: 2,
      dueAt: now + 60_000,
      frontText: 'future card',
      createdAt: 30,
      updatedAt: 30,
    })

    await appDb.decks.add(deck)
    await appDb.cards.bulkAdd([futureCard, newCard, dueCard])

    renderDeckDetails()

    const dueTileLabel = await screen.findByText('Due today')
    const newTileLabel = screen.getByText('New today')

    expect(within(dueTileLabel.closest('div')!).getByText('1')).toBeInTheDocument()
    expect(within(newTileLabel.closest('div')!).getByText('1')).toBeInTheDocument()
    expect(screen.getByText('Ready now')).toBeInTheDocument()
    expect(screen.getByText('2 cards are available to study.')).toBeInTheDocument()
  })

  it('surfaces recent deck study context from saved review history', async () => {
    const now = Date.UTC(2026, 2, 9, 10, 0, 0)
    const deck = buildDeck({ id: 'deck-1' })
    const dueCard = buildCard({
      id: 'due-card',
      deckId: deck.id,
      state: 'review',
      ladderStepIndex: 1,
      dueAt: now - 1_000,
      lastReviewedAt: now - 10_000,
      frontText: 'due card',
      createdAt: 10,
      updatedAt: 10,
    })
    const otherDeck = buildDeck({ id: 'deck-2', name: 'Spanish' })

    await appDb.decks.bulkAdd([deck, otherDeck])
    await appDb.cards.add(dueCard)
    await appDb.reviewLogs.bulkAdd([
      {
        id: 'review-1',
        cardId: dueCard.id,
        deckId: deck.id,
        rating: 'good',
        previousState: 'review',
        newState: 'review',
        previousLadderStepIndex: 1,
        newLadderStepIndex: 2,
        reviewedAt: now - 60_000,
        previousDueAt: now - 120_000,
        newDueAt: now + 60_000,
      },
      {
        id: 'review-2',
        cardId: `${dueCard.id}-2`,
        deckId: deck.id,
        rating: 'again',
        previousState: 'review',
        newState: 'learning',
        previousLadderStepIndex: 2,
        newLadderStepIndex: 0,
        reviewedAt: now - 26 * 60 * 60 * 1000,
        previousDueAt: now - 27 * 60 * 60 * 1000,
        newDueAt: now - 25 * 60 * 60 * 1000,
      },
      {
        id: 'review-3',
        cardId: 'other-card',
        deckId: otherDeck.id,
        rating: 'hard',
        previousState: 'review',
        newState: 'review',
        previousLadderStepIndex: 2,
        newLadderStepIndex: 2,
        reviewedAt: now - 60_000,
        previousDueAt: now - 120_000,
        newDueAt: now + 60_000,
      },
    ])

    renderDeckDetails()

    expect(await screen.findByText('Deck context')).toBeInTheDocument()
    expect(screen.getByText('Active this week')).toBeInTheDocument()
    expect(
      screen.getByText(/2 saved reviews across 2 cards in the last 7 local days/i),
    ).toBeInTheDocument()
    expect(screen.getByText('Reviews today')).toBeInTheDocument()
    expect(screen.getByText('2 reviews / 2 cards')).toBeInTheDocument()
  })

  it('respects deck-level limits when showing deck study counters', async () => {
    const now = Date.now()
    const deck = buildDeck({
      id: 'deck-1',
      useGlobalLimits: false,
      newCardsPerDayOverride: 1,
      maxReviewsPerDayOverride: 1,
    })
    const firstDueCard = buildCard({
      id: 'due-card-1',
      deckId: deck.id,
      state: 'review',
      ladderStepIndex: 1,
      dueAt: now - 10_000,
      lastReviewedAt: now - 20_000,
      frontText: 'first due card',
      createdAt: 10,
      updatedAt: 10,
    })
    const secondDueCard = buildCard({
      id: 'due-card-2',
      deckId: deck.id,
      state: 'review',
      ladderStepIndex: 2,
      dueAt: now - 5_000,
      lastReviewedAt: now - 15_000,
      frontText: 'second due card',
      createdAt: 20,
      updatedAt: 20,
    })
    const firstNewCard = buildCard({
      id: 'new-card-1',
      deckId: deck.id,
      frontText: 'first new card',
      createdAt: 30,
      updatedAt: 30,
    })
    const secondNewCard = buildCard({
      id: 'new-card-2',
      deckId: deck.id,
      frontText: 'second new card',
      createdAt: 40,
      updatedAt: 40,
    })

    await appDb.decks.add(deck)
    await appDb.cards.bulkAdd([
      secondNewCard,
      secondDueCard,
      firstNewCard,
      firstDueCard,
    ])

    renderDeckDetails()

    const dueTileLabel = await screen.findByText('Due today')
    const newTileLabel = screen.getByText('New today')

    expect(within(dueTileLabel.closest('div')!).getByText('1')).toBeInTheDocument()
    expect(within(newTileLabel.closest('div')!).getByText('1')).toBeInTheDocument()
    expect(screen.getByText('Ready now')).toBeInTheDocument()
    expect(screen.getByText('2 cards are available to study.')).toBeInTheDocument()
  })

  it('shows a waiting status when the deck has cards but nothing is eligible yet', async () => {
    const now = Date.now()
    const deck = buildDeck({ id: 'deck-1' })
    const futureCard = buildCard({
      id: 'future-card',
      deckId: deck.id,
      frontText: 'future card',
      state: 'review',
      ladderStepIndex: 2,
      dueAt: now + 60_000,
      lastReviewedAt: now - 5_000,
      createdAt: 10,
      updatedAt: 10,
    })

    await appDb.decks.add(deck)
    await appDb.cards.add(futureCard)

    renderDeckDetails()

    expect(await screen.findByText('Waiting for next due card')).toBeInTheDocument()
    expect(screen.getByText(/^Next due /)).toBeInTheDocument()
  })

  it('deletes a stored card and updates the empty state when the last one is removed', async () => {
    const deck = buildDeck({ id: 'deck-1' })
    const card = buildCard({
      id: 'card-1',
      deckId: deck.id,
      frontText: 'obscure',
      backText: 'hidden or difficult to understand',
    })

    vi.spyOn(window, 'confirm').mockReturnValue(true)

    await appDb.decks.add(deck)
    await appDb.cards.add(card)

    renderDeckDetails()

    expect(await screen.findByRole('heading', { name: 'obscure' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Delete obscure' }))

    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: 'obscure' })).not.toBeInTheDocument()
    })

    expect(screen.getByText('No cards in this deck yet.')).toBeInTheDocument()
    expect(await appDb.cards.get(card.id)).toBeUndefined()
  })

  it('shows a missing state when the deck no longer exists', async () => {
    renderDeckDetails()

    expect(await screen.findByText('Deck not found')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to decks' })).toHaveAttribute(
      'href',
      '/',
    )
  })
})
