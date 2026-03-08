import type { ReactNode } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EditCardPage } from '@/pages/cards/EditCardPage'

const {
  createCardMock,
  deleteCardCascadeMock,
  getCardMock,
  getCardBackImageMock,
  getDeckMock,
  prepareBackImageDraftMock,
  updateCardMock,
} = vi.hoisted(() => ({
  createCardMock: vi.fn(),
  deleteCardCascadeMock: vi.fn(),
  getCardMock: vi.fn(),
  getCardBackImageMock: vi.fn(),
  getDeckMock: vi.fn(),
  prepareBackImageDraftMock: vi.fn(),
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

vi.mock('@/db/media-assets', () => ({
  BACK_IMAGE_INPUT_ACCEPT: 'image/jpeg,image/png,image/webp',
  getCardBackImage: getCardBackImageMock,
  prepareBackImageDraft: prepareBackImageDraftMock,
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
    getCardBackImageMock.mockReset()
    getDeckMock.mockReset()
    prepareBackImageDraftMock.mockReset()
    updateCardMock.mockReset()
    getCardBackImageMock.mockResolvedValue(null)
    prepareBackImageDraftMock.mockImplementation(async (file: File) => ({
      blob: file,
      mimeType: file.type,
      fileName: file.name,
      sizeBytes: file.size,
      width: 1200,
      height: 900,
    }))
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
        backImage: null,
      })
    })

    expect(await screen.findByText('Deck workspace route')).toBeInTheDocument()
  })

  it('creates a card with one selected back image', async () => {
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

    const file = new File(['image-binary'], 'hola.png', { type: 'image/png' })
    const optimizedBlob = new Blob(['optimized-image'], { type: 'image/webp' })
    prepareBackImageDraftMock.mockResolvedValue({
      blob: optimizedBlob,
      mimeType: 'image/webp',
      fileName: 'hola.webp',
      sizeBytes: optimizedBlob.size,
      width: 1200,
      height: 900,
    })

    fireEvent.change(screen.getByLabelText('Front text'), {
      target: { value: 'hola' },
    })
    fireEvent.change(screen.getByLabelText('Back text'), {
      target: { value: 'hello' },
    })
    fireEvent.change(screen.getByLabelText('Choose image'), {
      target: { files: [file] },
    })
    expect(
      await screen.findByText(
        'This optimized image will be saved when you submit the card.',
      ),
    ).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Create card' })).toBeEnabled()
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create card' }))

    await waitFor(() => {
      expect(createCardMock).toHaveBeenCalledWith(
        'deck-1',
        expect.objectContaining({
          frontText: 'hola',
          backText: 'hello',
          backImage: expect.objectContaining({
            blob: optimizedBlob,
            mimeType: 'image/webp',
            fileName: 'hola.webp',
            sizeBytes: optimizedBlob.size,
            width: 1200,
            height: 900,
          }),
        }),
      )
    })
  })

  it('blocks submit until the selected back image finishes local preparation', async () => {
    getDeckMock.mockResolvedValue({
      id: 'deck-1',
      name: 'Spanish',
      description: 'Travel phrases',
    })

    let resolvePreparedBackImage:
      | ((value: {
          blob: Blob
          mimeType: string
          fileName: string
          sizeBytes: number
          width: number
          height: number
        }) => void)
      | undefined

    prepareBackImageDraftMock.mockReturnValue(
      new Promise((resolve) => {
        resolvePreparedBackImage = resolve
      }),
    )

    renderWithRouter('/decks/deck-1/cards/new', <EditCardPage mode="create" />)

    expect(await screen.findByText('Spanish')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Front text'), {
      target: { value: 'hola' },
    })
    fireEvent.change(screen.getByLabelText('Back text'), {
      target: { value: 'hello' },
    })
    fireEvent.change(screen.getByLabelText('Choose image'), {
      target: {
        files: [new File(['image-binary'], 'hola.png', { type: 'image/png' })],
      },
    })
    expect(
      await screen.findByText('Preparing the selected image locally before save.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Create card' })).toBeDisabled()
    expect(createCardMock).not.toHaveBeenCalled()

    resolvePreparedBackImage?.({
      blob: new Blob(['optimized-image'], { type: 'image/webp' }),
      mimeType: 'image/webp',
      fileName: 'hola.webp',
      sizeBytes: 15,
      width: 1200,
      height: 900,
    })

    expect(
      await screen.findByText(
        'This optimized image will be saved when you submit the card.',
      ),
    ).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Create card' })).toBeEnabled()
    })
  })

  it('shows a preparation error when the selected image is invalid or too large', async () => {
    getDeckMock.mockResolvedValue({
      id: 'deck-1',
      name: 'Spanish',
      description: 'Travel phrases',
    })
    prepareBackImageDraftMock.mockRejectedValue(
      new Error('Back image must be 12 MB or smaller.'),
    )

    renderWithRouter('/decks/deck-1/cards/new', <EditCardPage mode="create" />)

    expect(await screen.findByText('Spanish')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Choose image'), {
      target: {
        files: [new File(['image-binary'], 'too-large.png', { type: 'image/png' })],
      },
    })

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Back image must be 12 MB or smaller.',
    )
    expect(createCardMock).not.toHaveBeenCalled()
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
      backImageAssetId: null,
    })
    updateCardMock.mockResolvedValue({
      id: 'card-9',
      deckId: 'deck-42',
      frontText: 'chat',
      backText: 'cat',
      backImageAssetId: null,
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
        backImage: undefined,
      })
    })

    expect(await screen.findByText('Deck workspace route')).toBeInTheDocument()
  })

  it('loads an existing back image preview and allows removing it on save', async () => {
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
      backImageAssetId: 'asset-1',
    })
    getCardBackImageMock.mockResolvedValue({
      asset: {
        id: 'asset-1',
        cardId: 'card-9',
        kind: 'image',
        mimeType: 'image/png',
        fileName: 'chien.png',
        sizeBytes: 128,
        blobRef: 'media-blob:asset-1',
        width: null,
        height: null,
        createdAt: 10,
      },
      blob: new Blob(['existing-image'], { type: 'image/png' }),
    })
    updateCardMock.mockResolvedValue({
      id: 'card-9',
      deckId: 'deck-42',
      frontText: 'chien',
      backText: 'dog',
      backImageAssetId: null,
    })

    renderWithRouter(
      '/decks/deck-42/cards/card-9/edit',
      <EditCardPage mode="edit" />,
    )

    expect(await screen.findByAltText('Back image for chien')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Remove image' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      expect(updateCardMock).toHaveBeenCalledWith('card-9', {
        frontText: 'chien',
        backText: 'dog',
        backImage: null,
      })
    })
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
      backImageAssetId: null,
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
