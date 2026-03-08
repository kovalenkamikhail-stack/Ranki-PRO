import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ReadingLibraryPage } from '@/pages/reading/ReadingLibraryPage'

const {
  bootstrapAppDbMock,
  createReadingDocumentMock,
  listReadingDocumentsMock,
} = vi.hoisted(() => ({
  bootstrapAppDbMock: vi.fn(),
  createReadingDocumentMock: vi.fn(),
  listReadingDocumentsMock: vi.fn(),
}))

vi.mock('@/db/bootstrap', () => ({
  bootstrapAppDb: bootstrapAppDbMock,
}))

vi.mock('@/db/reading-documents', () => ({
  createReadingDocument: createReadingDocumentMock,
  listReadingDocuments: listReadingDocumentsMock,
}))

function renderReadingLibraryPage() {
  const router = createMemoryRouter(
    [
      {
        path: '/reading',
        element: <ReadingLibraryPage />,
      },
      {
        path: '/reading/:documentId',
        element: <div>Reader destination</div>,
      },
    ],
    {
      initialEntries: ['/reading'],
    },
  )

  return render(<RouterProvider router={router} />)
}

describe('ReadingLibraryPage', () => {
  beforeEach(() => {
    bootstrapAppDbMock.mockReset()
    createReadingDocumentMock.mockReset()
    listReadingDocumentsMock.mockReset()
    bootstrapAppDbMock.mockResolvedValue(undefined)
  })

  it('keeps the empty state hidden while reading documents are still loading', async () => {
    let resolveDocuments: ((value: []) => void) | undefined

    listReadingDocumentsMock.mockReturnValue(
      new Promise((resolve) => {
        resolveDocuments = resolve
      }),
    )

    renderReadingLibraryPage()

    expect(screen.getByText('Loading reading library')).toBeInTheDocument()
    expect(screen.queryByText('No reading items yet.')).not.toBeInTheDocument()

    resolveDocuments?.([])

    expect(await screen.findByText('No reading items yet.')).toBeInTheDocument()
  })

  it('creates a reading document from pasted text and navigates to the reader', async () => {
    listReadingDocumentsMock.mockResolvedValue([])
    createReadingDocumentMock.mockResolvedValue({
      id: 'reading-1',
      title: 'My article',
      bodyText: 'Paragraph one.\n\nParagraph two.',
      sourceKind: 'pasted_text',
      wordCount: 4,
      lastOpenedAt: null,
      lastReadProgress: 0,
      createdAt: 10,
      updatedAt: 10,
    })

    renderReadingLibraryPage()

    await screen.findByText('No reading items yet.')

    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'My article' },
    })
    fireEvent.change(screen.getByLabelText('Reading text'), {
      target: { value: 'Paragraph one.\n\nParagraph two.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save and open' }))

    await waitFor(() => {
      expect(createReadingDocumentMock).toHaveBeenCalledWith({
        title: 'My article',
        bodyText: 'Paragraph one.\n\nParagraph two.',
      })
    })

    expect(await screen.findByText('Reader destination')).toBeInTheDocument()
  })
})
