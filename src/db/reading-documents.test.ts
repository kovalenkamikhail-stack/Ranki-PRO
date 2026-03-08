import { afterEach, describe, expect, it, vi } from 'vitest'
import { RankiDb } from '@/db/app-db'
import {
  createReadingDocument,
  deleteReadingDocument,
  listReadingDocuments,
  markReadingDocumentOpened,
  saveReadingDocumentProgress,
  updateReadingDocument,
} from '@/db/reading-documents'

const { nowMsMock } = vi.hoisted(() => ({
  nowMsMock: vi.fn(),
}))

vi.mock('@/lib/time', () => ({
  nowMs: nowMsMock,
}))

describe('reading document persistence', () => {
  let database: RankiDb | undefined

  afterEach(async () => {
    nowMsMock.mockReset()

    if (database) {
      await database.delete()
      database = undefined
    }
  })

  it('creates and lists reading documents with trimmed text and derived metadata', async () => {
    database = new RankiDb(`ranki-reading-${crypto.randomUUID()}`)
    nowMsMock.mockReturnValue(1_000)

    const createdDocument = await createReadingDocument(
      {
        title: '  Kyiv Notes  ',
        bodyText: '  First paragraph here.\n\nSecond paragraph now.  ',
      },
      database,
    )

    const listedDocuments = await listReadingDocuments(database)

    expect(createdDocument.title).toBe('Kyiv Notes')
    expect(createdDocument.bodyText).toBe(
      'First paragraph here.\n\nSecond paragraph now.',
    )
    expect(createdDocument.sourceKind).toBe('pasted_text')
    expect(createdDocument.wordCount).toBe(6)
    expect(createdDocument.lastOpenedAt).toBeNull()
    expect(createdDocument.lastReadProgress).toBe(0)
    expect(listedDocuments).toEqual([createdDocument])
  })

  it('marks a document as opened and sorts it ahead of untouched documents', async () => {
    database = new RankiDb(`ranki-reading-${crypto.randomUUID()}`)
    nowMsMock
      .mockReturnValueOnce(1_000)
      .mockReturnValueOnce(2_000)
      .mockReturnValueOnce(3_000)

    const firstDocument = await createReadingDocument(
      {
        title: 'Essay',
        bodyText: 'One two three',
      },
      database,
    )
    await createReadingDocument(
      {
        title: 'Article',
        bodyText: 'Four five six',
      },
      database,
    )

    const openedDocument = await markReadingDocumentOpened(
      firstDocument.id,
      database,
    )
    const listedDocuments = await listReadingDocuments(database)

    expect(openedDocument.createdAt).toBe(1_000)
    expect(openedDocument.updatedAt).toBe(3_000)
    expect(openedDocument.lastOpenedAt).toBe(3_000)
    expect(listedDocuments[0].id).toBe(firstDocument.id)
  })

  it('persists simple reading progress as a clamped ratio', async () => {
    database = new RankiDb(`ranki-reading-${crypto.randomUUID()}`)
    nowMsMock
      .mockReturnValueOnce(1_000)
      .mockReturnValueOnce(2_000)
      .mockReturnValueOnce(3_000)

    const createdDocument = await createReadingDocument(
      {
        title: 'Essay',
        bodyText: 'One two three',
      },
      database,
    )

    await markReadingDocumentOpened(createdDocument.id, database)
    const updatedDocument = await saveReadingDocumentProgress(
      createdDocument.id,
      1.4,
      database,
    )

    expect(updatedDocument.lastReadProgress).toBe(1)
    expect(updatedDocument.lastOpenedAt).toBe(2_000)
    expect(updatedDocument.updatedAt).toBe(3_000)
  })

  it('updates a saved document while preserving resume state and created timestamp', async () => {
    database = new RankiDb(`ranki-reading-${crypto.randomUUID()}`)
    nowMsMock
      .mockReturnValueOnce(1_000)
      .mockReturnValueOnce(2_000)
      .mockReturnValueOnce(3_000)

    const createdDocument = await createReadingDocument(
      {
        title: 'Essay',
        bodyText: 'One two three',
      },
      database,
    )

    await markReadingDocumentOpened(createdDocument.id, database)
    const updatedDocument = await updateReadingDocument(
      createdDocument.id,
      {
        title: '  Revised essay  ',
        bodyText: '  One two three four  ',
      },
      database,
    )

    expect(updatedDocument.title).toBe('Revised essay')
    expect(updatedDocument.bodyText).toBe('One two three four')
    expect(updatedDocument.wordCount).toBe(4)
    expect(updatedDocument.createdAt).toBe(1_000)
    expect(updatedDocument.lastOpenedAt).toBe(2_000)
    expect(updatedDocument.lastReadProgress).toBe(0)
    expect(updatedDocument.updatedAt).toBe(3_000)
  })

  it('deletes a saved reading document from the local library', async () => {
    database = new RankiDb(`ranki-reading-${crypto.randomUUID()}`)
    nowMsMock
      .mockReturnValueOnce(1_000)
      .mockReturnValueOnce(2_000)

    const firstDocument = await createReadingDocument(
      {
        title: 'Essay',
        bodyText: 'One two three',
      },
      database,
    )
    await createReadingDocument(
      {
        title: 'Article',
        bodyText: 'Four five six',
      },
      database,
    )

    const deletedDocument = await deleteReadingDocument(firstDocument.id, database)
    const listedDocuments = await listReadingDocuments(database)

    expect(deletedDocument.id).toBe(firstDocument.id)
    expect(listedDocuments).toHaveLength(1)
    expect(listedDocuments[0]?.title).toBe('Article')
  })

  it('rejects blank content and non-finite progress values', async () => {
    database = new RankiDb(`ranki-reading-${crypto.randomUUID()}`)
    nowMsMock.mockReturnValue(1_000)

    await expect(
      createReadingDocument(
        {
          title: '  ',
          bodyText: 'Notes',
        },
        database,
      ),
    ).rejects.toThrow('Reading title is required.')

    const createdDocument = await createReadingDocument(
      {
        title: 'Essay',
        bodyText: 'Notes',
      },
      database,
    )

    await expect(
      saveReadingDocumentProgress(createdDocument.id, Number.NaN, database),
    ).rejects.toThrow('Reading progress must be a finite number.')

    await expect(
      updateReadingDocument(
        createdDocument.id,
        {
          title: 'Essay',
          bodyText: '  ',
        },
        database,
      ),
    ).rejects.toThrow('Reading text is required.')

    await expect(
      deleteReadingDocument('missing-reading-id', database),
    ).rejects.toThrow('Reading document not found.')
  })
})
