import type { BookContentBlock } from '@/entities/book'
import type { ParsedBookChapter } from '@/importers/book'

const HTML_BLOCK_TAG_NAMES = new Set([
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

export function normalizeWhitespace(value: string) {
  return value.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim()
}

export function getWordCount(value: string) {
  const normalized = normalizeWhitespace(value)

  if (!normalized) {
    return 0
  }

  return normalized.split(' ').length
}

export function getBlocksWordCount(blocks: BookContentBlock[]) {
  return getWordCount(blocks.map((block) => block.text).join(' '))
}

export function stripFileExtension(fileName: string) {
  return fileName.replace(/\.[^.]+$/, '')
}

export function getFirstElementByLocalName(
  root: Document | Element,
  localName: string,
) {
  return (
    (Array.from(root.getElementsByTagName('*')) as Element[]).find(
      (element) => element.localName?.toLowerCase() === localName,
    ) ?? null
  )
}

export function getDirectChildByLocalName(
  parent: Element,
  localName: string,
) {
  return (
    Array.from(parent.children).find(
      (child) => child.localName?.toLowerCase() === localName,
    ) ?? null
  )
}

export function getDirectChildrenByLocalName(
  parent: Element,
  localName: string,
) {
  return Array.from(parent.children).filter(
    (child) => child.localName?.toLowerCase() === localName,
  )
}

export function getElementText(element: Element | null | undefined) {
  return normalizeWhitespace(element?.textContent ?? '')
}

export function parseHtmlDocument(source: string, description: string) {
  const normalizedSource = source.trimStart()

  try {
    const xmlDocument = parseXmlDocument(normalizedSource, description)

    if (getFirstElementByLocalName(xmlDocument, 'body')) {
      return xmlDocument
    }
  } catch {
    // Fall back to HTML parsing for looser markup that is not well-formed XML/XHTML.
  }

  const document = new DOMParser().parseFromString(
    normalizedSource.replace(/^<\?xml[^>]*>\s*/i, ''),
    'text/html',
  )

  if (!document.body) {
    throw new Error(`Failed to parse ${description}.`)
  }

  return document
}

export function parseXmlDocument(source: string, description: string) {
  const document = new DOMParser().parseFromString(
    source.trimStart(),
    'application/xml',
  )
  const hasParserError = Array.from(document.getElementsByTagName('*')).some(
    (element) => element.localName?.toLowerCase() === 'parsererror',
  )

  if (hasParserError) {
    throw new Error(`Failed to parse ${description}.`)
  }

  return document
}

export function extractHtmlBlocks(root: Document | Element) {
  const body =
    root instanceof Document
      ? root.body ?? getFirstElementByLocalName(root, 'body')
      : root.localName?.toLowerCase() === 'body'
        ? root
        : (getFirstElementByLocalName(root, 'body') ?? root)

  if (!body) {
    return []
  }

  const blocks: BookContentBlock[] = []

  const visit = (element: Element) => {
    for (const child of Array.from(element.children)) {
      const localName = child.localName?.toLowerCase() ?? ''

      if (HTML_BLOCK_TAG_NAMES.has(localName)) {
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

export function getHtmlChapterTitle(
  chapterDocument: Document,
  blocks: BookContentBlock[],
  fallbackSourceHref: string,
) {
  const firstHeading = blocks.find((block) => block.type === 'heading')

  if (firstHeading) {
    return firstHeading.text
  }

  const documentTitle = getElementText(
    getFirstElementByLocalName(chapterDocument, 'title'),
  )

  if (documentTitle) {
    return documentTitle
  }

  return stripFileExtension(fallbackSourceHref.split('/').pop() ?? fallbackSourceHref)
}

export function createParsedChapter(
  title: string,
  sourceHref: string,
  blocks: BookContentBlock[],
): ParsedBookChapter {
  return {
    title,
    sourceHref,
    wordCount: getBlocksWordCount(blocks),
    blocks,
  }
}
