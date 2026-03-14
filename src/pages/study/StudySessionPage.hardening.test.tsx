import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Card } from '@/entities/card'
import type { Deck } from '@/entities/deck'
import type { DeckStudySessionSnapshot } from '@/db/study-session'
import { loadDeckStudySession, reviewDeckStudyCard } from '@/db/study-session'
import { getCardBackImage } from '@/db/media-assets'
import { StudySessionPage } from '@/pages/study/StudySessionPage'

vi.mock('@/db/study-session', () => ({
  loadDeckStudySession: vi.fn(),
  reviewDeckStudyCard: vi.fn(),
}))

vi.mock('@/db/media-assets', () => ({
  getCardBackImage: vi.fn(),
}))

function buildDeck(overrides: Partial<Deck> = {}): Deck {
  return {
    id: 'deck-1',
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
    id: 'card-1',
    deckId: 'deck-1',
    frontText: 'obscure',
    backText: 'hidden or difficult to understand',
    backImageAssetId: null,
    state: 'review',
    ladderStepIndex: 1,
    dueAt: Date.now() - 1_000,
    lastReviewedAt: Date.now() - 5_000,
    createdAt: 10,
    updatedAt: 10,
    ...overrides,
  }
}

function buildSession(
  overrides: Partial<DeckStudySessionSnapshot> = {},
): DeckStudySessionSnapshot {
  const deck = overrides.deck ?? buildDeck()
  const currentCard = overrides.currentCard ?? null
  const dueCards = overrides.queue?.dueCards ?? (currentCard ? [currentCard] : [])
  const newCards = overrides.queue?.newCards ?? []
  const queueCards = overrides.queue?.cards ?? [...dueCards, ...newCards]
  const cardsInDeckCount = overrides.cardsInDeckCount ?? queueCards.length

  return {
    deck,
    state:
      overrides.state ??
      (cardsInDeckCount === 0
        ? 'empty'
        : currentCard
          ? 'ready'
          : 'completed'),
    cardsInDeckCount,
    totalCardsInDeck: overrides.totalCardsInDeck ?? cardsInDeckCount,
    queue: {
      dueCards,
      newCards,
      cards: queueCards,
    },
    currentCard,
    nextDueAt: overrides.nextDueAt ?? null,
    limits: overrides.limits ?? {
      newCardsPerDay: 20,
      maxReviewsPerDay: null,
      introducedNewCardsToday: 0,
      reviewedCardsToday: 0,
      remainingReviewCardsToday: null,
    },
  }
}

function createDeferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void

  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })

  return { promise, resolve, reject }
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

async function flushMicrotasks() {
  await act(async () => {
    await Promise.resolve()
  })
}

describe('StudySessionPage hardening', () => {
  const loadDeckStudySessionMock = vi.mocked(loadDeckStudySession)
  const reviewDeckStudyCardMock = vi.mocked(reviewDeckStudyCard)
  const getCardBackImageMock = vi.mocked(getCardBackImage)

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 13, 12, 0, 0, 0))
    loadDeckStudySessionMock.mockReset()
    reviewDeckStudyCardMock.mockReset()
    getCardBackImageMock.mockReset()
    getCardBackImageMock.mockResolvedValue(null)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('keeps the latest waiting-to-ready session when a stale refresh resolves later', async () => {
    const now = Date.now()
    const deck = buildDeck()
    const waitingSession = buildSession({
      deck,
      currentCard: null,
      cardsInDeckCount: 1,
      totalCardsInDeck: 1,
      nextDueAt: now + 1_000,
    })
    const readyCard = buildCard({
      id: 'ready-card',
      deckId: deck.id,
      frontText: 'harbor',
      backText: 'a sheltered place for ships',
      dueAt: now - 1_000,
      lastReviewedAt: now - 6_000,
    })
    const readySession = buildSession({
      deck,
      currentCard: readyCard,
      cardsInDeckCount: 1,
      totalCardsInDeck: 1,
      queue: {
        dueCards: [readyCard],
        newCards: [],
        cards: [readyCard],
      },
      nextDueAt: null,
    })
    const staleManualRefresh = createDeferred<DeckStudySessionSnapshot | null>()
    const freshAutoRefresh = createDeferred<DeckStudySessionSnapshot | null>()

    loadDeckStudySessionMock
      .mockResolvedValueOnce(waitingSession)
      .mockReturnValueOnce(staleManualRefresh.promise)
      .mockReturnValueOnce(freshAutoRefresh.promise)

    renderStudySession()
    await flushMicrotasks()

    const refreshButton = screen.getByRole('button', {
      name: 'Refresh queue',
    })

    fireEvent.click(refreshButton)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000)
    })

    expect(loadDeckStudySessionMock).toHaveBeenCalledTimes(3)

    await act(async () => {
      freshAutoRefresh.resolve(readySession)
    })
    await flushMicrotasks()

    expect(screen.getByRole('heading', { name: 'harbor' })).toBeInTheDocument()

    await act(async () => {
      staleManualRefresh.resolve(waitingSession)
    })
    await flushMicrotasks()

    expect(screen.getByRole('heading', { name: 'harbor' })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Refresh queue' }),
    ).not.toBeInTheDocument()
  })

  it('ignores stale refresh errors after a newer auto-refresh has already recovered the session', async () => {
    const now = Date.now()
    const deck = buildDeck()
    const waitingSession = buildSession({
      deck,
      currentCard: null,
      cardsInDeckCount: 1,
      totalCardsInDeck: 1,
      nextDueAt: now + 1_000,
    })
    const readyCard = buildCard({
      id: 'ready-card',
      deckId: deck.id,
      frontText: 'harbor',
      backText: 'a sheltered place for ships',
      dueAt: now - 1_000,
      lastReviewedAt: now - 6_000,
    })
    const readySession = buildSession({
      deck,
      currentCard: readyCard,
      cardsInDeckCount: 1,
      totalCardsInDeck: 1,
      queue: {
        dueCards: [readyCard],
        newCards: [],
        cards: [readyCard],
      },
      nextDueAt: null,
    })
    const staleManualRefresh = createDeferred<DeckStudySessionSnapshot | null>()
    const freshAutoRefresh = createDeferred<DeckStudySessionSnapshot | null>()

    loadDeckStudySessionMock
      .mockResolvedValueOnce(waitingSession)
      .mockReturnValueOnce(staleManualRefresh.promise)
      .mockReturnValueOnce(freshAutoRefresh.promise)

    renderStudySession()
    await flushMicrotasks()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Refresh queue',
      }),
    )

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1_000)
    })

    expect(loadDeckStudySessionMock).toHaveBeenCalledTimes(3)

    await act(async () => {
      freshAutoRefresh.resolve(readySession)
    })
    await flushMicrotasks()

    expect(screen.getByRole('heading', { name: 'harbor' })).toBeInTheDocument()

    await act(async () => {
      staleManualRefresh.reject(new Error('Failed to refresh the study session.'))
    })
    await flushMicrotasks()

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('does not fetch the back image or show image errors before reveal', async () => {
    const deck = buildDeck()
    const imageCard = buildCard({
      id: 'image-card',
      deckId: deck.id,
      frontText: 'harbor',
      backText: 'a sheltered place for ships',
      backImageAssetId: 'asset-1',
    })
    const readySession = buildSession({
      deck,
      currentCard: imageCard,
      cardsInDeckCount: 1,
      totalCardsInDeck: 1,
      queue: {
        dueCards: [imageCard],
        newCards: [],
        cards: [imageCard],
      },
      nextDueAt: null,
    })

    loadDeckStudySessionMock.mockResolvedValueOnce(readySession)
    getCardBackImageMock.mockRejectedValue(new Error('Failed to load the attached back image.'))

    renderStudySession()
    await flushMicrotasks()

    expect(screen.getByRole('heading', { name: 'harbor' })).toBeInTheDocument()
    expect(getCardBackImageMock).not.toHaveBeenCalled()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
