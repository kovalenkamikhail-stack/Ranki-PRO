import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { appDb } from '@/db/app-db'
import { bootstrapAppDb } from '@/db/bootstrap'
import { DeckDetailsPage } from '@/pages/decks/DeckDetailsPage'
import type { Card } from '@/entities/card'
import type { Deck } from '@/entities/deck'

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

    await appDb.decks.add(deck)
    await appDb.cards.bulkAdd([secondCard, firstCard])

    renderDeckDetails()

    expect(await screen.findByText('Cards stored')).toBeInTheDocument()
    expect(screen.getByText('Deck override')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'obscure' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'harbor' })).toBeInTheDocument()
    expect(
      screen.getByText('hidden or difficult to understand'),
    ).toBeInTheDocument()
    expect(screen.getByText('a sheltered place for ships')).toBeInTheDocument()
    expect(screen.getByText('Learning')).toBeInTheDocument()
    expect(screen.getByText('Review')).toBeInTheDocument()
    expect(
      screen.getAllByText(
        'Text-first card editing stays here. Review actions now run from the deck-scoped study route.',
      ).length,
    ).toBeGreaterThan(0)
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
