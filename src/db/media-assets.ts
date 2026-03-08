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
