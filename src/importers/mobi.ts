import {
  initMobiFile,
  type MobiResolvedHref,
  type MobiToc,
} from '@lingo-reader/mobi-parser'
import type { ParsedBook, ParsedBookChapter } from '@/importers/book'
import {
  createParsedChapter,
  extractHtmlBlocks,
  getHtmlChapterTitle,
  normalizeWhitespace,
  parseHtmlDocument,
  stripFileExtension,
} from '@/importers/book-content'

const MOBI_MIME_TYPE = 'application/x-mobipocket-ebook'

function ensureMobiFile(file: File) {
  const lowerCaseName = file.name.toLowerCase()
  const normalizedMimeType = file.type.toLowerCase()

  if (
    !lowerCaseName.endsWith('.mobi') &&
    normalizedMimeType &&
    normalizedMimeType !== MOBI_MIME_TYPE
  ) {
    throw new Error('Only MOBI files are supported by this parser.')
  }
}

function collectTocTitles(
  toc: MobiToc,
  resolveHref: (href: string) => MobiResolvedHref | undefined,
) {
  const chapterTitles = new Map<string, string>()

  const visit = (items: MobiToc) => {
    for (const item of items) {
      const resolvedHref = resolveHref(item.href)
      const label = normalizeWhitespace(item.label)

      if (resolvedHref && label && !chapterTitles.has(resolvedHref.id)) {
        chapterTitles.set(resolvedHref.id, label)
      }

      if (item.children) {
        visit(item.children)
      }
    }
  }

  visit(toc)
  return chapterTitles
}

export async function parseMobiFile(file: File): Promise<ParsedBook> {
  ensureMobiFile(file)

  let mobi: Awaited<ReturnType<typeof initMobiFile>> | null = null

  try {
    const loadedMobi = await initMobiFile(file)
    mobi = loadedMobi
    const metadata = loadedMobi.getMetadata()
    const spine = loadedMobi.getSpine()

    if (spine.length === 0) {
      throw new Error('MOBI does not contain a readable spine.')
    }

    const chapterTitles = collectTocTitles(
      loadedMobi.getToc(),
      loadedMobi.resolveHref.bind(loadedMobi),
    )
    const chapters: ParsedBookChapter[] = spine
      .map((spineChapter, index) => {
        const processedChapter = loadedMobi.loadChapter(spineChapter.id)

        if (!processedChapter) {
          return null
        }

        const chapterDocument = parseHtmlDocument(
          processedChapter.html,
          `MOBI chapter "${spineChapter.id}"`,
        )
        const blocks = extractHtmlBlocks(chapterDocument)

        if (blocks.length === 0) {
          return null
        }

        return createParsedChapter(
          chapterTitles.get(spineChapter.id) ??
            getHtmlChapterTitle(chapterDocument, blocks, `chapter-${index + 1}`),
          spineChapter.id,
          blocks,
        )
      })
      .filter((chapter): chapter is ParsedBookChapter => chapter !== null)

    if (chapters.length === 0) {
      throw new Error(
        'No readable MOBI chapters were found. This slice supports text-first, non-DRM MOBI books.',
      )
    }

    const authors = (metadata.author ?? [])
      .map((author) => normalizeWhitespace(author))
      .filter(Boolean)

    return {
      author: authors.length > 0 ? authors.join(', ') : null,
      chapters,
      fileName: file.name,
      format: 'mobi',
      title: normalizeWhitespace(metadata.title) || stripFileExtension(file.name),
      totalWordCount: chapters.reduce(
        (wordCount, chapter) => wordCount + chapter.wordCount,
        0,
      ),
    }
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message === 'MOBI does not contain a readable spine.' ||
        error.message.startsWith('No readable MOBI chapters were found.'))
    ) {
      throw error
    }

    throw new Error(
      'Failed to parse the MOBI file. This slice supports text-first, non-DRM MOBI books only when readable chapters can be extracted.',
    )
  } finally {
    mobi?.destroy()
  }
}
