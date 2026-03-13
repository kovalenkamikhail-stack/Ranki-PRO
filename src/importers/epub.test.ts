import { describe, expect, it } from 'vitest'
import { parseEpubFile } from '@/importers/epub'

const VALID_EPUB_BASE64 =
  'UEsDBBQAAAAIANIRaVxvYassFgAAABQAAAAIAAAAbWltZXR5cGVLLCjIyUxOLMnMz9NPLShN0q7KLAAAUEsDBBQAAAAIANIRaVwCqdJqrgAAAPsAAAAWAAAATUVUQS1JTkYvY29udGFpbmVyLnhtbF2OwQrCMBBE735F2Ku01ZuEpgVBrwrqB8R0W4PpbmhS0b837UGKx4GZ96as370TLxyCZVKwzTcgkAw3ljoFt+sx20FdrUrDFLUlHP66aU1BwTiQZB1skKR7DDIayR6pYTP2SFHONfmDQLUSohyYY2sdhiktsmhH5zKv40PB6bA/X4ppmDA5+xZEj43VWfx4VKC9d9bomA4VjHcf0sw8dYfrZIRi1hQLTzmj5g/VF1BLAwQUAAAACADSEWlc4Oe+VwkBAAAdAgAAEQAAAE9FQlBTL2NvbnRlbnQub3BmlZFLTsMwFEXnXYXlKUqchAEoclLBgBWUBVj2S2LVPzmvpOweN5/SIhgwfT73+D6b78/WkA+Io/auoWVeUAJOeqVd39D3w1v2TPftjgchj6IHkmg3NnRADDVj0zTlWoUu97FnVVE8MR86+q17TLp2Rwi3gEIJFEu+VvKqCKdo5riSDAxYcDiyMi/ZHExRJWvUaKA9wIjk1fsjT+w6uyIygkAfF+jlhIOPM7bNLyXY1mKpJJzuEr06NIIlWjVUDiIgxKykZIjQ3Qzy84DWUGJBaZHhZ4CGihCMlgLTumw+fkgbUvaXtPoprf4pTUvc9OZj0G57hctlyZ3uu6991+YXoNrMq4yz9bPbL1BLAwQUAAAACADSEWlc2MSxx8oAAAA+AQAAFQAAAE9FQlBTL2NoYXB0ZXItMS54aHRtbFWPwW7DIAyG730Ki/vCol2WyaGHSb3usO0BGPECWgYIrKZ9+zqNqqYnbPg//Bn3p/8JjlRqSLFXbfOsgKJLQ4hjr76/Dk+vam926FliEo21V545v2k9z3MzvzSpjLrtuk6flowyOwD0ZAeDHHgi8+5tZirwEQn1eoX6GliSP2k4L4WUlRyLxNotn7SPrPS3p2wOoVSGbIsdi80e0i+wJ0iZopiDW8EGdd5An+RSHDbUH1GuV7CIkAySYwqVg7uTqDdiqFdhsZFlzQVQSwMEFAAAAAgA0hFpXJk9FyPYAAAAbQEAABUAAABPRUJQUy9jaGFwdGVyLTIueGh0bWxtkMFOwzAMhu97Cit3agYXitxMCIkrB8YDbI1ZItJktB4Zb4/bqtIm7RT/9u8vtmlz7iL8cj+EnBqzru4NcGqzC+nQmM/t292T2dgVeVGbWtPQGC9yfEYspVTlscr9Add1XeN59Bi7AiDPO2dJgkS2r353FO5hWzLhnCKcDKNzn93fGGg4cCs6xKxGyMN1r+qltI+5/f45ZWH7AtPrIIbE8NXnDsQzKCwnB+0MqAgvWhbKKS6hihjsuwJiGASCcEeomavyx4y86SBcYIQXe+i30346vN7G/gNQSwECFAAUAAAACADSEWlcb2GrLBYAAAAUAAAACAAAAAAAAAAAAAAAAAAAAAAAbWltZXR5cGVQSwECFAAUAAAACADSEWlcAqnSaq4AAAD7AAAAFgAAAAAAAAAAAAAAAAA8AAAATUVUQS1JTkYvY29udGFpbmVyLnhtbFBLAQIUABQAAAAIANIRaVzg575XCQEAAB0CAAARAAAAAAAAAAAAAAAAAB4BAABPRUJQUy9jb250ZW50Lm9wZlBLAQIUABQAAAAIANIRaVzYxLHHygAAAD4BAAAVAAAAAAAAAAAAAAAAAFYCAABPRUJQUy9jaGFwdGVyLTEueGh0bWxQSwECFAAUAAAACADSEWlcmT0XI9gAAABtAQAAFQAAAAAAAAAAAAAAAABTAwAAT0VCUFMvY2hhcHRlci0yLnhodG1sUEsFBgAAAAAFAAUAPwEAAF4EAAAAAA=='

const INVALID_EPUB_BASE64 =
  'UEsDBBQAAAAIANIRaVwCqdJqrgAAAPsAAAAWAAAATUVUQS1JTkYvY29udGFpbmVyLnhtbF2OwQrCMBBE735F2Ku01ZuEpgVBrwrqB8R0W4PpbmhS0b837UGKx4GZ96as370TLxyCZVKwzTcgkAw3ljoFt+sx20FdrUrDFLUlHP66aU1BwTiQZB1skKR7DDIayR6pYTP2SFHONfmDQLUSohyYY2sdhiktsmhH5zKv40PB6bA/X4ppmDA5+xZEj43VWfx4VKC9d9bomA4VjHcf0sw8dYfrZIRi1hQLTzmj5g/VF1BLAwQUAAAACADSEWlcRAwrldsAAABnAQAAEQAAAE9FQlBTL2NvbnRlbnQub3BmTdBNTsMwEAXgfU9hed9MAgtQZKcSEpwADmDZk9Sq/xQPpLk9bupAl3567xvJ4nT1jv3gnG0MkndNyxkGHY0Nk+Rfnx/HV34aDiIpfVETstIOWfIzUeoBlmVprEljE+cJntr2BWIa+T/3XLjhwJjwSMooUvd9b/Qfkb5nt82NBnToMVCGrulgG5ap0T1Zcji8+0Qre4vxIkq5hjccdv1+SgU7YqY6t4SeWSN5ptVh5uw847i/Gp1L4tFYdaQ1oeSEV4JbCpV+0ERONmwnq1ukQj94+6oWBdRvG34BUEsBAhQAFAAAAAgA0hFpXAKp0mquAAAA+wAAABYAAAAAAAAAAAAAAAAAAAAAAE1FVEEtSU5GL2NvbnRhaW5lci54bWxQSwECFAAUAAAACADSEWlcRAwrldsAAABnAQAAEQAAAAAAAAAAAAAAAADiAAAAT0VCUFMvY29udGVudC5vcGZQSwUGAAAAAAIAAgCDAAAA7AEAAAAA'

const REGRESSION_EPUB_BASE64 =
  'UEsDBBQAAAAIALNhbVxvYassFgAAABQAAAAIAAAAbWltZXR5cGVLLCjIyUxOLMnMz9NPLShN0q7KLAAAUEsDBBQAAAAIALNhbVxXuJqXrQAAAPwAAAAWAAAATUVUQS1JTkYvY29udGFpbmVyLnhtbF2OzQrCMBCE732KsFdpqzcJ/QHBs4JPENNtDaa7IUlF3940BykeB2a+b5r+PVvxQh8MUwuHag8CSfNgaGphiWN5hL4rGs0UlSH0f920ppCKniSrYIIkNWOQUUt2SAPrZUaKMtfkDwJdIUTjmeNoLIY1bbIYF2tLp+Kjhcv5dL3V6zBhKnYjiBkHo8r4cdiCcs4arWI6VDPeXUgz/VQT7pIRRJ099UbUZFY+0X0BUEsDBBQAAAAIALNhbVz/JhJpIgEAAOUBAAARAAAAT0VCUFMvY29udGVudC5vcGZNkcFOwzAQRO98xcpXlLiFAyg0kQoSolJbeuihVxNvGqtxYuwNDX/PNqRpjh7vzLy1F40rEqfykzoidLaqQ8JKKkoil0h5Pp9jo10RN/4oH2azJ8m3An7QB9PUqXiMZwLa2ny3GBmNNZnCoE/FV9OcWBDZHUBfYZGUVqSGDp2PFa71VR+vc4kVWg4Jch7PZW9mu84TMlRhtlUWA7MivHL8gg3DxTiXe1TU+GynfEAP76brp67yBeaywEhzw1O1KTDQEHWRDKEFo1ORl8oR+mguoPTIb0PYkRzVuCvJVgIsaqMi+nWYCljuduvV23K/+tzKw8d+s74/bNbwAuxiMkpbKqJnECAnTBOEHiA4U193uwJxPzP1FBOsScpg+j8M/5r9AVBLAwQUAAAACACzYW1c9qRaF5cAAADMAAAAGgAAAE9FQlBTL3RleHQvY2hhcHRlci0xLnhodG1sbY5NDsIgEIWvMukBShpXNcjCRJfahR4Ay9ghgUJgKvX20nTrZhbzvvcjib2D1bs5nxpijkchSiltObQhTaLr+16sG9MoSaiNkmzZobppjznqEQ2MpCNjkmJXpNi5VzDf6un+ovUto3qQzXAZnmfIFBZnwPoYEgN+cIZC9TAh3IcrLBkzxIRvu9YY1lNupYi1a28R20L1A1BLAQIUABQAAAAIALNhbVxvYassFgAAABQAAAAIAAAAAAAAAAAAAAAAAAAAAABtaW1ldHlwZVBLAQIUABQAAAAIALNhbVxXuJqXrQAAAPwAAAAWAAAAAAAAAAAAAAAAADwAAABNRVRBLUlORi9jb250YWluZXIueG1sUEsBAhQAFAAAAAgAs2FtXP8mEmkiAQAA5QEAABEAAAAAAAAAAAAAAAAAHQEAAE9FQlBTL2NvbnRlbnQub3BmUEsBAhQAFAAAAAgAs2FtXPakWheXAAAAzAAAABoAAAAAAAAAAAAAAAAAbgIAAE9FQlBTL3RleHQvY2hhcHRlci0xLnhodG1sUEsFBgAAAAAEAAQAAQEAAD0DAAAAAA=='

function decodeBase64(base64: string) {
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0))
}

function createTestEpubFile() {
  return new File([decodeBase64(VALID_EPUB_BASE64)], 'test-book.epub', {
    type: 'application/epub+zip',
  })
}

function createRegressionEpubFile() {
  return new File([decodeBase64(REGRESSION_EPUB_BASE64)], 'generated-book.epub', {
    type: 'application/epub+zip',
  })
}

describe('parseEpubFile', () => {
  it('extracts metadata and readable spine chapters from an epub file', async () => {
    const parsed = await parseEpubFile(createTestEpubFile())

    expect(parsed.title).toBe('Test Book')
    expect(parsed.author).toBe('Test Author')
    expect(parsed.format).toBe('epub')
    expect(parsed.fileName).toBe('test-book.epub')
    expect(parsed.chapters).toHaveLength(2)
    expect(parsed.chapters[0]?.title).toBe('Chapter One')
    expect(parsed.chapters[0]?.blocks[0]).toEqual({
      type: 'heading',
      text: 'Chapter One',
      level: 1,
    })
    expect(parsed.chapters[1]?.blocks).toEqual(
      expect.arrayContaining([
        {
          type: 'quote',
          text: 'A quoted line from the second chapter.',
        },
        {
          type: 'list-item',
          text: 'One list item',
        },
      ]),
    )
    expect(parsed.totalWordCount).toBeGreaterThan(0)
  })

  it('rejects epub files without readable spine chapters', async () => {
    const invalidFile = new File([decodeBase64(INVALID_EPUB_BASE64)], 'empty.epub', {
      type: 'application/epub+zip',
    })

    await expect(parseEpubFile(invalidFile)).rejects.toThrow(
      'No readable EPUB chapters were found.',
    )
  })

  it('accepts valid EPUB package documents that use OPF prefixes and normalized media types', async () => {
    const parsed = await parseEpubFile(createRegressionEpubFile())

    expect(parsed.title).toBe('Namespace Book')
    expect(parsed.author).toBe('Parser Fix')
    expect(parsed.chapters).toHaveLength(1)
    expect(parsed.chapters[0]?.title).toBe('Namespaced chapter')
    expect(parsed.chapters[0]?.blocks).toEqual(
      expect.arrayContaining([
        {
          type: 'paragraph',
          text: 'This EPUB should import even when the OPF uses prefixed tags.',
        },
      ]),
    )
  })
})
