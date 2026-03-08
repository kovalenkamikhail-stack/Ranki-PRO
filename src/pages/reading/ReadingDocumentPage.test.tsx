import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ReadingDocumentPage } from '@/pages/reading/ReadingDocumentPage'

const {
  bootstrapAppDbMock,
  getReadingDocumentMock,
  markReadingDocumentOpenedMock,
  saveReadingDocumentProgressMock,
} = vi.hoisted(() => ({
  bootstrapAppDbMock: vi.fn(),
  getReadingDocumentMock: vi.fn(),
  markReadingDocumentOpenedMock: vi.fn(),
  saveReadingDocumentProgressMock: vi.fn(),
}))

vi.mock('@/db/bootstrap', () => ({
  bootstrapAppDb: bootstrapAppDbMock,
}))

vi.mock('@/db/reading-documents', () => ({
  getReadingDocument: getReadingDocumentMock,
  markReadingDocumentOpened: markReadingDocumentOpenedMock,
  saveReadingDocumentProgress: saveReadingDocumentProgressMock,
}))

function renderReadingDocumentPage() {
  const router = createMemoryRouter(
    [
      {
        path: '/reading/:documentId',
        element: <ReadingDocumentPage />,
      },
    ],
    {
      initialEntries: ['/reading/reading-1'],
    },
  )

  return render(<RouterProvider router={router} />)
}

describe('ReadingDocumentPage', () => {
  beforeEach(() => {
    bootstrapAppDbMock.mockReset()
    getReadingDocumentMock.mockReset()
    markReadingDocumentOpenedMock.mockReset()
    saveReadingDocumentProgressMock.mockReset()
    bootstrapAppDbMock.mockResolvedValue(undefined)
  })

  it('renders the saved document and persists scroll progress', async () => {
    getReadingDocumentMock.mockResolvedValue({
      id: 'reading-1',
      title: 'Kyiv notes',
      bodyText: 'Paragraph one.\n\nParagraph two.',
      sourceKind: 'pasted_text',
      wordCount: 4,
      lastOpenedAt: 100,
      lastReadProgress: 0.35,
      createdAt: 50,
      updatedAt: 100,
    })
    markReadingDocumentOpenedMock.mockResolvedValue({
      id: 'reading-1',
      title: 'Kyiv notes',
      bodyText: 'Paragraph one.\n\nParagraph two.',
      sourceKind: 'pasted_text',
      wordCount: 4,
      lastOpenedAt: 200,
      lastReadProgress: 0.35,
      createdAt: 50,
      updatedAt: 200,
    })
    saveReadingDocumentProgressMock.mockResolvedValue({
      id: 'reading-1',
      title: 'Kyiv notes',
      bodyText: 'Paragraph one.\n\nParagraph two.',
      sourceKind: 'pasted_text',
      wordCount: 4,
      lastOpenedAt: 200,
      lastReadProgress: 0.5,
      createdAt: 50,
      updatedAt: 220,
    })

    renderReadingDocumentPage()

    expect(
      await screen.findByRole('heading', { name: 'Kyiv notes' }),
    ).toBeInTheDocument()
    expect(markReadingDocumentOpenedMock).toHaveBeenCalledWith('reading-1')
    expect(screen.getByText('Resume point')).toBeInTheDocument()
    expect(screen.getByText('35%')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Edit reading note' })).toHaveAttribute(
      'href',
      '/reading/reading-1/edit',
    )

    const scrollRegion = screen.getByLabelText('Reading document content')
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
      expect(saveReadingDocumentProgressMock).toHaveBeenCalledWith(
        'reading-1',
        0.5,
      )
    })
  })

  it('flushes the latest reading progress when the reader unmounts immediately after scrolling', async () => {
    getReadingDocumentMock.mockResolvedValue({
      id: 'reading-1',
      title: 'Kyiv notes',
      bodyText: 'Paragraph one.\n\nParagraph two.',
      sourceKind: 'pasted_text',
      wordCount: 4,
      lastOpenedAt: 100,
      lastReadProgress: 0.1,
      createdAt: 50,
      updatedAt: 100,
    })
    markReadingDocumentOpenedMock.mockResolvedValue({
      id: 'reading-1',
      title: 'Kyiv notes',
      bodyText: 'Paragraph one.\n\nParagraph two.',
      sourceKind: 'pasted_text',
      wordCount: 4,
      lastOpenedAt: 200,
      lastReadProgress: 0.1,
      createdAt: 50,
      updatedAt: 200,
    })
    saveReadingDocumentProgressMock.mockResolvedValue({
      id: 'reading-1',
      title: 'Kyiv notes',
      bodyText: 'Paragraph one.\n\nParagraph two.',
      sourceKind: 'pasted_text',
      wordCount: 4,
      lastOpenedAt: 200,
      lastReadProgress: 0.75,
      createdAt: 50,
      updatedAt: 220,
    })

    const view = renderReadingDocumentPage()

    expect(
      await screen.findByRole('heading', { name: 'Kyiv notes' }),
    ).toBeInTheDocument()

    const scrollRegion = screen.getByLabelText('Reading document content')
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
      value: 375,
      writable: true,
    })

    fireEvent.scroll(scrollRegion)
    view.unmount()

    await waitFor(() => {
      expect(saveReadingDocumentProgressMock).toHaveBeenCalledWith(
        'reading-1',
        0.75,
      )
    })
  })
})
