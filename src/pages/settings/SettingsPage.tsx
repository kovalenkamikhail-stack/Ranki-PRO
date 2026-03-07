import { ShieldCheck, SlidersHorizontal } from 'lucide-react'
import { useEffect, useState } from 'react'
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
import type { AppSettings } from '@/entities/app-settings'
import {
  ensureStoragePersistence,
  type StoragePersistenceStatus,
} from '@/lib/storage-persistence'

export function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [storageStatus, setStorageStatus] =
    useState<StoragePersistenceStatus | null>(null)

  useEffect(() => {
    let isMounted = true

    void Promise.all([bootstrapAppDb(), ensureStoragePersistence()])
      .then(([nextSettings, nextStorageStatus]) => {
        if (isMounted) {
          setSettings(nextSettings)
          setStorageStatus(nextStorageStatus)
        }
      })
      .catch((nextError: unknown) => {
        if (isMounted) {
          setError(
            nextError instanceof Error
              ? nextError.message
              : 'Failed to load seeded app settings.',
          )
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <Card>
        <CardHeader>
          <div className="mb-3 inline-flex rounded-2xl bg-primary/12 p-3 text-primary">
            <SlidersHorizontal className="h-6 w-6" />
          </div>
          <CardTitle>Settings foundation</CardTitle>
          <CardDescription>
            Only the singleton settings record is live in this slice. Editing
            controls are deferred until the first real settings form pass.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="rounded-[1.4rem] border border-destructive/30 bg-destructive/8 p-5 text-sm text-destructive">
              {error}
            </div>
          ) : (
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
                <dt className="text-sm text-muted-foreground">
                  Storage mode
                </dt>
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
          )}

          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/">Back to decks</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/decks/new">Create deck</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="mb-3 inline-flex rounded-2xl bg-secondary p-3 text-secondary-foreground">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <CardTitle>Why this stops here</CardTitle>
          <CardDescription>
            This MVP still moves in narrow slices so each pass can harden one
            coherent workflow at a time.
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
            The next valuable slice is deck details plus card CRUD on top of
            the deck workspace routes already in place.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
