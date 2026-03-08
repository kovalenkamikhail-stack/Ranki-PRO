import Dexie, { type Table } from 'dexie'
import type { AppSettings } from '@/entities/app-settings'
import type { Card } from '@/entities/card'
import type { Deck } from '@/entities/deck'
import type { MediaAsset } from '@/entities/media-asset'
import type { MediaBlob } from '@/entities/media-blob'
import type { ReadingDocument } from '@/entities/reading-document'
import type { ReviewLog } from '@/entities/review-log'
import { rankiSchema, rankiSchemaV1, rankiSchemaV2 } from '@/db/schema'

export class RankiDb extends Dexie {
  decks!: Table<Deck, string>
  cards!: Table<Card, string>
  mediaAssets!: Table<MediaAsset, string>
  mediaBlobs!: Table<MediaBlob, string>
  readingDocuments!: Table<ReadingDocument, string>
  reviewLogs!: Table<ReviewLog, string>
  appSettings!: Table<AppSettings, string>

  constructor(name = 'ranki-pro') {
    super(name)
    this.version(1).stores(rankiSchemaV1)
    this.version(2).stores(rankiSchemaV2)
    this.version(3).stores(rankiSchema)
  }
}

export const appDb = new RankiDb()
