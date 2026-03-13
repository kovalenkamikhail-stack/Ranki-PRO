export type ImportedBookFormat = 'epub' | 'fb2' | 'mobi'

export const IMPORTED_BOOK_FORMAT_LABELS: Record<ImportedBookFormat, string> = {
  epub: 'EPUB',
  fb2: 'FB2',
  mobi: 'MOBI',
}

export function formatImportedBookFormat(format: ImportedBookFormat) {
  return IMPORTED_BOOK_FORMAT_LABELS[format]
}

export type BookContentBlock =
  | {
      type: 'heading'
      text: string
      level: number
    }
  | {
      type: 'paragraph'
      text: string
    }
  | {
      type: 'quote'
      text: string
    }
  | {
      type: 'list-item'
      text: string
    }

export interface BookChapter {
  id: string
  bookId: string
  chapterIndex: number
  title: string
  sourceHref: string
  wordCount: number
  blocks: BookContentBlock[]
  createdAt: number
}

export interface Book {
  id: string
  title: string
  author: string | null
  format: ImportedBookFormat
  fileName: string
  sourceBlobRef: string
  chapterCount: number
  totalWordCount: number
  lastOpenedAt: number | null
  lastReadChapterIndex: number
  lastReadProgress: number
  createdAt: number
  updatedAt: number
}
