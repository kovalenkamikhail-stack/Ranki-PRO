import { describe, expect, it } from 'vitest'
import {
  buildQuickCaptureSearchParams,
  MAX_QUICK_CAPTURE_BACK_TEXT_LENGTH,
  MAX_QUICK_CAPTURE_CONTEXT_LENGTH,
  MAX_QUICK_CAPTURE_FRONT_TEXT_LENGTH,
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
    expect(result.errors).toContain(
      'No supported capture fields were found. Use front, back, and optional context.',
    )
  })

  it('rejects oversized capture fields', () => {
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

    expect(result.errors).toContain(
      `Front text must stay under ${MAX_QUICK_CAPTURE_FRONT_TEXT_LENGTH} characters.`,
    )
    expect(result.errors).toContain(
      `Back text must stay under ${MAX_QUICK_CAPTURE_BACK_TEXT_LENGTH} characters.`,
    )
    expect(result.errors).toContain(
      `Context text must stay under ${MAX_QUICK_CAPTURE_CONTEXT_LENGTH} characters.`,
    )
  })
})
