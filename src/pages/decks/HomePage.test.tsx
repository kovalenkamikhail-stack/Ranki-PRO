import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HomePage } from '@/pages/decks/HomePage'

const {
  bootstrapAppDbMock,
  deleteDeckCascadeMock,
  listDecksMock,
  loadStudyActivityStatisticsMock,
  loadDeckStudySessionMock,
} = vi.hoisted(() => ({
    bootstrapAppDbMock: vi.fn(),
    deleteDeckCascadeMock: vi.fn(),
    listDecksMock: vi.fn(),
    loadStudyActivityStatisticsMock: vi.fn(),
    loadDeckStudySessionMock: vi.fn(),
  }))

vi.mock('@/db/bootstrap', () => ({
  bootstrapAppDb: bootstrapAppDbMock,
}))

vi.mock('@/db/decks', () => ({
  deleteDeckCascade: deleteDeckCascadeMock,
  listDecks: listDecksMock,
}))

vi.mock('@/db/study-session', () => ({
  loadDeckStudySession: loadDeckStudySessionMock,
}))

vi.mock('@/db/statistics', () => ({
  loadStudyActivityStatistics: loadStudyActivityStatisticsMock,
}))

function renderHomePage() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  )
}

describe('HomePage', () => {
  beforeEach(() => {
    bootstrapAppDbMock.mockReset()
    deleteDeckCascadeMock.mockReset()
    listDecksMock.mockReset()
    loadStudyActivityStatisticsMock.mockReset()
    loadDeckStudySessionMock.mockReset()
    bootstrapAppDbMock.mockResolvedValue(undefined)
    loadStudyActivityStatisticsMock.mockResolvedValue({
      generatedAt: 10,
      todayStart: 0,
      nextDayStart: 1,
      recentWindowStart: -1,
      recentWindowDays: 7,
      totalReviewHistoryCount: 0,
      hasAnyReviewHistory: false,
      hasRecentActivity: false,
      reviewsCompletedToday: 0,
      reviewsCompletedLast7Days: 0,
      cardsStudiedToday: 0,
      activeDeckCountLast7Days: 0,
      ratingDistributionLast7Days: {
        again: 0,
        hard: 0,
        good: 0,
        easy: 0,
        total: 0,
      },
      mostActiveDecksLast7Days: [],
    })
    loadDeckStudySessionMock.mockResolvedValue({
      state: 'completed',
      nextDueAt: null,
      queue: {
        dueCards: [],
        newCards: [],
        cards: [],
      },
    })
  })

  it('keeps the empty state hidden while decks are still loading', async () => {
    let resolveDecks: ((value: []) => void) | undefined

    listDecksMock.mockReturnValue(
      new Promise((resolve) => {
        resolveDecks = resolve
      }),
    )

    renderHomePage()

    expect(screen.getByText('Loading decks')).toBeInTheDocument()
    expect(screen.queryByText('No decks yet on this device.')).not.toBeInTheDocument()

    resolveDecks?.([])

    expect(await screen.findByText('No decks yet on this device.')).toBeInTheDocument()
  })

  it('renders stored decks and deletes them only after confirmation', async () => {
    listDecksMock.mockResolvedValue([
      {
        id: 'deck-1',
        name: 'Spanish',
        description: 'Travel phrases',
        useGlobalLimits: true,
        newCardsPerDayOverride: null,
        maxReviewsPerDayOverride: null,
        newCardOrder: 'oldest_first',
        createdAt: 10,
        updatedAt: 10,
      },
    ])
    deleteDeckCascadeMock.mockResolvedValue(undefined)
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    renderHomePage()

    expect(await screen.findByText('Spanish')).toBeInTheDocument()
    expect(screen.getByText('Study pulse')).toBeInTheDocument()
    expect(screen.getByText('Due 0')).toBeInTheDocument()
    expect(screen.getByText('New 0')).toBeInTheDocument()
    expect(screen.getByText('Nothing due right now')).toBeInTheDocument()
    expect(
      screen.getByText(/No saved reviews yet\. Home stays deck-first/i),
    ).toBeInTheDocument()
    expect(screen.queryByText('No decks yet on this device.')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Delete Spanish' }))

    await waitFor(() => {
      expect(deleteDeckCascadeMock).toHaveBeenCalledWith('deck-1')
    })

    await waitFor(() => {
      expect(screen.queryByText('Spanish')).not.toBeInTheDocument()
    })
  })

  it('does not replace a loading failure with the empty state', async () => {
    listDecksMock.mockRejectedValue(new Error('IndexedDB unavailable'))

    renderHomePage()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'IndexedDB unavailable',
    )
    expect(screen.queryByText('No decks yet on this device.')).not.toBeInTheDocument()
  })

  it('shows due and new counts from the existing study-session seam on each deck card', async () => {
    listDecksMock.mockResolvedValue([
      {
        id: 'deck-1',
        name: 'Spanish',
        description: 'Travel phrases',
        useGlobalLimits: true,
        newCardsPerDayOverride: null,
        maxReviewsPerDayOverride: null,
        newCardOrder: 'oldest_first',
        createdAt: 10,
        updatedAt: 10,
      },
    ])
    loadDeckStudySessionMock.mockResolvedValue({
      state: 'ready',
      nextDueAt: null,
      queue: {
        dueCards: [{ id: 'due-1' }],
        newCards: [{ id: 'new-1' }, { id: 'new-2' }],
        cards: [{ id: 'due-1' }, { id: 'new-1' }, { id: 'new-2' }],
      },
    })

    renderHomePage()

    expect(await screen.findByText('Spanish')).toBeInTheDocument()
    expect(screen.getByText('Due 1')).toBeInTheDocument()
    expect(screen.getByText('New 2')).toBeInTheDocument()
    expect(screen.getByText('Ready now')).toBeInTheDocument()
    expect(screen.getByText('3 cards are available to study.')).toBeInTheDocument()
  })

  it('surfaces recent overall and per-deck study activity without turning the page into a dashboard', async () => {
    listDecksMock.mockResolvedValue([
      {
        id: 'deck-1',
        name: 'Spanish',
        description: 'Travel phrases',
        useGlobalLimits: true,
        newCardsPerDayOverride: null,
        maxReviewsPerDayOverride: null,
        newCardOrder: 'oldest_first',
        createdAt: 10,
        updatedAt: 10,
      },
      {
        id: 'deck-2',
        name: 'Biology',
        description: 'Exam prep',
        useGlobalLimits: true,
        newCardsPerDayOverride: null,
        maxReviewsPerDayOverride: null,
        newCardOrder: 'oldest_first',
        createdAt: 20,
        updatedAt: 20,
      },
    ])
    loadStudyActivityStatisticsMock.mockResolvedValue({
      generatedAt: 10,
      todayStart: 0,
      nextDayStart: 1,
      recentWindowStart: -1,
      recentWindowDays: 7,
      totalReviewHistoryCount: 8,
      hasAnyReviewHistory: true,
      hasRecentActivity: true,
      reviewsCompletedToday: 4,
      reviewsCompletedLast7Days: 7,
      cardsStudiedToday: 3,
      activeDeckCountLast7Days: 2,
      ratingDistributionLast7Days: {
        again: 1,
        hard: 1,
        good: 3,
        easy: 2,
        total: 7,
      },
      mostActiveDecksLast7Days: [
        {
          deckId: 'deck-1',
          deckName: 'Spanish',
          reviewCount: 4,
          cardsStudiedCount: 4,
          lastReviewedAt: Date.UTC(2026, 2, 9, 9, 0, 0),
        },
        {
          deckId: 'deck-2',
          deckName: 'Biology',
          reviewCount: 3,
          cardsStudiedCount: 2,
          lastReviewedAt: Date.UTC(2026, 2, 8, 9, 0, 0),
        },
      ],
    })

    renderHomePage()

    expect(await screen.findByText('Spanish')).toBeInTheDocument()
    expect(screen.getByText('Reviews today')).toBeInTheDocument()
    expect(screen.getByText('Reviews in last 7 days')).toBeInTheDocument()
    expect(screen.getByText('Active decks in last 7 days')).toBeInTheDocument()
    expect(
      screen.getByText(/Spanish is the most active deck this week with 4 saved reviews across 4 cards/i),
    ).toBeInTheDocument()
    expect(screen.getAllByText('Active this week').length).toBeGreaterThan(0)
    expect(
      screen.getByText(/4 saved reviews across 4 cards in the last 7 local days/i),
    ).toBeInTheDocument()
  })

  it('shows a non-ready zero-count summary when a deck has no cards yet', async () => {
    listDecksMock.mockResolvedValue([
      {
        id: 'deck-1',
        name: 'Spanish',
        description: 'Travel phrases',
        useGlobalLimits: true,
        newCardsPerDayOverride: null,
        maxReviewsPerDayOverride: null,
        newCardOrder: 'oldest_first',
        createdAt: 10,
        updatedAt: 10,
      },
    ])
    loadDeckStudySessionMock.mockResolvedValue({
      state: 'empty',
      nextDueAt: null,
      queue: {
        dueCards: [],
        newCards: [],
        cards: [],
      },
    })

    renderHomePage()

    expect(await screen.findByText('Spanish')).toBeInTheDocument()
    expect(screen.getByText('Due 0')).toBeInTheDocument()
    expect(screen.getByText('New 0')).toBeInTheDocument()
    expect(screen.getAllByText('No cards yet').length).toBeGreaterThan(0)
    expect(
      screen.getByText('Add the first card to make this deck study-ready.'),
    ).toBeInTheDocument()
  })

  it('shows the next due summary when a deck is waiting for a retry', async () => {
    listDecksMock.mockResolvedValue([
      {
        id: 'deck-1',
        name: 'Spanish',
        description: 'Travel phrases',
        useGlobalLimits: true,
        newCardsPerDayOverride: null,
        maxReviewsPerDayOverride: null,
        newCardOrder: 'oldest_first',
        createdAt: 10,
        updatedAt: 10,
      },
    ])
    loadDeckStudySessionMock.mockResolvedValue({
      state: 'completed',
      nextDueAt: Date.UTC(2026, 2, 8, 10, 30, 0),
      queue: {
        dueCards: [],
        newCards: [],
        cards: [],
      },
    })

    renderHomePage()

    expect(await screen.findByText('Spanish')).toBeInTheDocument()
    expect(screen.getByText('Waiting for next due card')).toBeInTheDocument()
    expect(screen.getByText(/^Next due /)).toBeInTheDocument()
  })
})
