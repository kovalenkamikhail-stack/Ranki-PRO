import type { ReactNode } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EditCardPage } from '@/pages/cards/EditCardPage'

const {
  createCardMock,
  deleteCardCascadeMock,
  getCardMock,
  getDeckMock,
  updateCardMock,
} = vi.hoisted(() => ({
  createCardMock: vi.fn(),
  deleteCardCascadeMock: vi.fn(),
  getCardMock: vi.fn(),
  getDeckMock: vi.fn(),
  updateCardMock: vi.fn(),
}))

vi.mock('@/db/cards', () => ({
  createCard: createCardMock,
  deleteCardCascade: deleteCardCascadeMock,
  getCard: getCardMock,
  updateCard: updateCardMock,
}))

vi.mock('@/db/decks', () => ({
  getDeck: getDeckMock,
}))

function renderWithRouter(initialEntry: string, element: ReactNode) {
  const router = createMemoryRouter(
    [
      { path: '/', element: <div>Decks home</div> },
      { path: '/decks/:deckId', element: <div>Deck workspace route</div> },
      { path: '/decks/:deckId/cards/new', element },
      { path: '/decks/:deckId/cards/:cardId/edit', element },
    ],
    {
      initialEntries: [initialEntry],
    },
  )

  return render(<RouterProvider router={router} />)
}

describe('EditCardPage', () => {
  beforeEach(() => {
    createCardMock.mockReset()
    deleteCardCascadeMock.mockReset()
    getCardMock.mockReset()
    getDeckMock.mockReset()
    updateCardMock.mockReset()
  })

  it('validates required text before creating a card', async () => {
    getDeckMock.mockResolvedValue({
      id: 'deck-1',
      name: 'Spanish',
      description: 'Travel phrases',
    })

    renderWithRouter('/decks/deck-1/cards/new', <EditCardPage mode="create" />)

    expect(await screen.findByText('Spanish')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Create card' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Front text is required.',
    )
    expect(createCardMock).not.toHaveBeenCalled()
  })

  it('creates a card inside the selected deck and returns to deck workspace', async () => {
    getDeckMock.mockResolvedValue({
      id: 'deck-1',
      name: 'Spanish',
      description: 'Travel phrases',
    })
    createCardMock.mockResolvedValue({
      id: 'card-1',
      deckId: 'deck-1',
      frontText: 'hola',
      backText: 'hello',
    })

    renderWithRouter('/decks/deck-1/cards/new', <EditCardPage mode="create" />)

    expect(await screen.findByText('Spanish')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Front text'), {
      target: { value: '  hola  ' },
    })
    fireEvent.change(screen.getByLabelText('Back text'), {
      target: { value: '  hello  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create card' }))

    await waitFor(() => {
      expect(createCardMock).toHaveBeenCalledWith('deck-1', {
        frontText: 'hola',
        backText: 'hello',
      })
    })

    expect(await screen.findByText('Deck workspace route')).toBeInTheDocument()
  })

  it('loads an existing card and saves edits back to Dexie', async () => {
    getDeckMock.mockResolvedValue({
      id: 'deck-42',
      name: 'French',
      description: 'Common verbs',
    })
    getCardMock.mockResolvedValue({
      id: 'card-9',
      deckId: 'deck-42',
      frontText: 'chien',
      backText: 'dog',
    })
    updateCardMock.mockResolvedValue({
      id: 'card-9',
      deckId: 'deck-42',
      frontText: 'chat',
      backText: 'cat',
    })

    renderWithRouter(
      '/decks/deck-42/cards/card-9/edit',
      <EditCardPage mode="edit" />,
    )

    expect(await screen.findByDisplayValue('chien')).toBeInTheDocument()
    expect(screen.getByDisplayValue('dog')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Front text'), {
      target: { value: '  chat  ' },
    })
    fireEvent.change(screen.getByLabelText('Back text'), {
      target: { value: '  cat  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      expect(updateCardMock).toHaveBeenCalledWith('card-9', {
        frontText: 'chat',
        backText: 'cat',
      })
    })

    expect(await screen.findByText('Deck workspace route')).toBeInTheDocument()
  })

  it('shows a missing state when the selected card is no longer in the deck', async () => {
    getDeckMock.mockResolvedValue({
      id: 'deck-42',
      name: 'French',
      description: 'Common verbs',
    })
    getCardMock.mockResolvedValue(undefined)

    renderWithRouter(
      '/decks/deck-42/cards/card-9/edit',
      <EditCardPage mode="edit" />,
    )

    expect(await screen.findByText('Card not found')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to deck' })).toHaveAttribute(
      'href',
      '/decks/deck-42',
    )
  })

  it('deletes an existing card and returns to the deck workspace', async () => {
    getDeckMock.mockResolvedValue({
      id: 'deck-42',
      name: 'French',
      description: 'Common verbs',
    })
    getCardMock.mockResolvedValue({
      id: 'card-9',
      deckId: 'deck-42',
      frontText: 'chien',
      backText: 'dog',
    })
    deleteCardCascadeMock.mockResolvedValue(undefined)
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    renderWithRouter(
      '/decks/deck-42/cards/card-9/edit',
      <EditCardPage mode="edit" />,
    )

    expect(await screen.findByDisplayValue('chien')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Delete card' }))

    await waitFor(() => {
      expect(deleteCardCascadeMock).toHaveBeenCalledWith('card-9')
    })

    expect(await screen.findByText('Deck workspace route')).toBeInTheDocument()
  })
})
