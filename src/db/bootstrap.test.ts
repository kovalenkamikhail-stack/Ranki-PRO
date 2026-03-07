import { afterEach, describe, expect, it } from 'vitest'
import {
  APP_SETTINGS_ID,
  DEFAULT_GLOBAL_NEW_CARDS_PER_DAY,
} from '@/entities/app-settings'
import { RankiDb } from '@/db/app-db'
import { bootstrapAppDb } from '@/db/bootstrap'

describe('bootstrapAppDb', () => {
  let database: RankiDb | undefined

  afterEach(async () => {
    if (database) {
      await database.delete()
      database = undefined
    }
  })

  it('seeds the app settings singleton exactly once', async () => {
    database = new RankiDb(`ranki-test-${crypto.randomUUID()}`)

    const firstSettings = await bootstrapAppDb(database)
    const secondSettings = await bootstrapAppDb(database)

    expect(firstSettings.id).toBe(APP_SETTINGS_ID)
    expect(firstSettings.globalNewCardsPerDay).toBe(
      DEFAULT_GLOBAL_NEW_CARDS_PER_DAY,
    )
    expect(firstSettings.globalMaxReviewsPerDay).toBeNull()
    expect(secondSettings).toEqual(firstSettings)
    expect(await database.appSettings.count()).toBe(1)
  })
})
