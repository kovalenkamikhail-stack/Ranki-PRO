import { appDb, type RankiDb } from '@/db/app-db'
import type { ReadingDocument } from '@/entities/reading-document'
import { createId } from '@/lib/ids'
import { nowMs } from '@/lib/time'

export interface ReadingDocumentDraft {
  title: string
  bodyText: string
}

function normalizeReadingDocumentDraft(draft: ReadingDocumentDraft) {
  const title = draft.title.trim()
  const bodyText = draft.bodyText.trim()

  if (!title) {
    throw new Error('Reading title is required.')
  }

  if (!bodyText) {
    throw new Error('Reading text is required.')
  }

  return {
    title,
    bodyText,
  }
}

function countWords(text: string) {
  const normalized = text.trim()

  if (!normalized) {
    return 0
  }

  return normalized.split(/\s+/).length
}

function normalizeReadingProgress(lastReadProgress: number) {
  if (!Number.isFinite(lastReadProgress)) {
    throw new Error('Reading progress must be a finite number.')
  }

  return Math.min(Math.max(lastReadProgress, 0), 1)
}

function sortReadingDocuments(documents: ReadingDocument[]) {
  return [...documents].sort((left, right) => {
    const lastOpenedDelta =
      (right.lastOpenedAt ?? Number.NEGATIVE_INFINITY) -
      (left.lastOpenedAt ?? Number.NEGATIVE_INFINITY)

    if (lastOpenedDelta !== 0) {
      return lastOpenedDelta
    }

    return right.updatedAt - left.updatedAt
  })
}

export async function listReadingDocuments(database: RankiDb = appDb) {
  const documents = await database.readingDocuments.toArray()
  return sortReadingDocuments(documents)
}

export async function getReadingDocument(
  documentId: string,
  database: RankiDb = appDb,
) {
  return database.readingDocuments.get(documentId)
}

export async function createReadingDocument(
  draft: ReadingDocumentDraft,
  database: RankiDb = appDb,
) {
  const timestamp = nowMs()
  const normalized = normalizeReadingDocumentDraft(draft)
  const document: ReadingDocument = {
    id: createId(),
    title: normalized.title,
    bodyText: normalized.bodyText,
    sourceKind: 'pasted_text',
    wordCount: countWords(normalized.bodyText),
    lastOpenedAt: null,
    lastReadProgress: 0,
    createdAt: timestamp,
    updatedAt: timestamp,
  }

  await database.readingDocuments.add(document)
  return document
}

export async function markReadingDocumentOpened(
  documentId: string,
  database: RankiDb = appDb,
) {
  return database.transaction('rw', database.readingDocuments, async () => {
    const existing = await database.readingDocuments.get(documentId)

    if (!existing) {
      throw new Error('Reading document not found.')
    }

    const timestamp = nowMs()
    const updated: ReadingDocument = {
      ...existing,
      lastOpenedAt: timestamp,
      updatedAt: timestamp,
    }

    await database.readingDocuments.put(updated)
    return updated
  })
}

export async function saveReadingDocumentProgress(
  documentId: string,
  lastReadProgress: number,
  database: RankiDb = appDb,
) {
  return database.transaction('rw', database.readingDocuments, async () => {
    const existing = await database.readingDocuments.get(documentId)

    if (!existing) {
      throw new Error('Reading document not found.')
    }

    const updated: ReadingDocument = {
      ...existing,
      lastReadProgress: normalizeReadingProgress(lastReadProgress),
      updatedAt: nowMs(),
    }

    await database.readingDocuments.put(updated)
    return updated
  })
}
