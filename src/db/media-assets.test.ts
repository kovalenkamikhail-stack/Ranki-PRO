import { describe, expect, it } from 'vitest'
import { createBackImageDraft } from '@/db/media-assets'

describe('media asset drafts', () => {
  it('infers an image mime type from the file extension when the picker leaves it empty', () => {
    const file = new File(['image-binary'], 'harbor.png', { type: '' })

    const draft = createBackImageDraft(file)

    expect(draft.mimeType).toBe('image/png')
    expect(draft.fileName).toBe('harbor.png')
    expect(draft.sizeBytes).toBe(file.size)
  })
})
