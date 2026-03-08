import { appDb, type RankiDb } from '@/db/app-db'
import type { Card } from '@/entities/card'
import type { MediaAsset } from '@/entities/media-asset'

export interface BackImageDraft {
  blob: Blob
  mimeType: string
  fileName: string | null
  sizeBytes: number
  width?: number | null
  height?: number | null
}

export interface CardBackImage {
  asset: MediaAsset
  blob: Blob
}

export const ALLOWED_BACK_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const
export const BACK_IMAGE_INPUT_ACCEPT = ALLOWED_BACK_IMAGE_MIME_TYPES.join(',')
export const MAX_BACK_IMAGE_SOURCE_BYTES = 12 * 1024 * 1024
export const MAX_BACK_IMAGE_STORED_BYTES = 2 * 1024 * 1024
export const MAX_BACK_IMAGE_DIMENSION_PX = 1600

const BACK_IMAGE_RESIZE_MIME_TYPE = 'image/webp'
const BACK_IMAGE_RESIZE_QUALITY = 0.82
const UNSUPPORTED_BACK_IMAGE_MESSAGE =
  'Back image must be a PNG, JPEG, or WebP file.'
const INVALID_BACK_IMAGE_SIZE_MESSAGE = 'Back image size is invalid.'
const OVERSIZED_BACK_IMAGE_MESSAGE =
  'Back image must be 12 MB or smaller.'
const OVERSIZED_STORED_BACK_IMAGE_MESSAGE =
  'Back image must be 2 MB or smaller after local optimization.'
const INVALID_BACK_IMAGE_DIMENSIONS_MESSAGE =
  'Back image dimensions are invalid.'
const MISMATCHED_BACK_IMAGE_TYPE_MESSAGE =
  'Back image type does not match the selected file.'
const BACK_IMAGE_PROCESSING_ERROR_MESSAGE =
  'Back image could not be processed on this device.'

export interface BackImageProcessingEnvironment {
  readImageDimensions(blob: Blob): Promise<{
    width: number
    height: number
  }>
  renderImageToBlob(
    blob: Blob,
    options: {
      width: number
      height: number
      mimeType: string
      quality: number
    },
  ): Promise<Blob>
}

export type BackImageProcessingPlan =
  | {
      kind: 'keep'
      width: number
      height: number
    }
  | {
      kind: 'transform'
      width: number
      height: number
      mimeType: string
      quality: number
    }

function inferImageMimeType(fileType: string, fileName: string) {
  if (fileType.startsWith('image/')) {
    return fileType
  }

  const extension = fileName.split('.').pop()?.toLowerCase()

  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    case 'gif':
      return 'image/gif'
    case 'webp':
      return 'image/webp'
    case 'avif':
      return 'image/avif'
    case 'svg':
      return 'image/svg+xml'
    case 'bmp':
      return 'image/bmp'
    default:
      return 'image/unknown'
  }
}

function isAllowedBackImageMimeType(mimeType: string) {
  return (
    ALLOWED_BACK_IMAGE_MIME_TYPES as readonly string[]
  ).includes(mimeType)
}

function normalizeBackImageDimensions(width: number, height: number) {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width <= 0 ||
    height <= 0
  ) {
    throw new Error(INVALID_BACK_IMAGE_DIMENSIONS_MESSAGE)
  }

  return { width, height }
}

function normalizeSelectedBackImageFile(
  file: Pick<File, 'name' | 'type' | 'size'>,
) {
  const normalizedMimeType = inferImageMimeType(file.type ?? '', file.name ?? '')

  if (!isAllowedBackImageMimeType(normalizedMimeType)) {
    throw new Error(UNSUPPORTED_BACK_IMAGE_MESSAGE)
  }

  if (!Number.isInteger(file.size) || file.size <= 0) {
    throw new Error(INVALID_BACK_IMAGE_SIZE_MESSAGE)
  }

  if (file.size > MAX_BACK_IMAGE_SOURCE_BYTES) {
    throw new Error(OVERSIZED_BACK_IMAGE_MESSAGE)
  }

  return {
    mimeType: normalizedMimeType,
    fileName: file.name?.trim() || null,
    sizeBytes: file.size,
  }
}

function fileExtensionForMimeType(mimeType: string) {
  switch (mimeType) {
    case 'image/jpeg':
      return 'jpg'
    case 'image/png':
      return 'png'
    case 'image/webp':
      return 'webp'
    default:
      return null
  }
}

function replaceBackImageFileExtension(
  fileName: string | null,
  mimeType: string,
) {
  if (!fileName) {
    return null
  }

  const nextExtension = fileExtensionForMimeType(mimeType)

  if (!nextExtension) {
    return fileName
  }

  const lastDotIndex = fileName.lastIndexOf('.')

  if (lastDotIndex === -1) {
    return `${fileName}.${nextExtension}`
  }

  return `${fileName.slice(0, lastDotIndex)}.${nextExtension}`
}

function loadImageElement(blob: Blob) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(blob)
    const image = new Image()
    const cleanup = () => {
      URL.revokeObjectURL(objectUrl)
    }

    image.onload = () => {
      cleanup()
      resolve(image)
    }
    image.onerror = () => {
      cleanup()
      reject(new Error(BACK_IMAGE_PROCESSING_ERROR_MESSAGE))
    }
    image.src = objectUrl
  })
}

const browserBackImageProcessingEnvironment: BackImageProcessingEnvironment = {
  async readImageDimensions(blob) {
    const image = await loadImageElement(blob)

    return normalizeBackImageDimensions(
      image.naturalWidth || image.width,
      image.naturalHeight || image.height,
    )
  },
  async renderImageToBlob(blob, options) {
    const image = await loadImageElement(blob)
    const canvas = document.createElement('canvas')
    canvas.width = options.width
    canvas.height = options.height

    const context = canvas.getContext('2d')

    if (!context) {
      throw new Error(BACK_IMAGE_PROCESSING_ERROR_MESSAGE)
    }

    context.drawImage(image, 0, 0, options.width, options.height)

    const processedBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, options.mimeType, options.quality)
    })

    if (!processedBlob) {
      throw new Error(BACK_IMAGE_PROCESSING_ERROR_MESSAGE)
    }

    return processedBlob
  },
}

export function createBackImageDraft(file: File): BackImageDraft {
  return {
    blob: file,
    mimeType: inferImageMimeType(file.type, file.name),
    fileName: file.name || null,
    sizeBytes: file.size,
    width: null,
    height: null,
  }
}

export function getBackImageProcessingPlan(input: {
  width: number
  height: number
  sizeBytes: number
}): BackImageProcessingPlan {
  const dimensions = normalizeBackImageDimensions(input.width, input.height)

  if (!Number.isInteger(input.sizeBytes) || input.sizeBytes <= 0) {
    throw new Error(INVALID_BACK_IMAGE_SIZE_MESSAGE)
  }

  const largestEdge = Math.max(dimensions.width, dimensions.height)
  const scale =
    largestEdge > MAX_BACK_IMAGE_DIMENSION_PX
      ? MAX_BACK_IMAGE_DIMENSION_PX / largestEdge
      : 1
  const targetWidth = Math.max(1, Math.round(dimensions.width * scale))
  const targetHeight = Math.max(1, Math.round(dimensions.height * scale))

  if (scale === 1 && input.sizeBytes <= MAX_BACK_IMAGE_STORED_BYTES) {
    return {
      kind: 'keep',
      width: dimensions.width,
      height: dimensions.height,
    }
  }

  return {
    kind: 'transform',
    width: targetWidth,
    height: targetHeight,
    mimeType: BACK_IMAGE_RESIZE_MIME_TYPE,
    quality: BACK_IMAGE_RESIZE_QUALITY,
  }
}

export function normalizeBackImageDraft(backImage: BackImageDraft) {
  const normalizedMimeType = inferImageMimeType(
    backImage.mimeType,
    backImage.fileName ?? '',
  )
  const normalizedBlobMimeType = backImage.blob.type
    ? inferImageMimeType(backImage.blob.type, backImage.fileName ?? '')
    : null

  if (!isAllowedBackImageMimeType(normalizedMimeType)) {
    throw new Error(UNSUPPORTED_BACK_IMAGE_MESSAGE)
  }

  if (normalizedBlobMimeType && normalizedBlobMimeType !== normalizedMimeType) {
    throw new Error(MISMATCHED_BACK_IMAGE_TYPE_MESSAGE)
  }

  if (
    !Number.isInteger(backImage.sizeBytes) ||
    backImage.sizeBytes <= 0 ||
    backImage.blob.size !== backImage.sizeBytes
  ) {
    throw new Error(INVALID_BACK_IMAGE_SIZE_MESSAGE)
  }

  if (backImage.sizeBytes > MAX_BACK_IMAGE_STORED_BYTES) {
    throw new Error(OVERSIZED_STORED_BACK_IMAGE_MESSAGE)
  }

  const width =
    backImage.width === undefined || backImage.width === null
      ? null
      : backImage.width
  const height =
    backImage.height === undefined || backImage.height === null
      ? null
      : backImage.height

  if ((width === null) !== (height === null)) {
    throw new Error(INVALID_BACK_IMAGE_DIMENSIONS_MESSAGE)
  }

  if (width !== null && height !== null) {
    normalizeBackImageDimensions(width, height)

    if (width > MAX_BACK_IMAGE_DIMENSION_PX || height > MAX_BACK_IMAGE_DIMENSION_PX) {
      throw new Error(INVALID_BACK_IMAGE_DIMENSIONS_MESSAGE)
    }
  }

  return {
    blob: backImage.blob,
    mimeType: normalizedMimeType,
    fileName: backImage.fileName?.trim() || null,
    sizeBytes: backImage.sizeBytes,
    width,
    height,
  }
}

export async function prepareBackImageDraft(
  file: File,
  environment: BackImageProcessingEnvironment = browserBackImageProcessingEnvironment,
): Promise<BackImageDraft> {
  const selectedFile = normalizeSelectedBackImageFile(file)

  let dimensions: { width: number; height: number }

  try {
    dimensions = await environment.readImageDimensions(file)
  } catch (error) {
    throw error instanceof Error
      ? error
      : new Error(BACK_IMAGE_PROCESSING_ERROR_MESSAGE)
  }

  const processingPlan = getBackImageProcessingPlan({
    width: dimensions.width,
    height: dimensions.height,
    sizeBytes: selectedFile.sizeBytes,
  })

  if (processingPlan.kind === 'keep') {
    return normalizeBackImageDraft({
      blob: file,
      mimeType: selectedFile.mimeType,
      fileName: selectedFile.fileName,
      sizeBytes: selectedFile.sizeBytes,
      width: processingPlan.width,
      height: processingPlan.height,
    })
  }

  let processedBlob: Blob

  try {
    processedBlob = await environment.renderImageToBlob(file, {
      width: processingPlan.width,
      height: processingPlan.height,
      mimeType: processingPlan.mimeType,
      quality: processingPlan.quality,
    })
  } catch (error) {
    throw error instanceof Error
      ? error
      : new Error(BACK_IMAGE_PROCESSING_ERROR_MESSAGE)
  }

  const processedMimeType =
    processedBlob.type || processingPlan.mimeType

  return normalizeBackImageDraft({
    blob: processedBlob,
    mimeType: processedMimeType,
    fileName: replaceBackImageFileExtension(
      selectedFile.fileName,
      processedMimeType,
    ),
    sizeBytes: processedBlob.size,
    width: processingPlan.width,
    height: processingPlan.height,
  })
}

export async function getCardBackImage(
  card: Pick<Card, 'backImageAssetId'>,
  database: RankiDb = appDb,
): Promise<CardBackImage | null> {
  if (!card.backImageAssetId) {
    return null
  }

  const asset = await database.mediaAssets.get(card.backImageAssetId)

  if (!asset) {
    return null
  }

  const mediaBlob = await database.mediaBlobs.get(asset.blobRef)

  if (!mediaBlob) {
    return null
  }

  return {
    asset,
    blob: mediaBlob.blob,
  }
}

export async function listCardBackImages(
  cards: readonly Pick<Card, 'id' | 'backImageAssetId'>[],
  database: RankiDb = appDb,
) {
  const assetIds = cards
    .map((card) => card.backImageAssetId)
    .filter((assetId): assetId is string => assetId !== null)

  const backImages = new Map<string, CardBackImage>()

  if (assetIds.length === 0) {
    return backImages
  }

  const assets = await database.mediaAssets.where('id').anyOf(assetIds).toArray()

  if (assets.length === 0) {
    return backImages
  }

  const mediaBlobs = await database.mediaBlobs
    .where('blobRef')
    .anyOf(assets.map((asset) => asset.blobRef))
    .toArray()
  const blobByRef = new Map(
    mediaBlobs.map((mediaBlob) => [mediaBlob.blobRef, mediaBlob.blob]),
  )
  const cardIdByAssetId = new Map(
    cards
      .filter((card) => card.backImageAssetId !== null)
      .map((card) => [card.backImageAssetId!, card.id]),
  )

  assets.forEach((asset) => {
    const blob = blobByRef.get(asset.blobRef)
    const cardId = cardIdByAssetId.get(asset.id)

    if (blob && cardId) {
      backImages.set(cardId, {
        asset,
        blob,
      })
    }
  })

  return backImages
}
