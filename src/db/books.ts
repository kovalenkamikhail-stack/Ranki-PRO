import Dexie from 'dexie'
import { appDb, type RankiDb } from '@/db/app-db'
import type { Book, BookChapter } from '@/entities/book'
import type { MediaBlob } from '@/entities/media-blob'
import { parseBookFile } from '@/importers/book'
import { createId } from '@/lib/ids'
import { nowMs } from '@/lib/time'

function normalizeProgress(lastReadProgress: number) {
  if (!Number.isFinite(lastReadProgress)) {
    throw new Error('Book progress must be a finite number.')
  }

  return Math.min(Math.max(lastReadProgress, 0), 1)
}

function sortBooks(books: Book[]) {
  return [...books].sort((left, right) => {
    const lastOpenedDelta =
      (right.lastOpenedAt ?? Number.NEGATIVE_INFINITY) -
      (left.lastOpenedAt ?? Number.NEGATIVE_INFINITY)

    if (lastOpenedDelta !== 0) {
      return lastOpenedDelta
    }

    return right.updatedAt - left.updatedAt
  })
}

export async function listBooks(database: RankiDb = appDb) {
  const books = await database.books.toArray()
  return sortBooks(books)
}

export async function getBook(bookId: string, database: RankiDb = appDb) {
  return database.books.get(bookId)
}

export async function listBookChapters(
  bookId: string,
  database: RankiDb = appDb,
) {
  return database.bookChapters
    .where('[bookId+chapterIndex]')
    .between([bookId, Dexie.minKey], [bookId, Dexie.maxKey])
    .toArray()
}

export async function getBookWithChapters(
  bookId: string,
  database: RankiDb = appDb,
) {
  const book = await getBook(bookId, database)

  if (!book) {
    return null
  }

  const chapters = await listBookChapters(bookId, database)

  return {
    book,
    chapters,
  }
}

export async function importBook(
  file: File,
  database: RankiDb = appDb,
) {
  const parsedBook = await parseBookFile(file)

  return database.transaction(
    'rw',
    database.books,
    database.bookChapters,
    database.mediaBlobs,
    async () => {
      const timestamp = nowMs()
      const bookId = createId()
      const sourceBlobRef = `book-blob:${createId()}`
      const sourceBlob: MediaBlob = {
        blobRef: sourceBlobRef,
        blob: file,
        createdAt: timestamp,
      }
      const book: Book = {
        id: bookId,
        title: parsedBook.title,
        author: parsedBook.author,
        format: parsedBook.format,
        fileName: parsedBook.fileName,
        sourceBlobRef,
        chapterCount: parsedBook.chapters.length,
        totalWordCount: parsedBook.totalWordCount,
        lastOpenedAt: null,
        lastReadChapterIndex: 0,
        lastReadProgress: 0,
        createdAt: timestamp,
        updatedAt: timestamp,
      }
      const chapters: BookChapter[] = parsedBook.chapters.map((chapter, index) => ({
        id: createId(),
        bookId,
        chapterIndex: index,
        title: chapter.title,
        sourceHref: chapter.sourceHref,
        wordCount: chapter.wordCount,
        blocks: chapter.blocks,
        createdAt: timestamp,
      }))

      await database.mediaBlobs.put(sourceBlob)
      await database.books.put(book)
      await database.bookChapters.bulkPut(chapters)

      return {
        book,
        chapters,
      }
    },
  )
}

export async function markBookOpened(
  bookId: string,
  database: RankiDb = appDb,
) {
  return database.transaction('rw', database.books, async () => {
    const existing = await database.books.get(bookId)

    if (!existing) {
      throw new Error('Book not found.')
    }

    const timestamp = nowMs()
    const updated: Book = {
      ...existing,
      lastOpenedAt: timestamp,
      updatedAt: timestamp,
    }

    await database.books.put(updated)
    return updated
  })
}

export async function saveBookProgress(
  bookId: string,
  chapterIndex: number,
  lastReadProgress: number,
  database: RankiDb = appDb,
) {
  return database.transaction('rw', database.books, async () => {
    const existing = await database.books.get(bookId)

    if (!existing) {
      throw new Error('Book not found.')
    }

    if (!Number.isInteger(chapterIndex) || chapterIndex < 0) {
      throw new Error('Book chapter index must be 0 or greater.')
    }

    const updated: Book = {
      ...existing,
      lastReadChapterIndex: chapterIndex,
      lastReadProgress: normalizeProgress(lastReadProgress),
      updatedAt: nowMs(),
    }

    await database.books.put(updated)
    return updated
  })
}
