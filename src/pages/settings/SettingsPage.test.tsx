import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { appDb } from '@/db/app-db'
import { bootstrapAppDb } from '@/db/bootstrap'
import { APP_SETTINGS_ID } from '@/entities/app-settings'
import { SettingsPage } from '@/pages/settings/SettingsPage'

vi.mock('@/lib/storage-persistence', () => ({
  ensureStoragePersistence: vi.fn().mockResolvedValue('granted'),
}))

function renderSettingsPage() {
  return render(
    <MemoryRouter>
      <SettingsPage />
    </MemoryRouter>,
  )
}

async function resetAppDb() {
  await appDb.delete()
  await appDb.open()
}

describe('SettingsPage', () => {
  beforeEach(async () => {
    await resetAppDb()
    await bootstrapAppDb(appDb)
  })

  afterEach(async () => {
    await resetAppDb()
  })

  it('loads the saved settings and persists edited study limits', async () => {
    renderSettingsPage()

    expect(await screen.findByDisplayValue('10')).toBeInTheDocument()
    expect(
      screen.getByLabelText('Unlimited global max reviews per day'),
    ).toBeChecked()

    fireEvent.change(screen.getByLabelText('Global new cards per day'), {
      target: { value: '7' },
    })
    fireEvent.click(
      screen.getByLabelText('Unlimited global max reviews per day'),
    )
    fireEvent.change(screen.getByLabelText('Global max reviews per day'), {
      target: { value: '40' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Save settings' }))

    await waitFor(async () => {
      const settings = await appDb.appSettings.get(APP_SETTINGS_ID)

      expect(settings?.globalNewCardsPerDay).toBe(7)
      expect(settings?.globalMaxReviewsPerDay).toBe(40)
    })
  })
})
