import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BookLibraryPage } from '@/pages/reading/BookLibraryPage'

const {
  bootstrapAppDbMock,
  importEpubBookMock,
  listBooksMock,
} = vi.hoisted(() => ({
  bootstrapAppDbMock: vi.fn(),
  importEpubBookMock: vi.fn(),
  listBooksMock: vi.fn(),
}))

vi.mock('@/db/bootstrap', () => ({
  bootstrapAppDb: bootstrapAppDbMock,
}))

vi.mock('@/db/books', () => ({
  importEpubBook: importEpubBookMock,
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
    importEpubBookMock.mockReset()
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
      screen.queryByText('Import the first EPUB to start the real book-reader path.'),
    ).not.toBeInTheDocument()

    resolveBooks?.([])

    expect(
      await screen.findByText(
        'Import the first EPUB to start the real book-reader path.',
      ),
    ).toBeInTheDocument()
  })

  it('imports an epub book from disk and navigates into the dedicated reader', async () => {
    listBooksMock.mockResolvedValue([])
    importEpubBookMock.mockResolvedValue({
      book: {
        id: 'book-1',
        title: 'Imported Book',
        author: 'Test Author',
        format: 'epub',
        fileName: 'book.epub',
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

    await screen.findByText('Import EPUB book')

    const file = new File(['epub-binary'], 'book.epub', {
      type: 'application/epub+zip',
    })
    fireEvent.change(screen.getByLabelText('Import EPUB book'), {
      target: { files: [file] },
    })

    await waitFor(() => {
      expect(importEpubBookMock).toHaveBeenCalledWith(file)
    })

    expect(await screen.findByText('Book reader destination')).toBeInTheDocument()
  })

  it('shows imported books in the library with an open-book action', async () => {
    listBooksMock.mockResolvedValue([
      {
        id: 'book-1',
        title: 'Imported Book',
        author: 'Test Author',
        format: 'epub',
        fileName: 'book.epub',
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

    expect(await screen.findByRole('heading', { name: 'Book library' })).toBeInTheDocument()
    expect(screen.getByText('Most recently opened first')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Resume book Imported Book' }),
    ).toHaveAttribute('href', '/reading/books/book-1')
  })
})
