import type { ReactNode } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EditDeckPage } from '@/pages/decks/EditDeckPage'

const { createDeckMock, getDeckMock, updateDeckMock } = vi.hoisted(() => ({
  createDeckMock: vi.fn(),
  getDeckMock: vi.fn(),
  updateDeckMock: vi.fn(),
}))

vi.mock('@/db/decks', () => ({
  createDeck: createDeckMock,
  getDeck: getDeckMock,
  updateDeck: updateDeckMock,
}))

function renderWithRouter(initialEntry: string, element: ReactNode) {
  const router = createMemoryRouter(
    [
      { path: '/', element: <div>Decks home</div> },
      { path: '/decks/new', element },
      { path: '/decks/:deckId/edit', element },
    ],
    {
      initialEntries: [initialEntry],
    },
  )

  return render(<RouterProvider router={router} />)
}

describe('EditDeckPage', () => {
  beforeEach(() => {
    createDeckMock.mockReset()
    getDeckMock.mockReset()
    updateDeckMock.mockReset()
  })

  it('validates the required name before creating a deck', async () => {
    renderWithRouter('/decks/new', <EditDeckPage mode="create" />)

    fireEvent.click(screen.getByRole('button', { name: 'Create deck' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Deck name is required.',
    )
    expect(createDeckMock).not.toHaveBeenCalled()
  })

  it('creates a deck and returns to the decks home route', async () => {
    createDeckMock.mockResolvedValue({
      id: 'deck-1',
      name: 'Spanish',
    })

    renderWithRouter('/decks/new', <EditDeckPage mode="create" />)

    fireEvent.change(screen.getByLabelText('Deck name'), {
      target: { value: '  Spanish  ' },
    })
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: '  Travel phrases  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create deck' }))

    await waitFor(() => {
      expect(createDeckMock).toHaveBeenCalledWith({
        name: 'Spanish',
        description: 'Travel phrases',
      })
    })

    expect(await screen.findByText('Decks home')).toBeInTheDocument()
  })

  it('prefills an existing deck and saves edits back to Dexie', async () => {
    getDeckMock.mockResolvedValue({
      id: 'deck-42',
      name: 'French',
      description: 'Common verbs',
    })
    updateDeckMock.mockResolvedValue({
      id: 'deck-42',
      name: 'French B1',
      description: 'Common verbs and phrases',
    })

    renderWithRouter('/decks/deck-42/edit', <EditDeckPage mode="edit" />)

    expect(await screen.findByDisplayValue('French')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Common verbs')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Deck name'), {
      target: { value: ' French B1 ' },
    })
    fireEvent.change(screen.getByLabelText('Description'), {
      target: { value: ' Common verbs and phrases ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      expect(updateDeckMock).toHaveBeenCalledWith('deck-42', {
        name: 'French B1',
        description: 'Common verbs and phrases',
      })
    })

    expect(await screen.findByText('Decks home')).toBeInTheDocument()
  })
})
