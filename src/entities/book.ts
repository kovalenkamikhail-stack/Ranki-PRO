export type ImportedBookFormat = 'epub'

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
