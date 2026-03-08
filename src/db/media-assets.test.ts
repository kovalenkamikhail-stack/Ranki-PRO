import { describe, expect, it, vi } from 'vitest'
import {
  ALLOWED_BACK_IMAGE_MIME_TYPES,
  MAX_BACK_IMAGE_SOURCE_BYTES,
  MAX_BACK_IMAGE_STORED_BYTES,
  prepareBackImageDraft,
  createBackImageDraft,
  type BackImageProcessingEnvironment,
} from '@/db/media-assets'

function createProcessingEnvironment(
  overrides: Partial<BackImageProcessingEnvironment> = {},
): BackImageProcessingEnvironment {
  return {
    readImageDimensions: vi.fn().mockResolvedValue({
      width: 1200,
      height: 900,
    }),
    renderImageToBlob: vi.fn().mockResolvedValue(
      new Blob(['optimized-image'], { type: 'image/webp' }),
    ),
    ...overrides,
  }
}

describe('media asset drafts', () => {
  it('accepts the supported raster image types', async () => {
    for (const mimeType of ALLOWED_BACK_IMAGE_MIME_TYPES) {
      const file = new File(['image-binary'], `sample.${mimeType.split('/')[1]}`, {
        type: mimeType,
      })
      const environment = createProcessingEnvironment()

      const draft = await prepareBackImageDraft(file, environment)

      expect(environment.renderImageToBlob).not.toHaveBeenCalled()
      expect(draft.mimeType).toBe(mimeType)
      expect(draft.blob).toBe(file)
    }
  })

  it('infers an image mime type from the file extension when the picker leaves it empty', () => {
    const file = new File(['image-binary'], 'harbor.png', { type: '' })

    const draft = createBackImageDraft(file)

    expect(draft.mimeType).toBe('image/png')
    expect(draft.fileName).toBe('harbor.png')
    expect(draft.sizeBytes).toBe(file.size)
  })

  it('rejects unsupported image types before processing', async () => {
    await expect(
      prepareBackImageDraft({
        name: 'animated.gif',
        type: 'image/gif',
        size: 512,
      } as File),
    ).rejects.toThrow('Back image must be a PNG, JPEG, or WebP file.')
  })

  it('rejects files that exceed the source size limit before processing', async () => {
    await expect(
      prepareBackImageDraft({
        name: 'too-large.png',
        type: 'image/png',
        size: MAX_BACK_IMAGE_SOURCE_BYTES + 1,
      } as File),
    ).rejects.toThrow('Back image must be 12 MB or smaller.')
  })

  it('keeps a valid image as-is when it already fits the local storage envelope', async () => {
    const file = new File(['image-binary'], 'harbor.png', { type: 'image/png' })
    const environment = createProcessingEnvironment()

    const draft = await prepareBackImageDraft(file, environment)

    expect(environment.renderImageToBlob).not.toHaveBeenCalled()
    expect(draft).toMatchObject({
      blob: file,
      mimeType: 'image/png',
      fileName: 'harbor.png',
      sizeBytes: file.size,
      width: 1200,
      height: 900,
    })
  })

  it('resizes and compresses large images before returning the final storage draft', async () => {
    const file = new File(
      [new Uint8Array(3 * 1024 * 1024)],
      'harbor.png',
      { type: 'image/png' },
    )
    const optimizedBlob = new Blob(['optimized-image'], { type: 'image/webp' })
    const environment = createProcessingEnvironment({
      readImageDimensions: vi.fn().mockResolvedValue({
        width: 3200,
        height: 2400,
      }),
      renderImageToBlob: vi.fn().mockResolvedValue(optimizedBlob),
    })

    const draft = await prepareBackImageDraft(file, environment)

    expect(environment.renderImageToBlob).toHaveBeenCalledWith(file, {
      width: 1600,
      height: 1200,
      mimeType: 'image/webp',
      quality: 0.82,
    })
    expect(draft).toMatchObject({
      blob: optimizedBlob,
      mimeType: 'image/webp',
      fileName: 'harbor.webp',
      sizeBytes: optimizedBlob.size,
      width: 1600,
      height: 1200,
    })
  })

  it('rejects optimized images that still exceed the stored size limit', async () => {
    const file = new File(
      [new Uint8Array(MAX_BACK_IMAGE_STORED_BYTES + 128)],
      'still-large.png',
      { type: 'image/png' },
    )
    const environment = createProcessingEnvironment({
      readImageDimensions: vi.fn().mockResolvedValue({
        width: 2400,
        height: 1800,
      }),
      renderImageToBlob: vi.fn().mockResolvedValue(
        new Blob([new Uint8Array(MAX_BACK_IMAGE_STORED_BYTES + 1)], {
          type: 'image/webp',
        }),
      ),
    })

    await expect(prepareBackImageDraft(file, environment)).rejects.toThrow(
      'Back image must be 2 MB or smaller after local optimization.',
    )
  })
})
