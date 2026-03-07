export const APP_SETTINGS_ID = 'app_settings'
export const DEFAULT_GLOBAL_NEW_CARDS_PER_DAY = 10

export interface AppSettings {
  id: string
  globalNewCardsPerDay: number
  globalMaxReviewsPerDay: number | null
  createdAt: number
  updatedAt: number
}
