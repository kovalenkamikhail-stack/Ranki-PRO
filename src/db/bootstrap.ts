import {
  APP_SETTINGS_ID,
  DEFAULT_GLOBAL_NEW_CARDS_PER_DAY,
  type AppSettings,
} from '@/entities/app-settings'
import type { RankiDb } from '@/db/app-db'
import { appDb } from '@/db/app-db'
import { nowMs } from '@/lib/time'

export async function ensureAppSettings(
  database: RankiDb = appDb,
): Promise<AppSettings> {
  return database.transaction('rw', database.appSettings, async () => {
    const existing = await database.appSettings.get(APP_SETTINGS_ID)

    if (existing) {
      return existing
    }

    const timestamp = nowMs()
    const settings: AppSettings = {
      id: APP_SETTINGS_ID,
      globalNewCardsPerDay: DEFAULT_GLOBAL_NEW_CARDS_PER_DAY,
      globalMaxReviewsPerDay: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    }

    await database.appSettings.add(settings)
    return settings
  })
}

export async function bootstrapAppDb(database: RankiDb = appDb) {
  return ensureAppSettings(database)
}

export async function getFoundationSnapshot(database: RankiDb = appDb) {
  const [settings, deckCount] = await Promise.all([
    bootstrapAppDb(database),
    database.decks.count(),
  ])

  return { settings, deckCount }
}
