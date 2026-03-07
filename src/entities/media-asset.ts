export type MediaAssetKind = 'image'

export interface MediaAsset {
  id: string
  cardId: string
  kind: MediaAssetKind
  mimeType: string
  fileName: string | null
  sizeBytes: number
  blobRef: string
  width: number | null
  height: number | null
  createdAt: number
}
