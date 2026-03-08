import { describe, expect, it } from 'vitest'
import {
  buildImportedCardContent,
  extractImageFileName,
  htmlToPlainText,
  splitAnkiFields,
} from '@/importers/anki-apkg-mapping'

describe('anki apkg mapping helpers', () => {
  it('splits ordered note fields into a named map', () => {
    expect(
      splitAnkiFields('front\u001fback\u001fimage', [
        'Front',
        'Back',
        'Image',
      ]),
    ).toEqual({
      Front: 'front',
      Back: 'back',
      Image: 'image',
    })
  })

  it('collapses glossary html into readable plain text and removes noisy nodes', () => {
    expect(
      htmlToPlainText(
        '<div>Hello <strong>world</strong><details><summary>More</summary>Hidden text</details><div data-sc-content="backlink">Wiktionary</div>&nbsp;again</div>',
      ),
    ).toBe('Hello world again')
  })

  it('prefers yomitan gloss list content when asked for meaning text', () => {
    expect(
      htmlToPlainText(
        '<div class="yomitan-glossary"><ol data-sc-content="glosses"><li><div>through, over</div></li><li><div>from side to side</div></li></ol><div data-sc-content="backlink">Wiktionary</div></div>',
        { preferGlossList: true },
      ),
    ).toBe('through, over; from side to side')
  })

  it('extracts a back image filename from html', () => {
    expect(
      extractImageFileName('<img src="example-image.webp">'),
    ).toBe('example-image.webp')
  })

  it('builds front/back content from the current english template fields', () => {
    expect(
      buildImportedCardContent({
        Expression: 'across',
        Meaning:
          '<div class="yomitan-glossary"><ol data-sc-content="glosses"><li><div>prep. from one side to another</div></li><li><div>across or over</div></li></ol><div data-sc-content="backlink">Wiktionary</div></div>',
        'Sentence-Translation': 'through the whole country',
        'Cloze-Prefix': 'News spread',
        'Cloze-Body': 'across',
        'Cloze-Suffix': 'the country.',
        Examples: '<a href="https://example.com">https://example.com</a>',
        'Full-Sentence': '<div>News spread across the country.</div>',
        Image: '<img src="country.webp">',
      }),
    ).toEqual({
      frontText: 'across',
      backText:
        'prep. from one side to another; across or over\n\nSentence translation: through the whole country\n\nSentence: News spread across the country.',
      imageFileName: 'country.webp',
    })
  })

  it('falls back to a cleaned full sentence when cloze parts are incomplete', () => {
    expect(
      buildImportedCardContent({
        Expression: 'robbery',
        Meaning: '<div><ol><li>the act of stealing</li></ol></div>',
        'Full-Sentence':
          'It&apos;s robbery, sir.&nbsp;<span style="font-weight: 700;">I was charged when I was 19 years old</span>',
      }),
    ).toEqual({
      frontText: 'robbery',
      backText:
        'the act of stealing\n\nSentence: It\'s robbery, sir. I was charged when I was 19 years old',
      imageFileName: null,
    })
  })

  it('returns null when it cannot build a usable front/back card', () => {
    expect(
      buildImportedCardContent({
        Meaning: '',
        Image: '',
      }),
    ).toBeNull()
  })
})
