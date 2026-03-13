import { unzipSync } from 'fflate'
import type { ParsedBook } from '@/importers/book'
import {
  createParsedChapter,
  extractHtmlBlocks,
  getFirstElementByLocalName,
  getHtmlChapterTitle,
  normalizeWhitespace,
  parseHtmlDocument,
  parseXmlDocument,
  stripFileExtension,
} from '@/importers/book-content'

const EPUB_MIME_TYPE = 'application/epub+zip'
const SUPPORTED_CHAPTER_MEDIA_TYPES = new Set([
  'application/xhtml+xml',
  'text/html',
])

const textDecoder = new TextDecoder()

export const EPUB_INPUT_ACCEPT = '.epub,application/epub+zip'

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

function normalizeMediaType(mediaType: string | null) {
  if (!mediaType) {
    return null
  }

  const normalized = mediaType.split(';')[0]?.trim().toLowerCase() ?? ''
  return normalized || null
}

function hasReadableChapterHref(href: string) {
  return /\.(xhtml|html|htm)$/i.test(stripFragmentAndQuery(href))
}

function getAttributeValue(source: string, attributeName: string) {
  const match = source.match(
    new RegExp(`${attributeName}\\s*=\\s*["']([^"']+)["']`, 'i'),
  )

  return match?.[1]?.trim() ?? null
}

function decodeMarkupText(value: string) {
  const document = new DOMParser().parseFromString(`<body>${value}</body>`, 'text/html')
  return normalizeWhitespace(document.body.textContent ?? '')
}

function getTagText(source: string, tagName: string) {
  const match = source.match(
    new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i'),
  )

  return match ? decodeMarkupText(match[1] ?? '') : ''
}

function stripXmlNamespaces(source: string) {
  return source
    .replace(/\sxmlns(?::[\w-]+)?=(["']).*?\1/gi, '')
    .replace(/(<\/?)([\w-]+):/g, '$1')
}

function parsePackageManifestFallback(packageSource: string) {
  const manifestItems = new Map<
    string,
    {
      href: string
      mediaType: string | null
    }
  >()

  for (const match of packageSource.matchAll(/<item\b(?!ref\b)([^>]*?)\/?>/gi)) {
    const attributes = match[1] ?? ''
    const id = getAttributeValue(attributes, 'id')
    const href = getAttributeValue(attributes, 'href')

    if (!id || !href) {
      continue
    }

    manifestItems.set(id, {
      href,
      mediaType: normalizeMediaType(getAttributeValue(attributes, 'media-type')),
    })
  }

  return manifestItems
}

function parsePackageSpineFallback(packageSource: string) {
  return Array.from(packageSource.matchAll(/<itemref\b([^>]*?)\/?>/gi))
    .map((match) => getAttributeValue(match[1] ?? '', 'idref'))
    .filter((idref): idref is string => Boolean(idref))
}

function extractRootfilePath(containerSource: string) {
  try {
    const containerDocument = parseXmlDocument(containerSource, 'EPUB container')
    const rootfile = getFirstElementByLocalName(containerDocument, 'rootfile')
    const rootfilePath = rootfile?.getAttribute('full-path')?.trim() || null

    if (rootfilePath) {
      return rootfilePath
    }
  } catch {
    // Fall back to a minimal container.xml attribute read if the XML parser rejects
    // an otherwise simple container document.
  }

  const rootfileMatch = containerSource.match(/<[\w:-]*rootfile\b([^>]*?)\/?>/i)
  return rootfileMatch ? getAttributeValue(rootfileMatch[1] ?? '', 'full-path') : null
}

function parsePackageDocument(packageSource: string) {
  const strippedPackageSource = stripXmlNamespaces(packageSource)

  return {
    title: getTagText(strippedPackageSource, 'title'),
    author: getTagText(strippedPackageSource, 'creator') || null,
    manifest: parsePackageManifestFallback(strippedPackageSource),
    spine: parsePackageSpineFallback(strippedPackageSource),
  }
}

function isReadableChapterManifestItem(manifestItem: {
  href: string
  mediaType: string | null
}) {
  return (
    (manifestItem.mediaType !== null &&
      SUPPORTED_CHAPTER_MEDIA_TYPES.has(manifestItem.mediaType)) ||
    hasReadableChapterHref(manifestItem.href)
  )
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

export async function parseEpubFile(file: File): Promise<ParsedBook> {
  ensureEpubFile(file)

  const entries = unzipSync(new Uint8Array(await file.arrayBuffer()))
  const containerSource = readArchiveText(entries, 'META-INF/container.xml')
  const packagePath = extractRootfilePath(containerSource)

  if (!packagePath) {
    throw new Error('EPUB is missing the package document path.')
  }

  const packageSource = readArchiveText(entries, packagePath)
  const packageDocument = parsePackageDocument(packageSource)
  const { author, manifest, spine } = packageDocument

  if (spine.length === 0) {
    throw new Error('EPUB does not contain a readable spine.')
  }

  const title = packageDocument.title || stripFileExtension(file.name)
  const chapters: ParsedBook['chapters'] = []

  for (const idref of spine) {
    const manifestItem = manifest.get(idref)

    if (!manifestItem || !isReadableChapterManifestItem(manifestItem)) {
      continue
    }

    const chapterPath = resolveArchivePath(packagePath, manifestItem.href)
    const chapterDocument = parseHtmlDocument(
      readArchiveText(entries, chapterPath),
      `EPUB chapter "${manifestItem.href}"`,
    )
    const blocks = extractHtmlBlocks(chapterDocument)

    if (blocks.length === 0) {
      continue
    }

    chapters.push(
      createParsedChapter(
        getHtmlChapterTitle(chapterDocument, blocks, manifestItem.href),
        manifestItem.href,
        blocks,
      ),
    )
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
    totalWordCount: chapters.reduce((wordCount, chapter) => wordCount + chapter.wordCount, 0),
  }
}
