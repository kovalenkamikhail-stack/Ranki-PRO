import { unzipSync } from 'fflate'
import type { BookContentBlock, ImportedBookFormat } from '@/entities/book'

const EPUB_MIME_TYPE = 'application/epub+zip'
const SUPPORTED_CHAPTER_MEDIA_TYPES = new Set([
  'application/xhtml+xml',
  'text/html',
])

const textDecoder = new TextDecoder()

export const EPUB_INPUT_ACCEPT = '.epub,application/epub+zip'

export interface ParsedEpubChapter {
  title: string
  sourceHref: string
  wordCount: number
  blocks: BookContentBlock[]
}

export interface ParsedEpubBook {
  author: string | null
  chapters: ParsedEpubChapter[]
  fileName: string
  format: ImportedBookFormat
  title: string
  totalWordCount: number
}

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function getWordCount(value: string) {
  const normalized = normalizeWhitespace(value)

  if (!normalized) {
    return 0
  }

  return normalized.split(' ').length
}

function stripFileExtension(fileName: string) {
  return fileName.replace(/\.[^.]+$/, '')
}

function stripFragmentAndQuery(path: string) {
  return path.split('#')[0]?.split('?')[0] ?? path
}

function normalizeArchivePath(path: string) {
  const normalizedPath = stripFragmentAndQuery(path).replace(/\\/g, '/')
  const segments = normalizedPath.split('/')
  const resolvedSegments: string[] = []

  for (const segment of segments) {
    if (!segment || segment === '.') {
      continue
    }

    if (segment === '..') {
      resolvedSegments.pop()
      continue
    }

    resolvedSegments.push(segment)
  }

  return resolvedSegments.join('/')
}

function resolveArchivePath(basePath: string, relativePath: string) {
  const normalizedRelativePath = stripFragmentAndQuery(relativePath)

  if (!normalizedRelativePath) {
    return normalizeArchivePath(basePath)
  }

  if (normalizedRelativePath.startsWith('/')) {
    return normalizeArchivePath(normalizedRelativePath)
  }

  const baseSegments = normalizeArchivePath(basePath).split('/').filter(Boolean)
  baseSegments.pop()

  return normalizeArchivePath([...baseSegments, normalizedRelativePath].join('/'))
}

function getFirstElementByLocalName(root: Document | Element, localName: string) {
  return (
    (Array.from(root.getElementsByTagName('*')) as Element[]).find(
      (element) => element.localName?.toLowerCase() === localName,
    ) ?? null
  )
}

function readArchiveText(entries: Record<string, Uint8Array>, path: string) {
  const normalizedPath = normalizeArchivePath(path)
  const matchingKey =
    Object.keys(entries).find(
      (entryPath) =>
        normalizeArchivePath(entryPath).toLowerCase() ===
        normalizedPath.toLowerCase(),
    ) ?? null
  const entry = entries[normalizedPath] ?? (matchingKey ? entries[matchingKey] : undefined)

  if (!entry) {
    throw new Error(`EPUB is missing "${normalizedPath}".`)
  }

  return textDecoder.decode(entry)
}

function parseXhtmlDocument(source: string, description: string) {
  const document = new DOMParser().parseFromString(
    source.trimStart(),
    'text/html',
  )

  if (!document.body) {
    throw new Error(`Failed to parse ${description}.`)
  }

  return document
}

function decodeMarkupText(value: string) {
  const document = new DOMParser().parseFromString(`<body>${value}</body>`, 'text/html')
  return normalizeWhitespace(document.body.textContent ?? '')
}

function getAttributeValue(source: string, attributeName: string) {
  const match = source.match(
    new RegExp(`${attributeName}\\s*=\\s*["']([^"']+)["']`, 'i'),
  )

  return match?.[1] ?? null
}

function getTagText(source: string, tagName: string) {
  const match = source.match(
    new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i'),
  )

  return match ? decodeMarkupText(match[1]) : ''
}

function extractRootfilePath(containerSource: string) {
  const rootfileMatch = containerSource.match(/<rootfile\b([^>]*?)\/?>/i)

  if (!rootfileMatch) {
    return null
  }

  return getAttributeValue(rootfileMatch[1] ?? '', 'full-path')
}

function parsePackageManifest(packageSource: string) {
  const manifestItems = new Map<
    string,
    {
      href: string
      mediaType: string
    }
  >()

  for (const match of packageSource.matchAll(/<item\b(?!ref\b)([^>]*?)\/?>/gi)) {
    const attributes = match[1] ?? ''
    const id = getAttributeValue(attributes, 'id')
    const href = getAttributeValue(attributes, 'href')
    const mediaType = getAttributeValue(attributes, 'media-type')

    if (!id || !href || !mediaType) {
      continue
    }

    manifestItems.set(id, {
      href,
      mediaType,
    })
  }

  return manifestItems
}

function parsePackageSpine(packageSource: string) {
  return Array.from(packageSource.matchAll(/<itemref\b([^>]*?)\/?>/gi))
    .map((match) => getAttributeValue(match[1] ?? '', 'idref'))
    .filter((idref): idref is string => Boolean(idref))
}

function extractChapterBlocks(chapterDocument: XMLDocument) {
  const body = getFirstElementByLocalName(chapterDocument, 'body')

  if (!body) {
    return []
  }

  const blocks: BookContentBlock[] = []
  const blockTagNames = new Set([
    'blockquote',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'li',
    'p',
  ])

  const visit = (element: Element) => {
    for (const child of Array.from(element.children)) {
      const localName = child.localName?.toLowerCase() ?? ''

      if (blockTagNames.has(localName)) {
        const text = normalizeWhitespace(child.textContent ?? '')

        if (!text) {
          continue
        }

        if (localName.startsWith('h')) {
          blocks.push({
            type: 'heading',
            text,
            level: Number(localName.slice(1)) || 2,
          })
          continue
        }

        if (localName === 'blockquote') {
          blocks.push({
            type: 'quote',
            text,
          })
          continue
        }

        if (localName === 'li') {
          blocks.push({
            type: 'list-item',
            text,
          })
          continue
        }

        blocks.push({
          type: 'paragraph',
          text,
        })
        continue
      }

      visit(child)
    }
  }

  visit(body)

  if (blocks.length > 0) {
    return blocks
  }

  const fallbackText = normalizeWhitespace(body.textContent ?? '')
  return fallbackText
    ? [
        {
          type: 'paragraph' as const,
          text: fallbackText,
        },
      ]
    : []
}

function getChapterTitle(
  chapterDocument: Document,
  blocks: BookContentBlock[],
  fallbackSourceHref: string,
) {
  const firstHeading = blocks.find((block) => block.type === 'heading')

  if (firstHeading) {
    return firstHeading.text
  }

  const documentTitle =
    normalizeWhitespace(chapterDocument.querySelector('title')?.textContent ?? '')

  if (documentTitle) {
    return documentTitle
  }

  return stripFileExtension(fallbackSourceHref.split('/').pop() ?? fallbackSourceHref)
}

function ensureEpubFile(file: File) {
  const lowerCaseName = file.name.toLowerCase()

  if (
    !lowerCaseName.endsWith('.epub') &&
    file.type &&
    file.type !== EPUB_MIME_TYPE
  ) {
    throw new Error('Only EPUB files are supported in this first book-reader slice.')
  }
}

export async function parseEpubFile(file: File): Promise<ParsedEpubBook> {
  ensureEpubFile(file)

  const entries = unzipSync(new Uint8Array(await file.arrayBuffer()))
  const containerSource = readArchiveText(entries, 'META-INF/container.xml')
  const packagePath = extractRootfilePath(containerSource)

  if (!packagePath) {
    throw new Error('EPUB is missing the package document path.')
  }

  const packageSource = readArchiveText(entries, packagePath)
  const manifest = parsePackageManifest(packageSource)
  const spine = parsePackageSpine(packageSource)

  if (spine.length === 0) {
    throw new Error('EPUB does not contain a readable spine.')
  }

  const title = getTagText(packageSource, 'dc:title') || stripFileExtension(file.name)
  const author = getTagText(packageSource, 'dc:creator') || null
  const chapters: ParsedEpubChapter[] = []

  for (const idref of spine) {
    const manifestItem = manifest.get(idref)

    if (!manifestItem || !SUPPORTED_CHAPTER_MEDIA_TYPES.has(manifestItem.mediaType)) {
      continue
    }

    const chapterPath = resolveArchivePath(packagePath, manifestItem.href)
    const chapterDocument = parseXhtmlDocument(
      readArchiveText(entries, chapterPath),
      `EPUB chapter "${manifestItem.href}"`,
    )
    const blocks = extractChapterBlocks(chapterDocument)

    if (blocks.length === 0) {
      continue
    }

    const chapterText = blocks.map((block) => block.text).join(' ')
    chapters.push({
      title: getChapterTitle(chapterDocument, blocks, manifestItem.href),
      sourceHref: manifestItem.href,
      wordCount: getWordCount(chapterText),
      blocks,
    })
  }

  if (chapters.length === 0) {
    throw new Error(
      'No readable EPUB chapters were found. This first slice supports text-first, non-DRM EPUB 2/3 books.',
    )
  }

  return {
    author,
    chapters,
    fileName: file.name,
    format: 'epub',
    title,
    totalWordCount: chapters.reduce(
      (wordCount, chapter) => wordCount + chapter.wordCount,
      0,
    ),
  }
}
