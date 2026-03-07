import { BookMarked, DatabaseZap, Download, Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { getFoundationSnapshot } from '@/db/bootstrap'
import type { AppSettings } from '@/entities/app-settings'
import {
  ensureStoragePersistence,
  type StoragePersistenceStatus,
} from '@/lib/storage-persistence'

interface FoundationSnapshot {
  deckCount: number
  settings: AppSettings
  storageStatus: StoragePersistenceStatus
}

const routeMap = [
  { label: 'Deck Details', href: '/decks/demo-deck' },
  { label: 'Create Deck', href: '/decks/new' },
  { label: 'Study Session', href: '/decks/demo-deck/study' },
  { label: 'Add Card', href: '/decks/demo-deck/cards/new' },
  { label: 'Edit Card', href: '/cards/demo-card/edit' },
  { label: 'Settings', href: '/settings' },
] as const

export function HomePage() {
  const [snapshot, setSnapshot] = useState<FoundationSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isOnline, setIsOnline] = useState(() => window.navigator.onLine)

  useEffect(() => {
    let isMounted = true

    const syncConnectionState = () => {
      setIsOnline(window.navigator.onLine)
    }

    window.addEventListener('online', syncConnectionState)
    window.addEventListener('offline', syncConnectionState)

    void Promise.all([getFoundationSnapshot(), ensureStoragePersistence()])
      .then(([nextSnapshot, storageStatus]) => {
        if (isMounted) {
          setSnapshot({
            ...nextSnapshot,
            storageStatus,
          })
        }
      })
      .catch((nextError: unknown) => {
        if (isMounted) {
          setError(
            nextError instanceof Error
              ? nextError.message
              : 'Failed to initialize local app data.',
          )
        }
      })

    return () => {
      isMounted = false
      window.removeEventListener('online', syncConnectionState)
      window.removeEventListener('offline', syncConnectionState)
    }
  }, [])

  return (
    <div className="space-y-6">
      <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <Card className="overflow-hidden">
          <CardHeader className="gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="accent">Offline-first foundation</Badge>
              <Badge variant="outline">
                {isOnline ? 'Currently online' : 'Currently offline'}
              </Badge>
            </div>

            <div className="space-y-3">
              <CardTitle className="max-w-2xl text-3xl sm:text-4xl">
                Ranki now boots as a real local app shell instead of a docs-only
                repo.
              </CardTitle>
              <CardDescription className="max-w-2xl text-base">
                The foundation slice ships the installable PWA frame, the Dexie
                schema for all MVP entities, and route boundaries for each
                required screen without pulling deck or study logic too early.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="flex flex-col gap-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
                <div className="mb-3 inline-flex rounded-2xl bg-primary/12 p-2 text-primary">
                  <Download className="h-5 w-5" />
                </div>
                <p className="font-medium">App shell cached</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  `vite-plugin-pwa` is wired for installable, offline reopening.
                </p>
              </div>

              <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
                <div className="mb-3 inline-flex rounded-2xl bg-primary/12 p-2 text-primary">
                  <DatabaseZap className="h-5 w-5" />
                </div>
                <p className="font-medium">Dexie schema seeded</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  All MVP entities exist, with `app_settings` bootstrapped on
                  first launch.
                </p>
              </div>

              <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
                <div className="mb-3 inline-flex rounded-2xl bg-primary/12 p-2 text-primary">
                  <Sparkles className="h-5 w-5" />
                </div>
                <p className="font-medium">UI base in place</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tailwind v4 and shadcn/ui primitives are ready for the next
                  vertical slices.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/decks/new">Open the first deck form route</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/settings">Inspect seeded settings</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Local snapshot</CardTitle>
            <CardDescription>
              This is what the offline foundation can already prove after the
              first launch.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
              <p className="text-sm font-medium text-muted-foreground">
                Deck count
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {snapshot ? snapshot.deckCount : '...'}
              </p>
            </div>

            <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
              <p className="text-sm font-medium text-muted-foreground">
                Global daily new cards
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {snapshot ? snapshot.settings.globalNewCardsPerDay : '...'}
              </p>
            </div>

            <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
              <p className="text-sm font-medium text-muted-foreground">
                Max daily reviews
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {snapshot?.settings.globalMaxReviewsPerDay ?? 'Unlimited'}
              </p>
            </div>

            <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
              <p className="text-sm font-medium text-muted-foreground">
                Storage durability
              </p>
              <p className="mt-2 text-xl font-semibold">
                {snapshot
                  ? snapshot.storageStatus === 'granted'
                    ? 'Persistence granted'
                    : snapshot.storageStatus === 'best-effort'
                      ? 'Best-effort only'
                      : 'Persistence unsupported'
                  : '...'}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <CardTitle>Decks home state</CardTitle>
            <CardDescription>
              There is no deck CRUD in this slice yet. The empty state is
              intentional and already connected to local storage.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error ? (
              <div className="rounded-[1.4rem] border border-destructive/30 bg-destructive/8 p-5 text-sm text-destructive">
                {error}
              </div>
            ) : (
              <div className="rounded-[1.8rem] border border-dashed border-border bg-background/70 p-6 sm:p-8">
                <div className="mb-4 inline-flex rounded-2xl bg-secondary p-3 text-secondary-foreground">
                  <BookMarked className="h-6 w-6" />
                </div>
                <h2 className="text-2xl font-semibold tracking-tight">
                  No decks yet on this device.
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                  The next slice will turn this into real deck CRUD. For now,
                  the route map, offline shell, and Dexie stores are ready.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button asChild>
                    <Link to="/decks/new">Visit deck creation route</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to="/settings">View seeded defaults</Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reserved route map</CardTitle>
            <CardDescription>
              Every required MVP screen already has a stable URL boundary.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            {routeMap.map((route) => (
              <Link
                key={route.href}
                to={route.href}
                className="rounded-[1.3rem] border border-border/70 bg-background/75 p-4 transition-transform hover:-translate-y-0.5 hover:bg-accent/60"
              >
                <p className="font-medium">{route.label}</p>
                <p className="mt-1 text-sm text-muted-foreground">{route.href}</p>
              </Link>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
