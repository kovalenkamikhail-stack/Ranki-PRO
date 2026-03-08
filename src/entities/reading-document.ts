export type ReadingDocumentSourceKind = 'pasted_text'

export const READING_WORDS_PER_MINUTE = 220

export interface ReadingDocument {
  id: string
  title: string
  bodyText: string
  sourceKind: ReadingDocumentSourceKind
  wordCount: number
  lastOpenedAt: number | null
  lastReadProgress: number
  createdAt: number
  updatedAt: number
}
