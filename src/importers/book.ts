import type { BookContentBlock, ImportedBookFormat } from '@/entities/book'
import { parseEpubFile } from '@/importers/epub'
import { parseFb2File } from '@/importers/fb2'
import { parseMobiFile } from '@/importers/mobi'

const FILE_EXTENSION_FORMATS = {
  epub: 'epub',
  fb2: 'fb2',
  mobi: 'mobi',
} satisfies Record<string, ImportedBookFormat>

const MIME_TYPE_FORMATS = {
  'application/epub+zip': 'epub',
  'application/x-fictionbook+xml': 'fb2',
  'application/x-mobipocket-ebook': 'mobi',
} satisfies Record<string, ImportedBookFormat>

export const BOOK_INPUT_ACCEPT = [
  '.epub',
  'application/epub+zip',
  '.fb2',
  'application/x-fictionbook+xml',
  'text/xml',
  'application/xml',
  '.mobi',
  'application/x-mobipocket-ebook',
].join(',')

export interface ParsedBookChapter {
  title: string
  sourceHref: string
  wordCount: number
  blocks: BookContentBlock[]
}

export interface ParsedBook {
  author: string | null
  chapters: ParsedBookChapter[]
  fileName: string
  format: ImportedBookFormat
  title: string
  totalWordCount: number
}

function getFileExtension(fileName: string) {
  const extension = fileName.toLowerCase().match(/\.([^.]+)$/)?.[1]
  return extension ?? null
}

export function detectBookFormat(
  file: Pick<File, 'name' | 'type'>,
): ImportedBookFormat {
  const fileExtension = getFileExtension(file.name)

  if (fileExtension && fileExtension in FILE_EXTENSION_FORMATS) {
    return FILE_EXTENSION_FORMATS[fileExtension as keyof typeof FILE_EXTENSION_FORMATS]
  }

  const normalizedMimeType = file.type.toLowerCase()

  if (normalizedMimeType && normalizedMimeType in MIME_TYPE_FORMATS) {
    return MIME_TYPE_FORMATS[normalizedMimeType as keyof typeof MIME_TYPE_FORMATS]
  }

  throw new Error(
    'Unsupported book format. Import a non-DRM EPUB, FB2, or MOBI file.',
  )
}

export async function parseBookFile(file: File): Promise<ParsedBook> {
  const format = detectBookFormat(file)

  if (format === 'fb2') {
    return parseFb2File(file)
  }

  if (format === 'mobi') {
    return parseMobiFile(file)
  }

  return parseEpubFile(file)
}
