import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BookReaderPage } from '@/pages/reading/BookReaderPage'

const {
  bootstrapAppDbMock,
  getBookWithChaptersMock,
  markBookOpenedMock,
  saveBookProgressMock,
} = vi.hoisted(() => ({
  bootstrapAppDbMock: vi.fn(),
  getBookWithChaptersMock: vi.fn(),
  markBookOpenedMock: vi.fn(),
  saveBookProgressMock: vi.fn(),
}))

vi.mock('@/db/bootstrap', () => ({
  bootstrapAppDb: bootstrapAppDbMock,
}))

vi.mock('@/db/books', () => ({
  getBookWithChapters: getBookWithChaptersMock,
  markBookOpened: markBookOpenedMock,
  saveBookProgress: saveBookProgressMock,
}))

function renderBookReaderPage() {
  const router = createMemoryRouter(
    [
      {
        path: '/reading/books/:bookId',
        element: <BookReaderPage />,
      },
    ],
    {
      initialEntries: ['/reading/books/book-1'],
    },
  )

  return render(<RouterProvider router={router} />)
}

const snapshot = {
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
    lastReadProgress: 0.35,
    createdAt: 50,
    updatedAt: 50,
  },
  chapters: [
    {
      id: 'chapter-1',
      bookId: 'book-1',
      chapterIndex: 0,
      title: 'Chapter One',
      sourceHref: 'chapter-1.xhtml',
      wordCount: 600,
      blocks: [
        { type: 'heading' as const, text: 'Chapter One', level: 1 },
        {
          type: 'paragraph' as const,
          text: 'First paragraph from the imported EPUB chapter.',
        },
      ],
      createdAt: 50,
    },
    {
      id: 'chapter-2',
      bookId: 'book-1',
      chapterIndex: 1,
      title: 'Chapter Two',
      sourceHref: 'chapter-2.xhtml',
      wordCount: 600,
      blocks: [
        { type: 'heading' as const, text: 'Chapter Two', level: 2 },
        {
          type: 'paragraph' as const,
          text: 'Second chapter text from the imported EPUB.',
        },
      ],
      createdAt: 50,
    },
  ],
}

describe('BookReaderPage', () => {
  beforeEach(() => {
    bootstrapAppDbMock.mockReset()
    getBookWithChaptersMock.mockReset()
    markBookOpenedMock.mockReset()
    saveBookProgressMock.mockReset()
    bootstrapAppDbMock.mockResolvedValue(undefined)
    getBookWithChaptersMock.mockResolvedValue(snapshot)
    markBookOpenedMock.mockResolvedValue({
      ...snapshot.book,
      lastOpenedAt: 200,
      updatedAt: 200,
    })
    saveBookProgressMock.mockResolvedValue({
      ...snapshot.book,
      lastOpenedAt: 200,
      lastReadChapterIndex: 0,
      lastReadProgress: 0.5,
      updatedAt: 220,
    })
  })

  it('renders an imported book and persists chapter-aware reading progress', async () => {
    renderBookReaderPage()

    expect(
      await screen.findByRole('heading', { name: 'Imported Book' }),
    ).toBeInTheDocument()
    expect(markBookOpenedMock).toHaveBeenCalledWith('book-1')
    expect(screen.getByText('Chapter One')).toBeInTheDocument()
    expect(screen.getByText('35%')).toBeInTheDocument()

    const scrollRegion = screen.getByLabelText('Book chapter content')
    Object.defineProperty(scrollRegion, 'scrollHeight', {
      configurable: true,
      value: 1_000,
    })
    Object.defineProperty(scrollRegion, 'clientHeight', {
      configurable: true,
      value: 500,
    })
    Object.defineProperty(scrollRegion, 'scrollTop', {
      configurable: true,
      value: 250,
      writable: true,
    })

    fireEvent.scroll(scrollRegion)

    await waitFor(() => {
      expect(saveBookProgressMock).toHaveBeenCalledWith('book-1', 0, 0.5)
    })
  })

  it('moves between chapters with the reader controls', async () => {
    renderBookReaderPage()

    expect(
      await screen.findByRole('heading', { name: 'Imported Book' }),
    ).toBeInTheDocument()
    expect(screen.getByText('First paragraph from the imported EPUB chapter.')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Next chapter' }))

    expect(await screen.findByText('Second chapter text from the imported EPUB.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous chapter' })).toBeEnabled()
  })
})
