import { appDb, type RankiDb } from '@/db/app-db'
import { ensureAppSettings } from '@/db/bootstrap'
import {
  APP_SETTINGS_ID,
  DEFAULT_GLOBAL_NEW_CARDS_PER_DAY,
  type AppSettings,
} from '@/entities/app-settings'
import { nowMs } from '@/lib/time'

export interface AppSettingsDraft {
  globalNewCardsPerDay: number
  globalMaxReviewsPerDay: number | null
}

function normalizeGlobalNewCardsPerDay(value: number) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(
      'Global new cards per day must be a whole number greater than or equal to 0.',
    )
  }

  return value
}

function normalizeGlobalMaxReviewsPerDay(value: number | null) {
  if (value === null) {
    return null
  }

  if (!Number.isInteger(value) || value < 0) {
    throw new Error(
      'Global max reviews per day must be null or a whole number greater than or equal to 0.',
    )
  }

  return value
}

function normalizeAppSettingsDraft(draft: AppSettingsDraft) {
  return {
    globalNewCardsPerDay: normalizeGlobalNewCardsPerDay(
      draft.globalNewCardsPerDay,
    ),
    globalMaxReviewsPerDay: normalizeGlobalMaxReviewsPerDay(
      draft.globalMaxReviewsPerDay,
    ),
  }
}

export async function getAppSettings(database: RankiDb = appDb) {
  return ensureAppSettings(database)
}

export async function updateAppSettings(
  draft: AppSettingsDraft,
  database: RankiDb = appDb,
) {
  const normalized = normalizeAppSettingsDraft(draft)

  return database.transaction('rw', database.appSettings, async () => {
    const existing = await database.appSettings.get(APP_SETTINGS_ID)
    const timestamp = nowMs()
    const baseSettings: AppSettings = existing ?? {
      id: APP_SETTINGS_ID,
      globalNewCardsPerDay: DEFAULT_GLOBAL_NEW_CARDS_PER_DAY,
      globalMaxReviewsPerDay: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    const updatedSettings: AppSettings = {
      ...baseSettings,
      ...normalized,
      updatedAt: timestamp,
    }

    await database.appSettings.put(updatedSettings)

    return updatedSettings
  })
}
