import { afterEach, describe, expect, it, vi } from 'vitest'
import { RankiDb } from '@/db/app-db'
import {
  getBookWithChapters,
  importBook,
  listBooks,
  markBookOpened,
  saveBookProgress,
} from '@/db/books'

const { nowMsMock } = vi.hoisted(() => ({
  nowMsMock: vi.fn(),
}))

vi.mock('@/lib/time', () => ({
  nowMs: nowMsMock,
}))

const VALID_EPUB_BASE64 =
  'UEsDBBQAAAAIANIRaVxvYassFgAAABQAAAAIAAAAbWltZXR5cGVLLCjIyUxOLMnMz9NPLShN0q7KLAAAUEsDBBQAAAAIANIRaVwCqdJqrgAAAPsAAAAWAAAATUVUQS1JTkYvY29udGFpbmVyLnhtbF2OwQrCMBBE735F2Ku01ZuEpgVBrwrqB8R0W4PpbmhS0b837UGKx4GZ96as370TLxyCZVKwzTcgkAw3ljoFt+sx20FdrUrDFLUlHP66aU1BwTiQZB1skKR7DDIayR6pYTP2SFHONfmDQLUSohyYY2sdhiktsmhH5zKv40PB6bA/X4ppmDA5+xZEj43VWfx4VKC9d9bomA4VjHcf0sw8dYfrZIRi1hQLTzmj5g/VF1BLAwQUAAAACADSEWlc4Oe+VwkBAAAdAgAAEQAAAE9FQlBTL2NvbnRlbnQub3BmlZFLTsMwFEXnXYXlKUqchAEoclLBgBWUBVj2S2LVPzmvpOweN5/SIhgwfT73+D6b78/WkA+Io/auoWVeUAJOeqVd39D3w1v2TPftjgchj6IHkmg3NnRADDVj0zTlWoUu97FnVVE8MR86+q17TLp2Rwi3gEIJFEu+VvKqCKdo5riSDAxYcDiyMi/ZHExRJWvUaKA9wIjk1fsjT+w6uyIygkAfF+jlhIOPM7bNLyXY1mKpJJzuEr06NIIlWjVUDiIgxKykZIjQ3Qzy84DWUGJBaZHhZ4CGihCMlgLTumw+fkgbUvaXtPoprf4pTUvc9OZj0G57hctlyZ3uu6991+YXoNrMq4yz9bPbL1BLAwQUAAAACADSEWlc2MSxx8oAAAA+AQAAFQAAAE9FQlBTL2NoYXB0ZXItMS54aHRtbFWPwW7DIAyG730Ki/vCol2WyaGHSb3usO0BGPECWgYIrKZ9+zqNqqYnbPg//Bn3p/8JjlRqSLFXbfOsgKJLQ4hjr76/Dk+vam926FliEo21V545v2k9z3MzvzSpjLrtuk6flowyOwD0ZAeDHHgi8+5tZirwEQn1eoX6GliSP2k4L4WUlRyLxNotn7SPrPS3p2wOoVSGbIsdi80e0i+wJ0iZopiDW8EGdd5An+RSHDbUH1GuV7CIkAySYwqVg7uTqDdiqFdhsZFlzQVQSwMEFAAAAAgA0hFpXJk9FyPYAAAAbQEAABUAAABPRUJQUy9jaGFwdGVyLTIueGh0bWxtkMFOwzAMhu97Cit3agYXitxMCIkrB8YDbI1ZItJktB4Zb4/bqtIm7RT/9u8vtmlz7iL8cj+EnBqzru4NcGqzC+nQmM/t292T2dgVeVGbWtPQGC9yfEYspVTlscr9Add1XeN59Bi7AiDPO2dJgkS2r353FO5hWzLhnCKcDKNzn93fGGg4cCs6xKxGyMN1r+qltI+5/f45ZWH7AtPrIIbE8NXnDsQzKCwnB+0MqAgvWhbKKS6hihjsuwJiGASCcEeomavyx4y86SBcYIQXe+i30346vN7G/gNQSwECFAAUAAAACADSEWlcb2GrLBYAAAAUAAAACAAAAAAAAAAAAAAAAAAAAAAAbWltZXR5cGVQSwECFAAUAAAACADSEWlcAqnSaq4AAAD7AAAAFgAAAAAAAAAAAAAAAAA8AAAATUVUQS1JTkYvY29udGFpbmVyLnhtbFBLAQIUABQAAAAIANIRaVzg575XCQEAAB0CAAARAAAAAAAAAAAAAAAAAB4BAABPRUJQUy9jb250ZW50Lm9wZlBLAQIUABQAAAAIANIRaVzYxLHHygAAAD4BAAAVAAAAAAAAAAAAAAAAAFYCAABPRUJQUy9jaGFwdGVyLTEueGh0bWxQSwECFAAUAAAACADSEWlcmT0XI9gAAABtAQAAFQAAAAAAAAAAAAAAAABTAwAAT0VCUFMvY2hhcHRlci0yLnhodG1sUEsFBgAAAAAFAAUAPwEAAF4EAAAAAA=='

const VALID_FB2 = `<?xml version="1.0" encoding="utf-8"?>
<FictionBook>
  <description>
    <title-info>
      <book-title>Stored FB2</book-title>
      <author>
        <first-name>Casey</first-name>
        <last-name>Reader</last-name>
      </author>
    </title-info>
  </description>
  <body>
    <section>
      <title><p>Opening</p></title>
      <p>First FB2 paragraph.</p>
    </section>
    <section>
      <title><p>Follow-up</p></title>
      <p>Second FB2 paragraph.</p>
    </section>
  </body>
</FictionBook>`

const LEGACY_EPUB_BASE64 =
  'UEsDBBQAAAAIALNhbVxvYassFgAAABQAAAAIAAAAbWltZXR5cGVLLCjIyUxOLMnMz9NPLShN0q7KLAAAUEsDBBQAAAAIALNhbVxXuJqXrQAAAPwAAAAWAAAATUVUQS1JTkYvY29udGFpbmVyLnhtbF2OzQrCMBCE732KsFdpqzcJ/QHBs4JPENNtDaa7IUlF3940BykeB2a+b5r+PVvxQh8MUwuHag8CSfNgaGphiWN5hL4rGs0UlSH0f920ppCKniSrYIIkNWOQUUt2SAPrZUaKMtfkDwJdIUTjmeNoLIY1bbIYF2tLp+Kjhcv5dL3V6zBhKnYjiBkHo8r4cdiCcs4arWI6VDPeXUgz/VQT7pIRRJ099UbUZFY+0X0BUEsDBBQAAAAIALNhbVxqE1fk/wAAAKkBAAARAAAAT0VCUFMvY29udGVudC5vcGZNkcFugzAQRO/9Cst3cMilEgIOldprq0r9AGOvwyrGds1S6N/HIQ7iOp6ZN9Y2QaqrvABbR+umlg9EoRZiWZYSdTCljxdxPp1ehQ+Gsz+IE3rX8nN54mx2+DtDgRocoUGILe+9vyaBdy+MNSOQ1JLko7vWaq8Pc7RbtVYCLIypYBJVWYktmKJa1YRkofuQ1vZpInv/+nlrkj/ru01FkORj92mMRQfsG6SGuDmfT/ct4jnmsUw6NDBRrkGCkaFuuRpkIIhFxdkQwbScYCWxq+U60Gg5G0GjLOg/QHashYe+KrRX8/0vnIkMPXCaKaR9B2ICJOiGOXBzMpsbke/T3QBQSwMEFAAAAAgAs2FtXDEUGQqMAAAAowAAABoAAABPRUJQUy90ZXh0L2NoYXB0ZXItMS54aHRtbCWNQQrCMBAAv7L4gC7FU2XNQVA8KIgoeE2baIqbbkhXUn9vi9dhhqGgkWGKPIzbVVBNG8RSSlXWleQX1k3T4LQ4K0OtuK+hUJuDZW5t94Yu2KQ+E86Qkrl662zLHh7H2/kEnQzqB4UxyIcdjNozQx+TZIVnlgjCzmfYX+47iF7nVm1FmAzhf4XL2PwAUEsBAhQAFAAAAAgAs2FtXG9hqywWAAAAFAAAAAgAAAAAAAAAAAAAAAAAAAAAAG1pbWV0eXBlUEsBAhQAFAAAAAgAs2FtXFe4mpetAAAA/AAAABYAAAAAAAAAAAAAAAAAPAAAAE1FVEEtSU5GL2NvbnRhaW5lci54bWxQSwECFAAUAAAACACzYW1cahNX5P8AAACpAQAAEQAAAAAAAAAAAAAAAAAdAQAAT0VCUFMvY29udGVudC5vcGZQSwECFAAUAAAACACzYW1cMRQZCowAAACjAAAAGgAAAAAAAAAAAAAAAABLAgAAT0VCUFMvdGV4dC9jaGFwdGVyLTEueGh0bWxQSwUGAAAAAAQABAABAQAADwMAAAAA'

function decodeBase64(base64: string) {
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0))
}

function createTestEpubFile() {
  return new File([decodeBase64(VALID_EPUB_BASE64)], 'stored-book.epub', {
    type: 'application/epub+zip',
  })
}

function createTestFb2File() {
  return new File([VALID_FB2], 'stored-book.fb2', {
    type: 'text/xml',
  })
}

function createLegacyMediaTypeEpubFile() {
  return new File([decodeBase64(LEGACY_EPUB_BASE64)], 'fallback-book.epub', {
    type: 'application/epub+zip',
  })
}

describe('book persistence', () => {
  let database: RankiDb | undefined

  afterEach(async () => {
    nowMsMock.mockReset()

    if (database) {
      await database.delete()
      database = undefined
    }
  })

  it('imports an epub into local book and chapter records', async () => {
    database = new RankiDb(`ranki-books-${crypto.randomUUID()}`)
    nowMsMock.mockReturnValue(1_000)

    const imported = await importBook(createTestEpubFile(), database)
    const listedBooks = await listBooks(database)
    const stored = await getBookWithChapters(imported.book.id, database)

    expect(imported.book.title).toBe('Test Book')
    expect(imported.book.author).toBe('Test Author')
    expect(imported.book.format).toBe('epub')
    expect(imported.book.chapterCount).toBe(2)
    expect(imported.book.sourceBlobRef).toMatch(/^book-blob:/)
    expect(imported.chapters).toHaveLength(2)
    expect(imported.chapters[0]?.title).toBe('Chapter One')
    expect(listedBooks).toEqual([imported.book])
    expect(stored?.chapters[1]?.title).toBe('Chapter Two')
  })

  it('imports an fb2 book into the existing book and chapter tables', async () => {
    database = new RankiDb(`ranki-books-${crypto.randomUUID()}`)
    nowMsMock.mockReturnValue(1_000)

    const imported = await importBook(createTestFb2File(), database)
    const stored = await getBookWithChapters(imported.book.id, database)

    expect(imported.book.title).toBe('Stored FB2')
    expect(imported.book.author).toBe('Casey Reader')
    expect(imported.book.format).toBe('fb2')
    expect(imported.book.chapterCount).toBe(2)
    expect(imported.chapters[0]?.title).toBe('Opening')
    expect(stored?.chapters[1]?.title).toBe('Follow-up')
  })

  it('imports text-first epub chapters that rely on the chapter href instead of a canonical media type', async () => {
    database = new RankiDb(`ranki-books-${crypto.randomUUID()}`)
    nowMsMock.mockReturnValue(1_000)

    const imported = await importBook(createLegacyMediaTypeEpubFile(), database)
    const stored = await getBookWithChapters(imported.book.id, database)

    expect(imported.book.title).toBe('Fallback EPUB')
    expect(imported.book.author).toBe('Offline Reader')
    expect(imported.book.chapterCount).toBe(1)
    expect(imported.chapters[0]?.title).toBe('Fallback chapter')
    expect(imported.chapters[0]?.sourceHref).toBe('text/chapter-1.xhtml')
    expect(stored?.chapters[0]?.blocks).toEqual(
      expect.arrayContaining([
        {
          type: 'paragraph',
          text: 'Readable XHTML content should still import from older EPUB metadata.',
        },
      ]),
    )
  })

  it('persists last-opened and chapter-aware reading progress', async () => {
    database = new RankiDb(`ranki-books-${crypto.randomUUID()}`)
    nowMsMock
      .mockReturnValueOnce(1_000)
      .mockReturnValueOnce(2_000)
      .mockReturnValueOnce(3_000)

    const imported = await importBook(createTestEpubFile(), database)
    const openedBook = await markBookOpened(imported.book.id, database)
    const updatedBook = await saveBookProgress(imported.book.id, 1, 1.4, database)

    expect(openedBook.lastOpenedAt).toBe(2_000)
    expect(updatedBook.lastReadChapterIndex).toBe(1)
    expect(updatedBook.lastReadProgress).toBe(1)
    expect(updatedBook.updatedAt).toBe(3_000)
  })
})
