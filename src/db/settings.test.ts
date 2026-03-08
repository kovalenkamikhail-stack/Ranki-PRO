import { afterEach, describe, expect, it, vi } from 'vitest'
import { RankiDb } from '@/db/app-db'
import { bootstrapAppDb } from '@/db/bootstrap'
import { getAppSettings, updateAppSettings } from '@/db/settings'

const { nowMsMock } = vi.hoisted(() => ({
  nowMsMock: vi.fn(),
}))

vi.mock('@/lib/time', () => ({
  nowMs: nowMsMock,
}))

describe('app settings persistence', () => {
  let database: RankiDb | undefined

  afterEach(async () => {
    nowMsMock.mockReset()

    if (database) {
      await database.delete()
      database = undefined
    }
  })

  it('reads the seeded singleton and persists updated study limits', async () => {
    database = new RankiDb(`ranki-settings-${crypto.randomUUID()}`)
    nowMsMock.mockReturnValueOnce(1_000).mockReturnValueOnce(2_000)

    await bootstrapAppDb(database)

    const settings = await getAppSettings(database)
    const updatedSettings = await updateAppSettings(
      {
        globalNewCardsPerDay: 7,
        globalMaxReviewsPerDay: 40,
      },
      database,
    )

    expect(settings.globalNewCardsPerDay).toBe(10)
    expect(settings.globalMaxReviewsPerDay).toBeNull()
    expect(updatedSettings.globalNewCardsPerDay).toBe(7)
    expect(updatedSettings.globalMaxReviewsPerDay).toBe(40)
    expect(updatedSettings.createdAt).toBe(1_000)
    expect(updatedSettings.updatedAt).toBe(2_000)
    expect(await database.appSettings.get(updatedSettings.id)).toEqual(
      updatedSettings,
    )
  })

  it('allows unlimited max reviews by persisting null', async () => {
    database = new RankiDb(`ranki-settings-${crypto.randomUUID()}`)
    nowMsMock.mockReturnValueOnce(1_000).mockReturnValueOnce(2_000)

    await bootstrapAppDb(database)

    const updatedSettings = await updateAppSettings(
      {
        globalNewCardsPerDay: 5,
        globalMaxReviewsPerDay: null,
      },
      database,
    )

    expect(updatedSettings.globalNewCardsPerDay).toBe(5)
    expect(updatedSettings.globalMaxReviewsPerDay).toBeNull()
  })

  it('rejects negative study limits', async () => {
    database = new RankiDb(`ranki-settings-${crypto.randomUUID()}`)
    nowMsMock.mockReturnValue(1_000)

    await bootstrapAppDb(database)

    await expect(
      updateAppSettings(
        {
          globalNewCardsPerDay: -1,
          globalMaxReviewsPerDay: 10,
        },
        database,
      ),
    ).rejects.toThrow(
      'Global new cards per day must be a whole number greater than or equal to 0.',
    )

    await expect(
      updateAppSettings(
        {
          globalNewCardsPerDay: 5,
          globalMaxReviewsPerDay: -1,
        },
        database,
      ),
    ).rejects.toThrow(
      'Global max reviews per day must be null or a whole number greater than or equal to 0.',
    )
  })
})
