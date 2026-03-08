import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { EditReadingDocumentPage } from '@/pages/reading/EditReadingDocumentPage'

const {
  bootstrapAppDbMock,
  deleteReadingDocumentMock,
  getReadingDocumentMock,
  updateReadingDocumentMock,
} = vi.hoisted(() => ({
  bootstrapAppDbMock: vi.fn(),
  deleteReadingDocumentMock: vi.fn(),
  getReadingDocumentMock: vi.fn(),
  updateReadingDocumentMock: vi.fn(),
}))

vi.mock('@/db/bootstrap', () => ({
  bootstrapAppDb: bootstrapAppDbMock,
}))

vi.mock('@/db/reading-documents', () => ({
  deleteReadingDocument: deleteReadingDocumentMock,
  getReadingDocument: getReadingDocumentMock,
  updateReadingDocument: updateReadingDocumentMock,
}))

function renderEditReadingDocumentPage(initialEntry = '/reading/reading-1/edit') {
  const router = createMemoryRouter(
    [
      {
        path: '/reading',
        element: <div>Reading library destination</div>,
      },
      {
        path: '/reading/:documentId',
        element: <div>Reading document destination</div>,
      },
      {
        path: '/reading/:documentId/edit',
        element: <EditReadingDocumentPage />,
      },
    ],
    {
      initialEntries: [initialEntry],
    },
  )

  return render(<RouterProvider router={router} />)
}

describe('EditReadingDocumentPage', () => {
  beforeEach(() => {
    bootstrapAppDbMock.mockReset()
    deleteReadingDocumentMock.mockReset()
    getReadingDocumentMock.mockReset()
    updateReadingDocumentMock.mockReset()
    bootstrapAppDbMock.mockResolvedValue(undefined)
    vi.restoreAllMocks()
  })

  it('loads a saved reading note and saves edits back to the reader route', async () => {
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
    updateReadingDocumentMock.mockResolvedValue({
      id: 'reading-1',
      title: 'Kyiv notes revised',
      bodyText: 'Updated paragraph.',
      sourceKind: 'pasted_text',
      wordCount: 2,
      lastOpenedAt: 100,
      lastReadProgress: 0.35,
      createdAt: 50,
      updatedAt: 150,
    })

    renderEditReadingDocumentPage()

    expect(await screen.findByDisplayValue('Kyiv notes')).toBeInTheDocument()
    expect(screen.getByLabelText('Reading text')).toHaveValue(
      'Paragraph one.\n\nParagraph two.',
    )

    fireEvent.change(screen.getByLabelText('Title'), {
      target: { value: '  Kyiv notes revised  ' },
    })
    fireEvent.change(screen.getByLabelText('Reading text'), {
      target: { value: '  Updated paragraph.  ' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => {
      expect(updateReadingDocumentMock).toHaveBeenCalledWith('reading-1', {
        title: '  Kyiv notes revised  ',
        bodyText: '  Updated paragraph.  ',
      })
    })

    expect(
      await screen.findByText('Reading document destination'),
    ).toBeInTheDocument()
  })

  it('deletes a saved reading note after confirmation and returns to the library', async () => {
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
    deleteReadingDocumentMock.mockResolvedValue(undefined)
    vi.spyOn(window, 'confirm').mockReturnValue(true)

    renderEditReadingDocumentPage()

    expect(await screen.findByDisplayValue('Kyiv notes')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Delete reading note' }))

    await waitFor(() => {
      expect(deleteReadingDocumentMock).toHaveBeenCalledWith('reading-1')
    })

    expect(
      await screen.findByText('Reading library destination'),
    ).toBeInTheDocument()
  })

  it('does not delete a reading note when confirmation is canceled', async () => {
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
    vi.spyOn(window, 'confirm').mockReturnValue(false)

    renderEditReadingDocumentPage()

    expect(await screen.findByDisplayValue('Kyiv notes')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Delete reading note' }))

    expect(deleteReadingDocumentMock).not.toHaveBeenCalled()
    expect(screen.getByDisplayValue('Kyiv notes')).toBeInTheDocument()
  })
})
