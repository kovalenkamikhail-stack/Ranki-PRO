import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { appDb } from '@/db/app-db'
import { bootstrapAppDb } from '@/db/bootstrap'
import { APP_SETTINGS_ID } from '@/entities/app-settings'
import { SettingsPage } from '@/pages/settings/SettingsPage'

const {
  ensureStoragePersistenceMock,
  importAnkiPackageMock,
} = vi.hoisted(() => ({
  ensureStoragePersistenceMock: vi.fn(),
  importAnkiPackageMock: vi.fn(),
}))

vi.mock('@/lib/storage-persistence', () => ({
  ensureStoragePersistence: ensureStoragePersistenceMock,
}))

vi.mock('@/importers/anki-apkg', () => ({
  importAnkiPackage: importAnkiPackageMock,
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
    ensureStoragePersistenceMock.mockReset()
    ensureStoragePersistenceMock.mockResolvedValue('granted')
    importAnkiPackageMock.mockReset()
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

  it('shows practical install guidance and local-only expectations in settings', async () => {
    ensureStoragePersistenceMock.mockResolvedValue('best-effort')

    renderSettingsPage()

    expect(await screen.findByText('Install and offline use')).toBeInTheDocument()
    expect(screen.getByText('Desktop install')).toBeInTheDocument()
    expect(screen.getByText('iPhone install')).toBeInTheDocument()
    expect(screen.getByText('Offline expectations')).toBeInTheDocument()
    expect(screen.getByText('What stays local')).toBeInTheDocument()
    expect(
      screen.getByText(/Add to Home Screen/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Storage durability is currently/i),
    ).toBeInTheDocument()
    expect(screen.getAllByText('Best-effort').length).toBeGreaterThan(0)
  })

  it('imports a selected apkg package and shows the image-preserving summary', async () => {
    importAnkiPackageMock.mockResolvedValue({
      deckCount: 1,
      cardCount: 105,
      importedImageCount: 39,
      skippedCardCount: 0,
      skippedImageCount: 0,
      decks: [
        {
          id: 'deck-imported',
          name: 'Imported English',
          cardCount: 105,
        },
      ],
    })

    renderSettingsPage()

    const apkgFile = new File(['anki-package'], 'english.apkg', {
      type: 'application/octet-stream',
    })

    fireEvent.change(screen.getByLabelText('Anki apkg file'), {
      target: { files: [apkgFile] },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Import package' }))

    await waitFor(() => {
      expect(importAnkiPackageMock).toHaveBeenCalledWith(apkgFile)
    })

    expect(
      await screen.findByText('Imported 105 cards into 1 deck.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Imported English')).toBeInTheDocument()
    expect(
      screen.getByText('Preserved 39 back images from the package.'),
    ).toBeInTheDocument()
    expect(
      screen.queryByText(/Left out .* images that could not be mapped/i),
    ).not.toBeInTheDocument()
  })
})
