import { Save, ShieldCheck, SlidersHorizontal, Upload } from 'lucide-react'
import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { bootstrapAppDb } from '@/db/bootstrap'
import { updateAppSettings } from '@/db/settings'
import type { AppSettings } from '@/entities/app-settings'
import { importAnkiPackage, type ApkgImportSummary } from '@/importers/anki-apkg'
import {
  ensureStoragePersistence,
  type StoragePersistenceStatus,
} from '@/lib/storage-persistence'

const inputClassName =
  'mt-2 w-full rounded-[1.15rem] border border-input bg-background/85 px-4 py-3 text-sm text-foreground shadow-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60'

export function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [settingsError, setSettingsError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [storageStatus, setStorageStatus] =
    useState<StoragePersistenceStatus | null>(null)
  const [globalNewCardsPerDay, setGlobalNewCardsPerDay] = useState('')
  const [globalMaxReviewsPerDay, setGlobalMaxReviewsPerDay] = useState('')
  const [isUnlimitedMaxReviews, setIsUnlimitedMaxReviews] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [selectedImportFile, setSelectedImportFile] = useState<File | null>(null)
  const [importSummary, setImportSummary] = useState<ApkgImportSummary | null>(null)
  const [importError, setImportError] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const importInputRef = useRef<HTMLInputElement | null>(null)

  const syncFormFromSettings = (nextSettings: AppSettings) => {
    setGlobalNewCardsPerDay(String(nextSettings.globalNewCardsPerDay))
    setGlobalMaxReviewsPerDay(
      nextSettings.globalMaxReviewsPerDay === null
        ? ''
        : String(nextSettings.globalMaxReviewsPerDay),
    )
    setIsUnlimitedMaxReviews(nextSettings.globalMaxReviewsPerDay === null)
  }

  useEffect(() => {
    let isMounted = true

    void Promise.all([bootstrapAppDb(), ensureStoragePersistence()])
      .then(([nextSettings, nextStorageStatus]) => {
        if (isMounted) {
          setSettings(nextSettings)
          setStorageStatus(nextStorageStatus)
          syncFormFromSettings(nextSettings)
        }
      })
      .catch((nextError: unknown) => {
        if (isMounted) {
          setSettingsError(
            nextError instanceof Error
              ? nextError.message
              : 'Failed to load app settings.',
          )
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setIsSaving(true)
    setSettingsError(null)
    setSuccessMessage(null)

    try {
      if (globalNewCardsPerDay.trim().length === 0) {
        throw new Error('Global new cards per day is required.')
      }

      if (
        !isUnlimitedMaxReviews &&
        globalMaxReviewsPerDay.trim().length === 0
      ) {
        throw new Error('Global max reviews per day is required.')
      }

      const updatedSettings = await updateAppSettings({
        globalNewCardsPerDay: Number(globalNewCardsPerDay),
        globalMaxReviewsPerDay: isUnlimitedMaxReviews
          ? null
          : Number(globalMaxReviewsPerDay),
      })

      setSettings(updatedSettings)
      syncFormFromSettings(updatedSettings)
      setSuccessMessage('Settings saved.')
    } catch (nextError: unknown) {
      setSettingsError(
        nextError instanceof Error
          ? nextError.message
          : 'Failed to save study limits.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleImportFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setImportSummary(null)
    setImportError(null)
    setSelectedImportFile(event.target.files?.[0] ?? null)
  }

  const handleImportSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!selectedImportFile) {
      setImportError('Choose an Anki .apkg package first.')
      return
    }

    setIsImporting(true)
    setImportError(null)
    setImportSummary(null)

    try {
      const summary = await importAnkiPackage(selectedImportFile)
      setImportSummary(summary)
      setSelectedImportFile(null)

      if (importInputRef.current) {
        importInputRef.current.value = ''
      }
    } catch (nextError: unknown) {
      setImportError(
        nextError instanceof Error
          ? nextError.message
          : 'Failed to import the Anki package.',
      )
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <Card>
        <CardHeader>
          <div className="mb-3 inline-flex rounded-2xl bg-primary/12 p-3 text-primary">
            <SlidersHorizontal className="h-6 w-6" />
          </div>
          <CardTitle>Global study limits</CardTitle>
          <CardDescription>
            Edit the Dexie-backed limits that the deck-scoped study session
            already reads on load.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {settingsError ? (
            <div
              role="alert"
              className="rounded-[1.4rem] border border-destructive/30 bg-destructive/8 p-5 text-sm text-destructive"
            >
              {settingsError}
            </div>
          ) : null}

          {successMessage ? (
            <div className="rounded-[1.4rem] border border-primary/30 bg-primary/8 p-5 text-sm text-primary">
              {successMessage}
            </div>
          ) : null}

          <form className="space-y-5" onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-foreground">
              Global new cards per day
              <input
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={globalNewCardsPerDay}
                onChange={(event) => setGlobalNewCardsPerDay(event.target.value)}
                className={inputClassName}
              />
            </label>

            <label className="flex items-start gap-3 rounded-[1.4rem] border border-border/70 bg-background/70 p-4 text-sm font-medium text-foreground">
              <input
                type="checkbox"
                checked={isUnlimitedMaxReviews}
                onChange={(event) =>
                  setIsUnlimitedMaxReviews(event.target.checked)
                }
                aria-label="Unlimited global max reviews per day"
                className="mt-1 h-4 w-4 rounded border-input"
              />
              <span>
                Unlimited global max reviews per day
                <span className="mt-1 block text-sm font-normal leading-6 text-muted-foreground">
                  Leave due reviews uncapped for every deck that still uses
                  global defaults.
                </span>
              </span>
            </label>

            <label className="block text-sm font-medium text-foreground">
              Global max reviews per day
              <input
                type="number"
                min={0}
                step={1}
                inputMode="numeric"
                value={globalMaxReviewsPerDay}
                onChange={(event) =>
                  setGlobalMaxReviewsPerDay(event.target.value)
                }
                disabled={isUnlimitedMaxReviews}
                className={inputClassName}
              />
            </label>

            <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4 text-sm text-muted-foreground">
              These values apply immediately to the existing study-session seam.
              Deck-level overrides are configured from the deck editor.
            </div>

            <div className="flex flex-wrap gap-3">
              <Button type="submit" size="lg" disabled={isSaving}>
                <Save className="mr-2 h-4 w-4" />
                {isSaving ? 'Saving settings...' : 'Save settings'}
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/">Back to decks</Link>
              </Button>
            </div>
          </form>

          <dl className="grid gap-3">
            <div className="flex items-center justify-between rounded-[1.4rem] border border-border/70 bg-background/70 px-4 py-4">
              <dt className="text-sm text-muted-foreground">
                Global new cards per day
              </dt>
              <dd className="text-lg font-semibold">
                {settings?.globalNewCardsPerDay ?? '...'}
              </dd>
            </div>

            <div className="flex items-center justify-between rounded-[1.4rem] border border-border/70 bg-background/70 px-4 py-4">
              <dt className="text-sm text-muted-foreground">
                Global max reviews per day
              </dt>
              <dd className="text-lg font-semibold">
                {settings?.globalMaxReviewsPerDay ?? 'Unlimited'}
              </dd>
            </div>

            <div className="flex items-center justify-between rounded-[1.4rem] border border-border/70 bg-background/70 px-4 py-4">
              <dt className="text-sm text-muted-foreground">Storage mode</dt>
              <dd className="text-lg font-semibold">Device-local only</dd>
            </div>

            <div className="flex items-center justify-between rounded-[1.4rem] border border-border/70 bg-background/70 px-4 py-4">
              <dt className="text-sm text-muted-foreground">
                Storage durability
              </dt>
              <dd className="text-lg font-semibold">
                {storageStatus === 'granted'
                  ? 'Persistent'
                  : storageStatus === 'best-effort'
                    ? 'Best-effort'
                    : storageStatus === 'unsupported'
                      ? 'Unsupported'
                      : '...'}
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="mb-3 inline-flex rounded-2xl bg-primary/12 p-3 text-primary">
              <Upload className="h-6 w-6" />
            </div>
            <CardTitle>Import Anki package</CardTitle>
            <CardDescription>
              Load a local `.apkg` deck into Ranki so we can test the product on
              real card volume without leaving the offline-first flow.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {importError ? (
              <div
                role="alert"
                className="rounded-[1.4rem] border border-destructive/30 bg-destructive/8 p-5 text-sm text-destructive"
              >
                {importError}
              </div>
            ) : null}

            {importSummary ? (
              <div className="rounded-[1.4rem] border border-primary/30 bg-primary/8 p-5 text-sm text-primary">
                <p className="font-medium">
                  Imported {importSummary.cardCount} card
                  {importSummary.cardCount === 1 ? '' : 's'} into{' '}
                  {importSummary.deckCount} deck
                  {importSummary.deckCount === 1 ? '' : 's'}.
                </p>
                <div className="mt-3 space-y-2 text-sm">
                  {importSummary.decks.map((deck) => (
                    <p key={deck.id}>
                      <Link className="underline underline-offset-4" to={`/decks/${deck.id}`}>
                        {deck.name}
                      </Link>{' '}
                      · {deck.cardCount} card{deck.cardCount === 1 ? '' : 's'}
                    </p>
                  ))}
                </div>
                {importSummary.importedImageCount > 0 ? (
                  <p className="mt-3 text-sm">
                    Preserved {importSummary.importedImageCount} back image
                    {importSummary.importedImageCount === 1 ? '' : 's'} from
                    the package.
                  </p>
                ) : null}
                {importSummary.skippedCardCount > 0 ? (
                  <p className="mt-3 text-sm">
                    Skipped {importSummary.skippedCardCount} unsupported Anki
                    card{importSummary.skippedCardCount === 1 ? '' : 's'}.
                  </p>
                ) : null}
                {importSummary.skippedImageCount > 0 ? (
                  <p className="mt-2 text-sm">
                    Left out {importSummary.skippedImageCount} image
                    {importSummary.skippedImageCount === 1 ? '' : 's'} that
                    could not be mapped into Ranki&apos;s single back-image slot.
                  </p>
                ) : null}
              </div>
            ) : null}

            <form className="space-y-4" onSubmit={handleImportSubmit}>
              <label className="block text-sm font-medium text-foreground">
                Anki `.apkg` file
                <input
                  ref={importInputRef}
                  type="file"
                  accept=".apkg"
                  onChange={handleImportFileChange}
                  className={inputClassName}
                  aria-label="Anki apkg file"
                />
              </label>

              <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4 text-sm text-muted-foreground">
                For the current English Template import, Ranki preserves the
                expression, cleaned meaning, sentence translation, one sentence
                of context, and one back image when present. Audio, source
                links, and Anki scheduling are still intentionally left out.
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  type="submit"
                  size="lg"
                  disabled={!selectedImportFile || isImporting}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {isImporting ? 'Importing package...' : 'Import package'}
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link to="/">Open decks</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="mb-3 inline-flex rounded-2xl bg-secondary p-3 text-secondary-foreground">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <CardTitle>Still local-only</CardTitle>
            <CardDescription>
              This keeps the MVP honest while still letting us pressure-test the
              real product shape with bigger datasets.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-6 text-muted-foreground">
            <p>
              The app remains device-local and offline-first. Import happens on
              this device only, inside the same Dexie stores that power normal
              deck and card CRUD.
            </p>
            <p>
              Stable IDs, timestamps, deck rows, card rows, media blobs, review
              logs, and settings stay separated so future sync work is still a
              deliberate next step instead of an accidental side effect.
            </p>
            <p>
              The point of this slice is practical: load real card volume,
              stress the deck list and study flow, and let that evidence tell us
              what needs the next polish pass.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
