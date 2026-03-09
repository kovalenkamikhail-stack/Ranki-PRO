import { render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CaptureCardPage } from '@/pages/capture/CaptureCardPage'
import { fireEvent } from '@testing-library/react'

const {
  bootstrapAppDbMock,
  listDecksMock,
} = vi.hoisted(() => ({
  bootstrapAppDbMock: vi.fn(),
  listDecksMock: vi.fn(),
}))

vi.mock('@/db/bootstrap', () => ({
  bootstrapAppDb: bootstrapAppDbMock,
}))

vi.mock('@/db/decks', () => ({
  listDecks: listDecksMock,
}))

function EditorDestination() {
  const location = useLocation()

  return (
    <div>
      Editor destination {location.pathname}
      {location.search}
    </div>
  )
}

function renderCapturePage(initialEntry: string) {
  const router = createMemoryRouter(
    [
      {
        path: '/capture/card',
        element: <CaptureCardPage />,
      },
      {
        path: '/decks/:deckId/cards/new',
        element: <EditorDestination />,
      },
    ],
    {
      initialEntries: [initialEntry],
    },
  )

  return {
    router,
    ...render(<RouterProvider router={router} />),
  }
}

describe('CaptureCardPage', () => {
  beforeEach(() => {
    bootstrapAppDbMock.mockReset()
    listDecksMock.mockReset()
    bootstrapAppDbMock.mockResolvedValue(undefined)
  })

  it('shows capture preview and continues into the deck-scoped editor with prefilled search params', async () => {
    listDecksMock.mockResolvedValue([
      {
        id: 'deck-1',
        name: 'English',
        description: 'Core vocabulary',
        useGlobalLimits: true,
        newCardsPerDayOverride: null,
        maxReviewsPerDayOverride: null,
        newCardOrder: 'oldest_first',
        createdAt: 10,
        updatedAt: 10,
      },
    ])

    renderCapturePage(
      '/capture/card?front=obscure&back=hidden%20from%20view&context=Seen%20in%20a%20sentence.&deckId=deck-1',
    )

    expect(await screen.findByText('obscure')).toBeInTheDocument()
    expect(screen.getByText('hidden from view')).toBeInTheDocument()
    expect(screen.getByText('Seen in a sentence.')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByLabelText('Target deck')).toHaveValue('deck-1')
    })
    expect(screen.getByText('Requested deck found')).toBeInTheDocument()

    expect(screen.getByRole('link', { name: 'Continue to English' })).toHaveAttribute(
      'href',
      '/decks/deck-1/cards/new?front=obscure&back=hidden+from+view&context=Seen+in+a+sentence.',
    )
  })

  it('shows an honest error when the capture url does not contain supported fields', async () => {
    listDecksMock.mockResolvedValue([])

    renderCapturePage('/capture/card?deckId=deck-1')

    expect(
      await screen.findByText('This capture request cannot be used yet.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'No supported capture fields were found. Use front, back, and optional context.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Capture details need attention' }),
    ).toBeDisabled()
  })

  it('blocks context-only payloads clearly instead of pretending there is a usable card draft', async () => {
    listDecksMock.mockResolvedValue([
      {
        id: 'deck-1',
        name: 'English',
        description: 'Core vocabulary',
        useGlobalLimits: true,
        newCardsPerDayOverride: null,
        maxReviewsPerDayOverride: null,
        newCardOrder: 'oldest_first',
        createdAt: 10,
        updatedAt: 10,
      },
    ])

    renderCapturePage('/capture/card?context=Seen%20in%20a%20sentence.')

    expect(
      await screen.findByText(
        'Quick capture needs front or back text before it can continue into the card editor.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('Captured context')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Capture details need attention' }),
    ).toBeDisabled()
  })

  it('keeps deck selection explicit when no deckId arrives and multiple local decks exist', async () => {
    listDecksMock.mockResolvedValue([
      {
        id: 'deck-1',
        name: 'English',
        description: 'Core vocabulary',
        useGlobalLimits: true,
        newCardsPerDayOverride: null,
        maxReviewsPerDayOverride: null,
        newCardOrder: 'oldest_first',
        createdAt: 10,
        updatedAt: 10,
      },
      {
        id: 'deck-2',
        name: 'Japanese',
        description: 'Travel phrases',
        useGlobalLimits: true,
        newCardsPerDayOverride: null,
        maxReviewsPerDayOverride: null,
        newCardOrder: 'oldest_first',
        createdAt: 20,
        updatedAt: 20,
      },
    ])

    renderCapturePage('/capture/card?front=obscure&back=hidden')

    expect(await screen.findByText('Selection needed')).toBeInTheDocument()
    expect(screen.getByLabelText('Target deck')).toHaveValue('')
    expect(
      screen.getByRole('button', { name: 'Choose a deck to continue' }),
    ).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Target deck'), {
      target: { value: 'deck-2' },
    })

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Continue to Japanese' })).toHaveAttribute(
        'href',
        '/decks/deck-2/cards/new?front=obscure&back=hidden',
      )
    })
  })

  it('preserves sanitized content and warns when the payload is oversized or noisy', async () => {
    listDecksMock.mockResolvedValue([
      {
        id: 'deck-1',
        name: 'English',
        description: 'Core vocabulary',
        useGlobalLimits: true,
        newCardsPerDayOverride: null,
        maxReviewsPerDayOverride: null,
        newCardOrder: 'oldest_first',
        createdAt: 10,
        updatedAt: 10,
      },
    ])

    renderCapturePage(
      `/capture/card?front=${'f'.repeat(301)}&back=hidden&front=ignored&foo=bar`,
    )

    expect(
      await screen.findByText('Ranki adjusted part of this capture.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Multiple front values were provided. Ranki kept the first usable value.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Ignored 1 unsupported capture field.')).toBeInTheDocument()
    expect(screen.getByText('Front text was trimmed to 300 characters.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Continue to English' })).toHaveAttribute(
      'href',
      `/decks/deck-1/cards/new?front=${'f'.repeat(300)}&back=hidden`,
    )
  })

  it('falls back cleanly when the requested deckId is invalid and still lets the user recover manually', async () => {
    listDecksMock.mockResolvedValue([
      {
        id: 'deck-1',
        name: 'English',
        description: 'Core vocabulary',
        useGlobalLimits: true,
        newCardsPerDayOverride: null,
        maxReviewsPerDayOverride: null,
        newCardOrder: 'oldest_first',
        createdAt: 10,
        updatedAt: 10,
      },
      {
        id: 'deck-2',
        name: 'Japanese',
        description: 'Travel phrases',
        useGlobalLimits: true,
        newCardsPerDayOverride: null,
        maxReviewsPerDayOverride: null,
        newCardOrder: 'oldest_first',
        createdAt: 20,
        updatedAt: 20,
      },
    ])

    renderCapturePage('/capture/card?front=obscure&back=hidden&deckId=missing-deck')

    expect(await screen.findByText('Requested deck unavailable')).toBeInTheDocument()
    expect(
      screen.getByText(/The requested `deckId` is not stored on this device anymore/i),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Choose a deck to continue' }),
    ).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Target deck'), {
      target: { value: 'deck-1' },
    })

    await waitFor(() => {
      expect(screen.getByRole('link', { name: 'Continue to English' })).toHaveAttribute(
        'href',
        '/decks/deck-1/cards/new?front=obscure&back=hidden',
      )
    })
  })

  it('resyncs the selected deck when a new capture url arrives in the same tab', async () => {
    listDecksMock.mockResolvedValue([
      {
        id: 'deck-1',
        name: 'English',
        description: 'Core vocabulary',
        useGlobalLimits: true,
        newCardsPerDayOverride: null,
        maxReviewsPerDayOverride: null,
        newCardOrder: 'oldest_first',
        createdAt: 10,
        updatedAt: 10,
      },
      {
        id: 'deck-2',
        name: 'Japanese',
        description: 'Core vocabulary',
        useGlobalLimits: true,
        newCardsPerDayOverride: null,
        maxReviewsPerDayOverride: null,
        newCardOrder: 'oldest_first',
        createdAt: 20,
        updatedAt: 20,
      },
    ])

    const view = renderCapturePage(
      '/capture/card?front=obscure&back=hidden&deckId=deck-1',
    )

    await waitFor(() => {
      expect(screen.getByLabelText('Target deck')).toHaveValue('deck-1')
    })

    await view.router.navigate(
      '/capture/card?front=harbor&back=sheltered%20place&deckId=deck-2',
    )

    expect(await screen.findByText('harbor')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByLabelText('Target deck')).toHaveValue('deck-2')
    })
    expect(screen.getByRole('link', { name: 'Continue to Japanese' })).toHaveAttribute(
      'href',
      '/decks/deck-2/cards/new?front=harbor&back=sheltered+place',
    )
  })
})
