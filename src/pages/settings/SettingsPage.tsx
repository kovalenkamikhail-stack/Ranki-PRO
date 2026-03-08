import { Save, ShieldCheck, SlidersHorizontal } from 'lucide-react'
import { type FormEvent, useEffect, useState } from 'react'
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
import {
  ensureStoragePersistence,
  type StoragePersistenceStatus,
} from '@/lib/storage-persistence'

const inputClassName =
  'mt-2 w-full rounded-[1.15rem] border border-input bg-background/85 px-4 py-3 text-sm text-foreground shadow-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60'

export function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [storageStatus, setStorageStatus] =
    useState<StoragePersistenceStatus | null>(null)
  const [globalNewCardsPerDay, setGlobalNewCardsPerDay] = useState('')
  const [globalMaxReviewsPerDay, setGlobalMaxReviewsPerDay] = useState('')
  const [isUnlimitedMaxReviews, setIsUnlimitedMaxReviews] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

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
          setError(
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

    if (globalNewCardsPerDay.trim() === '') {
      setError('Global new cards per day is required.')
      setSuccessMessage(null)
      return
    }

    if (!isUnlimitedMaxReviews && globalMaxReviewsPerDay.trim() === '') {
      setError('Global max reviews per day is required.')
      setSuccessMessage(null)
      return
    }

    setIsSaving(true)
    setError(null)
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
      setSuccessMessage(
        'Saved locally. New study queues will use these limits on the next load.',
      )
    } catch (nextError: unknown) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Failed to save study limits.',
      )
    } finally {
      setIsSaving(false)
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
          {error ? (
            <div
              role="alert"
              className="rounded-[1.4rem] border border-destructive/30 bg-destructive/8 p-5 text-sm text-destructive"
            >
              {error}
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
                onChange={(event) => setGlobalMaxReviewsPerDay(event.target.value)}
                disabled={isUnlimitedMaxReviews}
                className={inputClassName}
              />
            </label>

            <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4 text-sm text-muted-foreground">
              These values apply immediately to the existing study-session seam.
              Deck-level overrides remain a separate slice.
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

      <Card>
        <CardHeader>
          <div className="mb-3 inline-flex rounded-2xl bg-secondary p-3 text-secondary-foreground">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <CardTitle>Local persistence</CardTitle>
          <CardDescription>
            These controls stay device-local and offline-first.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-6 text-muted-foreground">
          <p>
            No auth, sync, analytics, import/export, or backend layers were
            introduced. The app remains local-only and offline-first.
          </p>
          <p>
            The Dexie schema already protects future sync-readiness with stable
            IDs, timestamps, and separate stores for decks, cards, media,
            review history, and settings.
          </p>
          <p>
            The next valuable study slice after this is deck-level override
            editing on top of the global limits form and the existing
            study-session seam.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
