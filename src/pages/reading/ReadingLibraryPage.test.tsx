import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ReadingLibraryPage } from '@/pages/reading/ReadingLibraryPage'

const {
  bootstrapAppDbMock,
  createReadingDocumentMock,
  listReadingDocumentsMock,
  listBooksMock,
} = vi.hoisted(() => ({
  bootstrapAppDbMock: vi.fn(),
  createReadingDocumentMock: vi.fn(),
  listReadingDocumentsMock: vi.fn(),
  listBooksMock: vi.fn(),
}))

vi.mock('@/db/bootstrap', () => ({
  bootstrapAppDb: bootstrapAppDbMock,
}))

vi.mock('@/db/reading-documents', () => ({
  createReadingDocument: createReadingDocumentMock,
  listReadingDocuments: listReadingDocumentsMock,
}))

vi.mock('@/db/books', () => ({
  listBooks: listBooksMock,
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
    listBooksMock.mockReset()
    bootstrapAppDbMock.mockResolvedValue(undefined)
    listBooksMock.mockResolvedValue([])
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
    expect(
      screen.queryByText('Your library is ready for the first reading note.'),
    ).not.toBeInTheDocument()

    resolveDocuments?.([])

    expect(
      await screen.findByText('Your library is ready for the first reading note.'),
    ).toBeInTheDocument()
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

    await screen.findByText('Your library is ready for the first reading note.')

    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: 'My article' },
    })
    fireEvent.change(screen.getByLabelText('Reading text'), {
      target: { value: 'Paragraph one.\n\nParagraph two.' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save and open reader' }))

    await waitFor(() => {
      expect(createReadingDocumentMock).toHaveBeenCalledWith({
        title: 'My article',
        bodyText: 'Paragraph one.\n\nParagraph two.',
      })
    })

    expect(await screen.findByText('Reader destination')).toBeInTheDocument()
  })

  it('shows saved documents in a scan-friendly library section before the creation area', async () => {
    listReadingDocumentsMock.mockResolvedValue([
      {
        id: 'reading-1',
        title: 'My article',
        bodyText: 'Paragraph one.\n\nParagraph two.',
        sourceKind: 'pasted_text',
        wordCount: 4,
        lastOpenedAt: 50,
        lastReadProgress: 0.35,
        createdAt: 10,
        updatedAt: 60,
      },
    ])

    renderReadingLibraryPage()

    expect(
      await screen.findByRole('heading', { name: 'Reading Library' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Most recently opened first')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Resume reading My article' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Edit My article' })).toHaveAttribute(
      'href',
      '/reading/reading-1/edit',
    )
  })

  it('keeps the book library reachable from the reading hub', async () => {
    listReadingDocumentsMock.mockResolvedValue([])

    renderReadingLibraryPage()

    expect(await screen.findByText('Optional extra')).toBeInTheDocument()
    expect(
      await screen.findByRole('link', { name: 'Open book library' }),
    ).toHaveAttribute('href', '/reading/books')
    expect(screen.getByText(/EPUB, FB2, or MOBI/)).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Back to decks' }).length).toBeGreaterThan(0)
  })

  it('lets the reading hub switch between saved notes and imported books without collapsing their routes', async () => {
    listReadingDocumentsMock.mockResolvedValue([
      {
        id: 'reading-1',
        title: 'Phenomenology notes',
        bodyText: 'Paragraph one.\n\nParagraph two.',
        sourceKind: 'pasted_text',
        wordCount: 4,
        lastOpenedAt: 50,
        lastReadProgress: 0.35,
        createdAt: 10,
        updatedAt: 60,
      },
    ])
    listBooksMock.mockResolvedValue([
      {
        id: 'book-1',
        title: 'Meditations',
        author: 'Marcus Aurelius',
        format: 'epub',
        fileName: 'meditations.epub',
        sourceBlobRef: 'book-blob',
        chapterCount: 12,
        totalWordCount: 42000,
        lastOpenedAt: 70,
        lastReadChapterIndex: 2,
        lastReadProgress: 0.18,
        createdAt: 10,
        updatedAt: 70,
      },
    ])

    renderReadingLibraryPage()

    expect(await screen.findByRole('button', { name: 'All items' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByText('Phenomenology notes')).toBeInTheDocument()
    expect(screen.getByText('Meditations')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Imported books' }))

    expect(screen.getByRole('button', { name: 'Imported books' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByText('Meditations')).toBeInTheDocument()
    expect(screen.queryByText('Phenomenology notes')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Resume book Meditations' })).toHaveAttribute(
      'href',
      '/reading/books/book-1',
    )
  })
})
