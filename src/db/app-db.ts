import Dexie, { type Table } from 'dexie'
import type { AppSettings } from '@/entities/app-settings'
import type { Card } from '@/entities/card'
import type { Deck } from '@/entities/deck'
import type { MediaAsset } from '@/entities/media-asset'
import type { ReviewLog } from '@/entities/review-log'
import { rankiSchema } from '@/db/schema'

export class RankiDb extends Dexie {
  decks!: Table<Deck, string>
  cards!: Table<Card, string>
  mediaAssets!: Table<MediaAsset, string>
  reviewLogs!: Table<ReviewLog, string>
  appSettings!: Table<AppSettings, string>

  constructor(name = 'ranki-pro') {
    super(name)
    this.version(1).stores(rankiSchema)
  }
}

export const appDb = new RankiDb()
