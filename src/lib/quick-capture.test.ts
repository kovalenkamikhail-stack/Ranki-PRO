import { describe, expect, it } from 'vitest'
import {
  buildQuickCaptureSearchParams,
  MAX_QUICK_CAPTURE_BACK_TEXT_LENGTH,
  MAX_QUICK_CAPTURE_CONTEXT_LENGTH,
  MAX_QUICK_CAPTURE_DECK_ID_LENGTH,
  MAX_QUICK_CAPTURE_FRONT_TEXT_LENGTH,
  hasQuickCaptureCardDraftContent,
  parseQuickCaptureSearchParams,
} from '@/lib/quick-capture'

describe('quick capture url handoff', () => {
  it('parses and rebuilds the supported capture fields', () => {
    const params = new URLSearchParams(
      'front=%20obscure%20&back=%20hidden%20from%20view%20&context=%20Seen%20in%20a%20sentence.%20&deckId=deck-1',
    )

    const result = parseQuickCaptureSearchParams(params)
    const rebuiltParams = buildQuickCaptureSearchParams(result.payload)

    expect(result.errors).toEqual([])
    expect(result.warnings).toEqual([])
    expect(result.payload).toEqual({
      frontText: 'obscure',
      backText: 'hidden from view',
      contextText: 'Seen in a sentence.',
      deckId: 'deck-1',
    })
    expect(rebuiltParams.toString()).toBe(
      'front=obscure&back=hidden+from+view&context=Seen+in+a+sentence.&deckId=deck-1',
    )
    expect(
      buildQuickCaptureSearchParams(result.payload, { includeDeckId: false }).toString(),
    ).toBe('front=obscure&back=hidden+from+view&context=Seen+in+a+sentence.')
  })

  it('rejects empty capture payloads', () => {
    const result = parseQuickCaptureSearchParams(new URLSearchParams('deckId=deck-1'))

    expect(result.hasSupportedFields).toBe(false)
    expect(result.warnings).toEqual([])
    expect(result.errors).toContain(
      'No supported capture fields were found. Use front, back, and optional context.',
    )
  })

  it('trims oversized capture fields into a recoverable payload', () => {
    const frontText = 'f'.repeat(MAX_QUICK_CAPTURE_FRONT_TEXT_LENGTH + 1)
    const backText = 'b'.repeat(MAX_QUICK_CAPTURE_BACK_TEXT_LENGTH + 1)
    const contextText = 'c'.repeat(MAX_QUICK_CAPTURE_CONTEXT_LENGTH + 1)
    const result = parseQuickCaptureSearchParams(
      new URLSearchParams({
        front: frontText,
        back: backText,
        context: contextText,
      }),
    )

    expect(result.errors).toEqual([])
    expect(result.payload.frontText).toHaveLength(MAX_QUICK_CAPTURE_FRONT_TEXT_LENGTH)
    expect(result.payload.backText).toHaveLength(MAX_QUICK_CAPTURE_BACK_TEXT_LENGTH)
    expect(result.payload.contextText).toHaveLength(MAX_QUICK_CAPTURE_CONTEXT_LENGTH)
    expect(result.warnings).toContain(
      `Front text was trimmed to ${MAX_QUICK_CAPTURE_FRONT_TEXT_LENGTH} characters.`,
    )
    expect(result.warnings).toContain(
      `Back text was trimmed to ${MAX_QUICK_CAPTURE_BACK_TEXT_LENGTH} characters.`,
    )
    expect(result.warnings).toContain(
      `Context text was trimmed to ${MAX_QUICK_CAPTURE_CONTEXT_LENGTH} characters.`,
    )
  })

  it('warns about duplicate and unsupported params while keeping the first usable values', () => {
    const params = new URLSearchParams(
      'front=&front=obscure&back=hidden&foo=bar&context=Seen%20in%20a%20sentence.',
    )

    const result = parseQuickCaptureSearchParams(params)

    expect(result.errors).toEqual([])
    expect(result.payload).toEqual({
      frontText: 'obscure',
      backText: 'hidden',
      contextText: 'Seen in a sentence.',
      deckId: null,
    })
    expect(result.warnings).toContain(
      'Multiple front values were provided. Ranki kept the first usable value.',
    )
    expect(result.warnings).toContain('Ignored 1 unsupported capture field.')
  })

  it('drops malformed deck references while preserving the rest of the payload', () => {
    const result = parseQuickCaptureSearchParams(
      new URLSearchParams({
        front: 'obscure',
        back: 'hidden',
        deckId: `bad deck ${'x'.repeat(MAX_QUICK_CAPTURE_DECK_ID_LENGTH)}`,
      }),
    )

    expect(result.errors).toEqual([])
    expect(result.payload.deckId).toBeNull()
    expect(result.payload.frontText).toBe('obscure')
    expect(result.payload.backText).toBe('hidden')
    expect(result.warnings).toContain(
      'The requested deck reference was ignored because it was malformed.',
    )
  })

  it('blocks context-only payloads but keeps one-sided front/back payloads recoverable', () => {
    const contextOnly = parseQuickCaptureSearchParams(
      new URLSearchParams({
        context: 'Seen in a sentence.',
      }),
    )
    const frontOnly = parseQuickCaptureSearchParams(
      new URLSearchParams({
        front: 'obscure',
      }),
    )

    expect(contextOnly.errors).toContain(
      'Quick capture needs front or back text before it can continue into the card editor.',
    )
    expect(hasQuickCaptureCardDraftContent(contextOnly.payload)).toBe(false)
    expect(frontOnly.errors).toEqual([])
    expect(frontOnly.warnings).toContain(
      'Back text is missing. You can finish it in the editor before saving.',
    )
    expect(hasQuickCaptureCardDraftContent(frontOnly.payload)).toBe(true)
  })
})
