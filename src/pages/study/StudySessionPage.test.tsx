import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { appDb } from '@/db/app-db'
import type { Card } from '@/entities/card'
import type { Deck } from '@/entities/deck'
import type { MediaAsset } from '@/entities/media-asset'
import type { MediaBlob } from '@/entities/media-blob'
import { StudySessionPage } from '@/pages/study/StudySessionPage'

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

function renderStudySession(initialEntry = '/decks/deck-1/study') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/decks/:deckId/study" element={<StudySessionPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

async function resetAppDb() {
  await appDb.delete()
  await appDb.open()
}

describe('StudySessionPage', () => {
  beforeEach(async () => {
    vi.restoreAllMocks()
    vi.useRealTimers()
    await resetAppDb()
  })

  afterEach(async () => {
    vi.useRealTimers()
    await resetAppDb()
    vi.restoreAllMocks()
  })

  it('shows one current card, reveals the answer, and advances after rating', async () => {
    const now = Date.now()
    const deck = buildDeck({ id: 'deck-1' })
    const dueCard = buildCard({
      id: 'due-card',
      deckId: deck.id,
      frontText: 'obscure',
      backText: 'hidden or difficult to understand',
      state: 'review',
      ladderStepIndex: 1,
      dueAt: now - 1_000,
      lastReviewedAt: now - 5_000,
      createdAt: 20,
      updatedAt: 20,
    })
    const newCard = buildCard({
      id: 'new-card',
      deckId: deck.id,
      frontText: 'harbor',
      backText: 'a sheltered place for ships',
      createdAt: 30,
      updatedAt: 30,
    })

    await appDb.decks.add(deck)
    await appDb.cards.bulkAdd([newCard, dueCard])

    renderStudySession()

    expect(
      await screen.findByRole('heading', { name: 'obscure' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('hidden or difficult to understand'),
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Show answer' }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Again' })).toBeInTheDocument()
    })

    expect(
      screen.getByText('hidden or difficult to understand'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hard' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Good' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Easy' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Good' }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'harbor' })).toBeInTheDocument()
    })

    expect(
      screen.queryByText('hidden or difficult to understand'),
    ).not.toBeInTheDocument()
    expect(await appDb.reviewLogs.count()).toBe(1)
  })

  it('renders the attached back image only after the answer is revealed', async () => {
    const now = Date.now()
    const deck = buildDeck({ id: 'deck-1' })
    const dueCard = buildCard({
      id: 'due-card',
      deckId: deck.id,
      frontText: 'harbor',
      backText: 'a sheltered place for ships',
      backImageAssetId: 'asset-1',
      state: 'review',
      ladderStepIndex: 1,
      dueAt: now - 1_000,
      lastReviewedAt: now - 5_000,
      createdAt: 20,
      updatedAt: 20,
    })
    const dueCardAsset: MediaAsset = {
      id: 'asset-1',
      cardId: dueCard.id,
      kind: 'image',
      mimeType: 'image/png',
      fileName: 'harbor.png',
      sizeBytes: 128,
      blobRef: 'media-blob:asset-1',
      width: null,
      height: null,
      createdAt: 20,
    }
    const dueCardBlob: MediaBlob = {
      blobRef: dueCardAsset.blobRef,
      blob: new Blob(['harbor-image'], { type: 'image/png' }),
      createdAt: 20,
    }

    await appDb.decks.add(deck)
    await appDb.cards.add(dueCard)
    await appDb.mediaAssets.add(dueCardAsset)
    await appDb.mediaBlobs.add(dueCardBlob)

    renderStudySession()

    expect(await screen.findByRole('heading', { name: 'harbor' })).toBeInTheDocument()
    expect(
      screen.queryByAltText(`Back image for ${dueCard.frontText}`),
    ).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Show answer' }))

    expect(
      await screen.findByText(
        'a sheltered place for ships',
        undefined,
        { timeout: 3_000 },
      ),
    ).toBeInTheDocument()
    expect(
      await screen.findByAltText(
        `Back image for ${dueCard.frontText}`,
        undefined,
        { timeout: 3_000 },
      ),
    ).toBeInTheDocument()
  })

  it('clears the previous back image when advancing between image-backed cards', async () => {
    const now = Date.now()
    const deck = buildDeck({ id: 'deck-1' })
    const firstCard = buildCard({
      id: 'first-card',
      deckId: deck.id,
      frontText: 'alpha',
      backText: 'first answer',
      backImageAssetId: 'asset-1',
      state: 'review',
      ladderStepIndex: 1,
      dueAt: now - 2_000,
      lastReviewedAt: now - 8_000,
      createdAt: 20,
      updatedAt: 20,
    })
    const secondCard = buildCard({
      id: 'second-card',
      deckId: deck.id,
      frontText: 'beta',
      backText: 'second answer',
      backImageAssetId: 'asset-2',
      state: 'review',
      ladderStepIndex: 1,
      dueAt: now - 1_000,
      lastReviewedAt: now - 4_000,
      createdAt: 30,
      updatedAt: 30,
    })
    const firstAsset: MediaAsset = {
      id: 'asset-1',
      cardId: firstCard.id,
      kind: 'image',
      mimeType: 'image/png',
      fileName: 'alpha.png',
      sizeBytes: 128,
      blobRef: 'media-blob:asset-1',
      width: null,
      height: null,
      createdAt: 20,
    }
    const firstBlob: MediaBlob = {
      blobRef: firstAsset.blobRef,
      blob: new Blob(['alpha-image'], { type: 'image/png' }),
      createdAt: 20,
    }
    const secondAsset: MediaAsset = {
      id: 'asset-2',
      cardId: secondCard.id,
      kind: 'image',
      mimeType: 'image/png',
      fileName: 'beta.png',
      sizeBytes: 128,
      blobRef: 'media-blob:asset-2',
      width: null,
      height: null,
      createdAt: 30,
    }
    const secondBlob: MediaBlob = {
      blobRef: secondAsset.blobRef,
      blob: new Blob(['beta-image'], { type: 'image/png' }),
      createdAt: 30,
    }

    await appDb.decks.add(deck)
    await appDb.cards.bulkAdd([firstCard, secondCard])
    await appDb.mediaAssets.bulkAdd([firstAsset, secondAsset])
    await appDb.mediaBlobs.bulkAdd([firstBlob, secondBlob])

    renderStudySession()

    expect(await screen.findByRole('heading', { name: 'alpha' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Show answer' }))

    expect(await screen.findByAltText('Back image for alpha')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Good' }))

    expect(await screen.findByRole('heading', { name: 'beta' })).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Show answer' })).toBeInTheDocument()
    })

    expect(screen.queryByAltText('Back image for alpha')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Show answer' }))

    await waitFor(
      () => {
        expect(screen.getByAltText('Back image for beta')).toBeInTheDocument()
      },
      { timeout: 3_000 },
    )
  })

  it('shows the empty deck state instead of the old placeholder copy', async () => {
    const deck = buildDeck({ id: 'deck-1' })

    await appDb.decks.add(deck)

    renderStudySession()

    expect(
      await screen.findByRole('heading', { name: 'No cards in this deck yet' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Add first card' })).toHaveAttribute(
      'href',
      '/decks/deck-1/cards/new',
    )
    expect(
      screen.queryByText('Deck-scoped review route reserved'),
    ).not.toBeInTheDocument()
  })

  it('shows the completed state when the deck has cards but nothing is eligible right now', async () => {
    const deck = buildDeck({ id: 'deck-1' })
    const futureCard = buildCard({
      id: 'future-card',
      deckId: deck.id,
      frontText: 'later',
      backText: 'not due yet',
      state: 'review',
      ladderStepIndex: 2,
      dueAt: Date.now() + 3_600_000,
      lastReviewedAt: Date.now(),
    })

    await appDb.decks.add(deck)
    await appDb.cards.add(futureCard)

    renderStudySession()

    expect(
      await screen.findByRole('heading', { name: 'Study queue complete for now' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/next retry unlocks at/i)).toBeInTheDocument()
    expect(screen.getByText(/keep this page open and the next card will appear automatically at/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Refresh queue' })).toBeInTheDocument()
  })

  it('shows the saved rating outcome with state, ladder, and next due feedback', async () => {
    const now = new Date(2026, 2, 8, 12, 0, 0, 0).getTime()
    vi.spyOn(Date, 'now').mockReturnValue(now)

    const deck = buildDeck({ id: 'deck-1' })
    const dueCard = buildCard({
      id: 'due-card',
      deckId: deck.id,
      frontText: 'obscure',
      backText: 'hidden or difficult to understand',
      state: 'review',
      ladderStepIndex: 1,
      dueAt: now - 1_000,
      lastReviewedAt: now - 5_000,
      createdAt: 20,
      updatedAt: 20,
    })
    const nextCard = buildCard({
      id: 'next-card',
      deckId: deck.id,
      frontText: 'harbor',
      backText: 'a sheltered place for ships',
      createdAt: 30,
      updatedAt: 30,
    })

    await appDb.decks.add(deck)
    await appDb.cards.bulkAdd([nextCard, dueCard])

    renderStudySession()

    expect(
      await screen.findByRole('heading', { name: 'obscure' }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Show answer' }))
    fireEvent.click(screen.getByRole('button', { name: 'Easy' }))

    expect(await screen.findByRole('heading', { name: 'harbor' })).toBeInTheDocument()
    expect(
      await screen.findByRole('heading', { name: 'Last rating result' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Easy moved obscure from Review to Review\./i),
    ).toBeInTheDocument()
    expect(screen.getAllByText('Review -> Review')).not.toHaveLength(0)
    expect(screen.getByText('Step 2 -> Step 4')).toBeInTheDocument()
    expect(screen.getByText(/Next due in 14 days\./i)).toBeInTheDocument()
    expect(screen.getByText('Saved locally')).toBeInTheDocument()
  })

  it('keeps the saved rating outcome visible when the deck enters the waiting state', async () => {
    const now = new Date(2026, 2, 8, 12, 0, 0, 0).getTime()
    vi.spyOn(Date, 'now').mockReturnValue(now)

    const deck = buildDeck({ id: 'deck-1' })
    const dueCard = buildCard({
      id: 'due-card',
      deckId: deck.id,
      frontText: 'obscure',
      backText: 'hidden or difficult to understand',
      state: 'review',
      ladderStepIndex: 1,
      dueAt: now - 1_000,
      lastReviewedAt: now - 5_000,
      createdAt: 20,
      updatedAt: 20,
    })

    await appDb.decks.add(deck)
    await appDb.cards.add(dueCard)

    renderStudySession()

    expect(
      await screen.findByRole('heading', { name: 'obscure' }),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Show answer' }))
    fireEvent.click(screen.getByRole('button', { name: 'Hard' }))

    expect(
      await screen.findByRole('heading', { name: 'Study queue complete for now' }),
    ).toBeInTheDocument()
    expect(
      await screen.findByRole('heading', { name: 'Last rating result' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Hard moved obscure from Review to Learning\./i),
    ).toBeInTheDocument()
    expect(screen.getAllByText('Review -> Learning')).not.toHaveLength(0)
    expect(screen.getByText('Step 2 unchanged')).toBeInTheDocument()
    expect(screen.getByText(/Next due in 2 minutes\./i)).toBeInTheDocument()
  })
})
