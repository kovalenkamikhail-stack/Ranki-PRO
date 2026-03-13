import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BookLibraryPage } from '@/pages/reading/BookLibraryPage'

const {
  bootstrapAppDbMock,
  importBookMock,
  listBooksMock,
} = vi.hoisted(() => ({
  bootstrapAppDbMock: vi.fn(),
  importBookMock: vi.fn(),
  listBooksMock: vi.fn(),
}))

vi.mock('@/db/bootstrap', () => ({
  bootstrapAppDb: bootstrapAppDbMock,
}))

vi.mock('@/db/books', () => ({
  importBook: importBookMock,
  listBooks: listBooksMock,
}))

function renderBookLibraryPage() {
  const router = createMemoryRouter(
    [
      {
        path: '/reading/books',
        element: <BookLibraryPage />,
      },
      {
        path: '/reading/books/:bookId',
        element: <div>Book reader destination</div>,
      },
    ],
    {
      initialEntries: ['/reading/books'],
    },
  )

  return render(<RouterProvider router={router} />)
}

describe('BookLibraryPage', () => {
  beforeEach(() => {
    bootstrapAppDbMock.mockReset()
    importBookMock.mockReset()
    listBooksMock.mockReset()
    bootstrapAppDbMock.mockResolvedValue(undefined)
  })

  it('keeps the empty book state hidden while imported books are still loading', async () => {
    let resolveBooks: ((value: []) => void) | undefined

    listBooksMock.mockReturnValue(
      new Promise((resolve) => {
        resolveBooks = resolve
      }),
    )

    renderBookLibraryPage()

    expect(screen.getByText('Loading book library')).toBeInTheDocument()
    expect(
      screen.queryByText('Import the first book to try the optional reader path.'),
    ).not.toBeInTheDocument()

    resolveBooks?.([])

    expect(
      await screen.findByText('Import the first book to try the optional reader path.'),
    ).toBeInTheDocument()
  })

  it('imports a local book from disk and navigates into the dedicated reader', async () => {
    listBooksMock.mockResolvedValue([])
    importBookMock.mockResolvedValue({
      book: {
        id: 'book-1',
        title: 'Imported Book',
        author: 'Test Author',
        format: 'fb2',
        fileName: 'book.fb2',
        sourceBlobRef: 'book-blob:1',
        chapterCount: 2,
        totalWordCount: 1200,
        lastOpenedAt: null,
        lastReadChapterIndex: 0,
        lastReadProgress: 0,
        createdAt: 10,
        updatedAt: 10,
      },
      chapters: [],
    })

    renderBookLibraryPage()

    await screen.findByText('Import book')

    const file = new File(['fb2-binary'], 'book.fb2', {
      type: 'text/xml',
    })
    fireEvent.change(screen.getByLabelText('Import book'), {
      target: { files: [file] },
    })

    await waitFor(() => {
      expect(importBookMock).toHaveBeenCalledWith(file)
    })

    expect(await screen.findByText('Book reader destination')).toBeInTheDocument()
  })

  it('keeps the empty-state CTA stack readable on narrow layouts', async () => {
    listBooksMock.mockResolvedValue([])

    renderBookLibraryPage()

    const emptyStateHeading = await screen.findByRole('heading', {
      name: 'Import the first book to try the optional reader path.',
    })
    const emptyStateCard = emptyStateHeading.parentElement

    expect(emptyStateCard).not.toBeNull()

    const emptyState = within(emptyStateCard as HTMLElement)
    const importButton = emptyState.getByRole('button', { name: 'Import book' })
    const openReadingToolsLink = emptyState.getByRole('link', {
      name: 'Open reading tools',
    })
    const backToDecksLink = emptyState.getByRole('link', { name: 'Back to decks' })
    const actionStack = importButton.parentElement

    expect(actionStack).not.toBeNull()
    expect(actionStack).toHaveClass('flex-col', 'sm:flex-row', 'sm:flex-wrap')
    expect(importButton).toHaveClass('w-full', 'sm:w-auto')
    expect(openReadingToolsLink).toHaveClass('w-full', 'sm:w-auto')
    expect(backToDecksLink).toHaveClass('w-full', 'sm:w-auto')
  })

  it('shows imported books in the library with their actual format badges', async () => {
    listBooksMock.mockResolvedValue([
      {
        id: 'book-1',
        title: 'Imported Book',
        author: 'Test Author',
        format: 'mobi',
        fileName: 'book.mobi',
        sourceBlobRef: 'book-blob:1',
        chapterCount: 2,
        totalWordCount: 1200,
        lastOpenedAt: 100,
        lastReadChapterIndex: 1,
        lastReadProgress: 0.4,
        createdAt: 10,
        updatedAt: 100,
      },
    ])

    renderBookLibraryPage()

    expect(await screen.findByText('Optional extra')).toBeInTheDocument()
    expect(await screen.findByRole('heading', { name: 'Book library' })).toBeInTheDocument()
    expect(screen.getByText('Most recently opened first')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to decks' })).toHaveAttribute(
      'href',
      '/',
    )
    expect(screen.getByText('MOBI')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Resume book Imported Book' }),
    ).toHaveAttribute('href', '/reading/books/book-1')
  })
})
