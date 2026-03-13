import type { BookContentBlock } from '@/entities/book'
import type { ParsedBook, ParsedBookChapter } from '@/importers/book'
import {
  createParsedChapter,
  getDirectChildByLocalName,
  getDirectChildrenByLocalName,
  getElementText,
  normalizeWhitespace,
  parseXmlDocument,
  stripFileExtension,
} from '@/importers/book-content'

const FB2_MIME_TYPES = new Set([
  'application/x-fictionbook+xml',
  'application/xml',
  'text/xml',
])

function ensureFb2File(file: File) {
  const lowerCaseName = file.name.toLowerCase()
  const normalizedMimeType = file.type.toLowerCase()

  if (
    !lowerCaseName.endsWith('.fb2') &&
    normalizedMimeType &&
    !FB2_MIME_TYPES.has(normalizedMimeType)
  ) {
    throw new Error('Only FB2 files are supported by this parser.')
  }
}

function getNestedChildByPath(root: Element | null, path: string[]) {
  let current = root

  for (const segment of path) {
    if (!current) {
      return null
    }

    current = getDirectChildByLocalName(current, segment)
  }

  return current
}

function getBookTitle(root: Element) {
  return (
    getElementText(
      getNestedChildByPath(root, ['description', 'title-info', 'book-title']),
    ) || null
  )
}

function getBookAuthor(root: Element) {
  const titleInfo = getNestedChildByPath(root, ['description', 'title-info'])

  if (!titleInfo) {
    return null
  }

  const authors = getDirectChildrenByLocalName(titleInfo, 'author')
    .map((author) => {
      const fullName = [
        getElementText(getDirectChildByLocalName(author, 'first-name')),
        getElementText(getDirectChildByLocalName(author, 'middle-name')),
        getElementText(getDirectChildByLocalName(author, 'last-name')),
      ]
        .filter(Boolean)
        .join(' ')

      return (
        fullName ||
        getElementText(getDirectChildByLocalName(author, 'nickname')) ||
        null
      )
    })
    .filter((author): author is string => Boolean(author))

  return authors.length > 0 ? authors.join(', ') : null
}

function getReadableBody(root: Element) {
  const bodies = getDirectChildrenByLocalName(root, 'body')

  return (
    bodies.find((body) => {
      const bodyName = body.getAttribute('name')?.toLowerCase()
      return bodyName !== 'notes' && bodyName !== 'comments'
    }) ??
    bodies[0] ??
    null
  )
}

function getSectionTitle(element: Element) {
  const titleElement = getDirectChildByLocalName(element, 'title')

  if (!titleElement) {
    return null
  }

  const titleParagraph = getDirectChildrenByLocalName(titleElement, 'p')
    .map((paragraph) => getElementText(paragraph))
    .find(Boolean)

  return titleParagraph || getElementText(titleElement) || null
}

function appendQuoteBlocks(element: Element, blocks: BookContentBlock[]) {
  const quoteTagNames = new Set(['p', 'text-author', 'v'])

  const visit = (node: Element) => {
    for (const child of Array.from(node.children)) {
      const localName = child.localName?.toLowerCase() ?? ''

      if (quoteTagNames.has(localName)) {
        const text = getElementText(child)

        if (text) {
          blocks.push({
            type: 'quote',
            text,
          })
        }
        continue
      }

      visit(child)
    }
  }

  visit(element)
}

function extractFb2Blocks(root: Element, sectionDepth: number): BookContentBlock[] {
  const blocks: BookContentBlock[] = []

  const visit = (element: Element, depth: number) => {
    for (const child of Array.from(element.children)) {
      const localName = child.localName?.toLowerCase() ?? ''

      if (localName === 'section') {
        visit(child, depth + 1)
        continue
      }

      if (localName === 'title' || localName === 'subtitle') {
        const titleParts =
          localName === 'title'
            ? getDirectChildrenByLocalName(child, 'p')
                .map((paragraph) => getElementText(paragraph))
                .filter(Boolean)
            : [getElementText(child)].filter(Boolean)

        for (const titlePart of titleParts) {
          blocks.push({
            type: 'heading',
            text: titlePart,
            level: Math.min(Math.max(depth, 1), 6),
          })
        }
        continue
      }

      if (localName === 'epigraph' || localName === 'cite') {
        appendQuoteBlocks(child, blocks)
        continue
      }

      if (localName === 'p' || localName === 'v' || localName === 'text-author') {
        const text = getElementText(child)

        if (text) {
          blocks.push({
            type: 'paragraph',
            text,
          })
        }
        continue
      }

      if (localName === 'li') {
        const text = getElementText(child)

        if (text) {
          blocks.push({
            type: 'list-item',
            text,
          })
        }
        continue
      }

      visit(child, depth)
    }
  }

  visit(root, sectionDepth)

  if (blocks.length > 0) {
    return blocks
  }

  const fallbackText = normalizeWhitespace(root.textContent ?? '')

  return fallbackText
    ? [
        {
          type: 'paragraph',
          text: fallbackText,
        },
      ]
    : []
}

export async function parseFb2File(file: File): Promise<ParsedBook> {
  ensureFb2File(file)

  const document = parseXmlDocument(await file.text(), `FB2 "${file.name}"`)
  const root = document.documentElement
  const title = getBookTitle(root) ?? stripFileExtension(file.name)
  const author = getBookAuthor(root)
  const body = getReadableBody(root)

  if (!body) {
    throw new Error('FB2 does not contain a readable body.')
  }

  const bodySections = getDirectChildrenByLocalName(body, 'section')
  const chapters: ParsedBookChapter[] =
    bodySections.length > 0
      ? bodySections
          .map((section, index) => {
            const blocks = extractFb2Blocks(section, 1)

            if (blocks.length === 0) {
              return null
            }

            return createParsedChapter(
              getSectionTitle(section) ?? `Chapter ${index + 1}`,
              `fb2-section-${index + 1}`,
              blocks,
            )
          })
          .filter((chapter): chapter is ParsedBookChapter => chapter !== null)
      : [
          createParsedChapter(
            title,
            'fb2-body-1',
            extractFb2Blocks(body, 1),
          ),
        ].filter((chapter) => chapter.blocks.length > 0)

  if (chapters.length === 0) {
    throw new Error(
      'No readable FB2 content was found. This slice supports text-first FB2 books without binaries or footnotes.',
    )
  }

  return {
    author,
    chapters,
    fileName: file.name,
    format: 'fb2',
    title,
    totalWordCount: chapters.reduce(
      (wordCount, chapter) => wordCount + chapter.wordCount,
      0,
    ),
  }
}
