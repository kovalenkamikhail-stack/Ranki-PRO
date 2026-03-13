import { beforeEach, describe, expect, it, vi } from 'vitest'
import { parseMobiFile } from '@/importers/mobi'

const { initMobiFileMock } = vi.hoisted(() => ({
  initMobiFileMock: vi.fn(),
}))

vi.mock('@lingo-reader/mobi-parser', () => ({
  initMobiFile: initMobiFileMock,
}))

describe('parseMobiFile', () => {
  beforeEach(() => {
    initMobiFileMock.mockReset()
  })

  it('normalizes mobi chapters into the shared text-first block model', async () => {
    const destroyMock = vi.fn()

    initMobiFileMock.mockResolvedValue({
      destroy: destroyMock,
      getMetadata: () => ({
        identifier: 'mobi-1',
        title: 'Mobi Test',
        author: ['A. Writer'],
        publisher: '',
        language: 'en',
        published: '',
        description: '',
        subject: [],
        rights: '',
        contributor: [],
      }),
      getSpine: () => [
        { id: 'chapter-1', text: '', start: 0, end: 100, size: 100 },
        { id: 'chapter-2', text: '', start: 100, end: 200, size: 100 },
      ],
      getToc: () => [
        { label: 'Part One', href: 'toc-1' },
        { label: 'Part Two', href: 'toc-2' },
      ],
      loadChapter: (id: string) =>
        id === 'chapter-1'
          ? {
              html: '<h1>Chapter 1</h1><p>Lead paragraph.</p>',
              css: [],
            }
          : {
              html: '<blockquote>Quote line.</blockquote><ul><li>List row</li></ul>',
              css: [],
            },
      resolveHref: (href: string) =>
        href === 'toc-1'
          ? { id: 'chapter-1', selector: '#start' }
          : { id: 'chapter-2', selector: '#start' },
    })

    const parsed = await parseMobiFile(
      new File(['mobi-binary'], 'novel.mobi', {
        type: 'application/x-mobipocket-ebook',
      }),
    )

    expect(parsed.title).toBe('Mobi Test')
    expect(parsed.author).toBe('A. Writer')
    expect(parsed.format).toBe('mobi')
    expect(parsed.chapters).toHaveLength(2)
    expect(parsed.chapters[0]?.title).toBe('Part One')
    expect(parsed.chapters[0]?.blocks).toEqual([
      {
        type: 'heading',
        text: 'Chapter 1',
        level: 1,
      },
      {
        type: 'paragraph',
        text: 'Lead paragraph.',
      },
    ])
    expect(parsed.chapters[1]?.blocks).toEqual(
      expect.arrayContaining([
        {
          type: 'quote',
          text: 'Quote line.',
        },
        {
          type: 'list-item',
          text: 'List row',
        },
      ]),
    )
    expect(destroyMock).toHaveBeenCalledTimes(1)
  })

  it('rejects mobi files without a readable spine', async () => {
    initMobiFileMock.mockResolvedValue({
      destroy: vi.fn(),
      getMetadata: () => ({
        identifier: 'mobi-2',
        title: 'Empty',
        author: [],
        publisher: '',
        language: 'en',
        published: '',
        description: '',
        subject: [],
        rights: '',
        contributor: [],
      }),
      getSpine: () => [],
      getToc: () => [],
      loadChapter: () => undefined,
      resolveHref: () => undefined,
    })

    await expect(
      parseMobiFile(
        new File(['mobi-binary'], 'empty.mobi', {
          type: 'application/x-mobipocket-ebook',
        }),
      ),
    ).rejects.toThrow('MOBI does not contain a readable spine.')
  })

  it('wraps unexpected mobi parser failures in a clear import error', async () => {
    initMobiFileMock.mockRejectedValue(new Error('Offset is outside the bounds of the DataView'))

    await expect(
      parseMobiFile(
        new File(['mobi-binary'], 'broken.mobi', {
          type: 'application/x-mobipocket-ebook',
        }),
      ),
    ).rejects.toThrow(
      'Failed to parse the MOBI file. This slice supports text-first, non-DRM MOBI books only when readable chapters can be extracted.',
    )
  })
})
