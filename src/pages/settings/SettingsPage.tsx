import {
  Download,
  HardDrive,
  Save,
  SlidersHorizontal,
  Smartphone,
  Upload,
  WifiOff,
} from 'lucide-react'
import { type ChangeEvent, type FormEvent, type ReactNode, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { PageIntro, PageScaffold } from '@/app/shell/PageScaffold'
import { Badge } from '@/components/ui/badge'
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
  'mt-3 w-full rounded-[1.3rem] border border-input bg-background/90 px-4 py-3 text-sm text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/35 disabled:cursor-not-allowed disabled:opacity-60'

function StatusRow({
  icon,
  label,
  description,
  value,
}: {
  icon: ReactNode
  label: string
  description: ReactNode
  value: ReactNode
}) {
  return (
    <div className="rounded-[1.35rem] border border-border/70 bg-background/72 px-4 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          <div className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            {icon}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">{label}</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {description}
            </p>
          </div>
        </div>
        <div className="shrink-0 rounded-full border border-border/70 bg-background/85 px-3 py-1.5 text-sm font-medium text-foreground">
          {value}
        </div>
      </div>
    </div>
  )
}

function SettingFieldCard({
  title,
  description,
  savedValue,
  children,
}: {
  title: string
  description: string
  savedValue: ReactNode
  children: ReactNode
}) {
  return (
    <div className="rounded-[1.5rem] border border-border/70 bg-background/72 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
        <div className="shrink-0 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary">
          {savedValue}
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  )
}

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

  const handleDiscardChanges = () => {
    if (!settings) {
      return
    }

    syncFormFromSettings(settings)
    setSettingsError(null)
    setSuccessMessage(null)
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

  const storageDurabilityLabel =
    storageStatus === 'granted'
      ? 'Persistent'
      : storageStatus === 'best-effort'
        ? 'Best-effort'
        : storageStatus === 'unsupported'
          ? 'Unsupported'
          : 'Checking...'

  const savedMaxReviewsLabel =
    settings?.globalMaxReviewsPerDay === null
      ? 'Unlimited'
      : settings?.globalMaxReviewsPerDay ?? '...'

  const importStatusLabel = isImporting
    ? 'Importing'
    : selectedImportFile
      ? selectedImportFile.name
      : importSummary
        ? 'Last import ready'
        : 'No file selected'

  const isDirty =
    settings !== null &&
    (globalNewCardsPerDay !== String(settings.globalNewCardsPerDay) ||
      isUnlimitedMaxReviews !== (settings.globalMaxReviewsPerDay === null) ||
      globalMaxReviewsPerDay !==
        String(settings.globalMaxReviewsPerDay ?? ''))

  return (
    <PageScaffold
      header={
        <PageIntro
          eyebrow="Settings"
          title="Settings"
          description="Tailor your sanctuary for maximum cognitive flow with real study defaults, honest offline messaging, and local-only migration tools."
          badges={
            <>
              <Badge variant="accent">Core MVP</Badge>
              <Badge variant="outline">Deck-first settings</Badge>
              <Badge variant="outline">Device-local only</Badge>
            </>
          }
        />
      }
      list={
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="mb-3 inline-flex rounded-2xl bg-primary/12 p-3 text-primary">
                <SlidersHorizontal className="h-6 w-6" />
              </div>
              <CardTitle>Global Study Defaults</CardTitle>
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
                <div className="grid gap-4 md:grid-cols-2">
                  <SettingFieldCard
                    title="New cards per day"
                    description="Limit daily exposure to new material."
                    savedValue={settings?.globalNewCardsPerDay ?? '...'}
                  >
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
                  </SettingFieldCard>

                  <SettingFieldCard
                    title="Max reviews per day"
                    description="Cap the total number of review sessions."
                    savedValue={savedMaxReviewsLabel}
                  >
                    <label className="flex items-start gap-3 rounded-[1.2rem] border border-border/70 bg-background/85 p-3.5 text-sm font-medium text-foreground">
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
                  </SettingFieldCard>
                </div>

                <div className="rounded-[1.4rem] border border-border/70 bg-background/72 p-4 text-sm leading-6 text-muted-foreground">
                  These values apply immediately to the existing study-session seam.
                  Deck-level overrides are configured from the deck editor.
                </div>

                <div className="flex flex-col gap-3 border-t border-border/70 pt-2 sm:flex-row sm:items-center sm:justify-between">
                  <Button asChild variant="outline" size="lg">
                    <Link to="/">Back to decks</Link>
                  </Button>

                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button
                      type="button"
                      variant="ghost"
                      size="lg"
                      disabled={!isDirty || isSaving}
                      onClick={handleDiscardChanges}
                    >
                      Discard changes
                    </Button>
                    <Button type="submit" size="lg" disabled={isSaving}>
                      <Save className="mr-2 h-4 w-4" />
                      {isSaving ? 'Saving settings...' : 'Save settings'}
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="mb-3 inline-flex rounded-2xl bg-primary/12 p-3 text-primary">
                <Upload className="h-6 w-6" />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="accent">Optional extra</Badge>
                <Badge variant="outline">Local migration utility</Badge>
              </div>
              <CardTitle>Import Anki package preview</CardTitle>
              <CardDescription>
                Load a local `.apkg` deck into Ranki when you need extra card
                volume on this device. Decks, manual cards, and deck-scoped study
                still define the MVP core flow.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <StatusRow
                icon={<Upload className="h-4 w-4" />}
                label="Import status"
                description="This importer is a side utility for local testing and migration, not part of the core Ranki workflow."
                value={importStatusLabel}
              />

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
                        <Link
                          className="underline underline-offset-4"
                          to={`/decks/${deck.id}`}
                        >
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

                <div className="rounded-[1.4rem] border border-border/70 bg-background/72 p-4 text-sm leading-6 text-muted-foreground">
                  For the current English Template import, Ranki preserves the
                  expression, cleaned meaning, sentence translation, one sentence of
                  context, and one back image when present. Audio, source links, and
                  Anki scheduling are still intentionally left out.
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
        </div>
      }
      detail={
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="mb-3 inline-flex rounded-2xl bg-primary/12 p-3 text-primary">
                <Download className="h-6 w-6" />
              </div>
              <CardTitle>Install and offline use</CardTitle>
              <CardDescription>
                Practical PWA guidance for desktop browsers and iPhone, plus an
                honest reminder of what stays local.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <StatusRow
                icon={<Download className="h-4 w-4" />}
                label="Desktop install"
                description="If your browser shows an install-app icon in the address bar or menu, use it to install Ranki."
                value="Browser install"
              />

              <StatusRow
                icon={<Smartphone className="h-4 w-4" />}
                label="iPhone install"
                description={
                  <>
                    Open Ranki in Safari, tap <span className="font-medium">Share</span>, then choose{' '}
                    <span className="font-medium">Add to Home Screen</span>.
                  </>
                }
                value="Safari"
              />

              <StatusRow
                icon={<WifiOff className="h-4 w-4" />}
                label="Offline expectations"
                description="After the app has loaded and the PWA shell is cached, reopening Ranki offline should still show your saved local decks, cards, and review progress."
                value="After first load"
              />

              <StatusRow
                icon={<HardDrive className="h-4 w-4" />}
                label="What stays local"
                description="Decks, cards, media, review logs, and settings are saved on this device only. Ranki still has no account system or sync."
                value="Device-local only"
              />

              <StatusRow
                icon={<HardDrive className="h-4 w-4" />}
                label="Local Storage Durability"
                description="Browser persistence for offline sessions."
                value={storageDurabilityLabel}
              />

              <div className="rounded-[1.4rem] border border-border/70 bg-background/72 p-4 text-sm leading-6 text-muted-foreground">
                Storage durability is currently <span className="font-medium text-foreground">{storageDurabilityLabel}</span>.
                If the browser clears site data, or the device/browser storage is
                reset, local Ranki data can be lost because this MVP does not have
                backup or sync yet.
              </div>
            </CardContent>
          </Card>
        </div>
      }
      layout="detail"
    />
  )
}
