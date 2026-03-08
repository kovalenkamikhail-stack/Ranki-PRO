import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HomePage } from '@/pages/decks/HomePage'

const {
  bootstrapAppDbMock,
  deleteDeckCascadeMock,
  listDecksMock,
  loadDeckStudySessionMock,
} = vi.hoisted(() => ({
    bootstrapAppDbMock: vi.fn(),
    deleteDeckCascadeMock: vi.fn(),
    listDecksMock: vi.fn(),
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
    loadDeckStudySessionMock.mockReset()
    bootstrapAppDbMock.mockResolvedValue(undefined)
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
    expect(screen.getByText('Due 0')).toBeInTheDocument()
    expect(screen.getByText('New 0')).toBeInTheDocument()
    expect(screen.getByText('Nothing due right now')).toBeInTheDocument()
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
