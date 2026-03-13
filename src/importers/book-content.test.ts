import { describe, expect, it } from 'vitest'
import { extractHtmlBlocks, parseHtmlDocument } from '@/importers/book-content'

const XHTML_WITH_XML_DECLARATION = `<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
<title/>
<link rel="stylesheet" href="style.css" type="text/css"/>
<link rel="stylesheet" href="style.css" type="text/css"/>
</head>
<body class="z">
<span id="id1"><div class="title1">
<p class="p">Часть первая</p>
<p class="p">Этот умник-разумник</p>
<p class="p"><div class="image">
<img class="z1" alt="" src="images/_29081_2.jpg"/>
</div></p>
<p class="empty-line"/>
</div></span>
</body>
</html>`

describe('book-content XHTML parsing', () => {
  it('extracts readable blocks from XHTML chapters with XML declarations and self-closing head tags', () => {
    const document = parseHtmlDocument(
      XHTML_WITH_XML_DECLARATION,
      'EPUB regression chapter',
    )
    const blocks = extractHtmlBlocks(document)

    expect(blocks).toEqual([
      {
        type: 'paragraph',
        text: 'Часть первая',
      },
      {
        type: 'paragraph',
        text: 'Этот умник-разумник',
      },
    ])
  })
})
