import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HomePage } from '@/pages/decks/HomePage'

const { bootstrapAppDbMock, deleteDeckCascadeMock, listDecksMock } = vi.hoisted(
  () => ({
    bootstrapAppDbMock: vi.fn(),
    deleteDeckCascadeMock: vi.fn(),
    listDecksMock: vi.fn(),
  }),
)

vi.mock('@/db/bootstrap', () => ({
  bootstrapAppDb: bootstrapAppDbMock,
}))

vi.mock('@/db/decks', () => ({
  deleteDeckCascade: deleteDeckCascadeMock,
  listDecks: listDecksMock,
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
    bootstrapAppDbMock.mockResolvedValue(undefined)
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
})
