import { describe, expect, it } from 'vitest'
import { parseFb2File } from '@/importers/fb2'

const SECTIONED_FB2 = `<?xml version="1.0" encoding="utf-8"?>
<FictionBook>
  <description>
    <title-info>
      <book-title>Test FB2</book-title>
      <author>
        <first-name>Jane</first-name>
        <last-name>Doe</last-name>
      </author>
    </title-info>
  </description>
  <body>
    <section>
      <title><p>Opening</p></title>
      <p>First paragraph.</p>
      <epigraph><p>Quoted line.</p></epigraph>
    </section>
    <section>
      <title><p>Checklist</p></title>
      <li>Loose item</li>
      <section>
        <title><p>Nested Part</p></title>
        <p>Nested paragraph.</p>
      </section>
    </section>
  </body>
</FictionBook>`

const BODY_ONLY_FB2 = `<?xml version="1.0" encoding="utf-8"?>
<FictionBook>
  <description>
    <title-info>
      <book-title>Fallback Book</book-title>
    </title-info>
  </description>
  <body>
    <p>Standalone body paragraph.</p>
    <p>Another body paragraph.</p>
  </body>
</FictionBook>`

describe('parseFb2File', () => {
  it('extracts metadata and text-first chapters from fb2 sections', async () => {
    const file = new File([SECTIONED_FB2], 'book.fb2', {
      type: 'text/xml',
    })

    const parsed = await parseFb2File(file)

    expect(parsed.title).toBe('Test FB2')
    expect(parsed.author).toBe('Jane Doe')
    expect(parsed.format).toBe('fb2')
    expect(parsed.fileName).toBe('book.fb2')
    expect(parsed.chapters).toHaveLength(2)
    expect(parsed.chapters[0]?.title).toBe('Opening')
    expect(parsed.chapters[0]?.blocks).toEqual(
      expect.arrayContaining([
        {
          type: 'heading',
          text: 'Opening',
          level: 1,
        },
        {
          type: 'quote',
          text: 'Quoted line.',
        },
      ]),
    )
    expect(parsed.chapters[1]?.blocks).toEqual(
      expect.arrayContaining([
        {
          type: 'list-item',
          text: 'Loose item',
        },
        {
          type: 'heading',
          text: 'Nested Part',
          level: 2,
        },
      ]),
    )
  })

  it('creates a fallback chapter when an fb2 body has no explicit sections', async () => {
    const file = new File([BODY_ONLY_FB2], 'fallback.fb2', {
      type: 'application/xml',
    })

    const parsed = await parseFb2File(file)

    expect(parsed.chapters).toHaveLength(1)
    expect(parsed.chapters[0]?.title).toBe('Fallback Book')
    expect(parsed.chapters[0]?.blocks).toEqual([
      {
        type: 'paragraph',
        text: 'Standalone body paragraph.',
      },
      {
        type: 'paragraph',
        text: 'Another body paragraph.',
      },
    ])
  })
})
