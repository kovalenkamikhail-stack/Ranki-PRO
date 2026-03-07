import {
  ArrowRight,
  BookMarked,
  PencilLine,
  Plus,
  Trash2,
} from 'lucide-react'
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
import { bootstrapAppDb } from '@/db/bootstrap'
import { deleteDeckCascade, listDecks } from '@/db/decks'
import type { Deck } from '@/entities/deck'

function formatUpdatedAt(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(timestamp)
}

export function HomePage() {
  const [decks, setDecks] = useState<Deck[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [deletingDeckId, setDeletingDeckId] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    void bootstrapAppDb()
      .then(() => listDecks())
      .then((nextDecks) => {
        if (isMounted) {
          setDecks(nextDecks)
          setIsLoading(false)
        }
      })
      .catch((nextError: unknown) => {
        if (isMounted) {
          setError(
            nextError instanceof Error ? nextError.message : 'Failed to load decks.',
          )
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  const handleDeleteDeck = async (deck: Deck) => {
    const confirmed = window.confirm(
      `Delete "${deck.name}" from this device? This also removes any cards and review history stored inside the deck.`,
    )

    if (!confirmed) {
      return
    }

    setDeletingDeckId(deck.id)
    setError(null)

    try {
      await deleteDeckCascade(deck.id)
      setDecks((currentDecks) =>
        currentDecks.filter((currentDeck) => currentDeck.id !== deck.id),
      )
    } catch (nextError: unknown) {
      setError(
        nextError instanceof Error ? nextError.message : 'Failed to delete deck.',
      )
    } finally {
      setDeletingDeckId(null)
    }
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <Card className="overflow-hidden">
          <CardHeader className="gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="accent">Deck CRUD</Badge>
              <Badge variant="outline">IndexedDB on this device</Badge>
            </div>

            <div className="space-y-3">
              <CardTitle className="max-w-2xl text-3xl sm:text-4xl">
                Your decks are now real local records instead of a foundation
                placeholder.
              </CardTitle>
              <CardDescription className="max-w-2xl text-base">
                Create, rename, and delete decks offline. Cards, counters, and
                study flow stay out of this slice on purpose.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="flex flex-col gap-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Decks stored
                </p>
                <p className="mt-2 text-3xl font-semibold">
                  {isLoading ? '...' : decks.length}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Local-only deck list backed by Dexie.
                </p>
              </div>

              <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Empty state rule
                </p>
                <p className="mt-2 text-xl font-semibold">Only when count is 0</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Loading and error states no longer masquerade as empty.
                </p>
              </div>

              <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Scope guard
                </p>
                <p className="mt-2 text-xl font-semibold">No cards yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  This slice stops at deck CRUD and offline persistence.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/decks/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Create deck
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/settings">Open settings</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Local-only guardrails</CardTitle>
            <CardDescription>
              The MVP still keeps data and workflows on one device.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
              <p className="font-medium">No sync or accounts</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Deck changes persist to IndexedDB and stay scoped to the current
                browser install.
              </p>
            </div>

            <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
              <p className="font-medium">Delete stays explicit</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Deck removal asks for confirmation before deleting the local
                record and its future deck-scoped data.
              </p>
            </div>

            <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
              <p className="font-medium">Later slices stay separate</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Card CRUD, counters, review queues, and analytics remain out of
                scope here.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {error ? (
        <div
          role="alert"
          className="rounded-[1.4rem] border border-destructive/30 bg-destructive/8 p-5 text-sm text-destructive"
        >
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <Card>
          <CardHeader>
            <CardTitle>Loading decks</CardTitle>
            <CardDescription>
              Reading the latest local deck list from IndexedDB.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : !error && decks.length === 0 ? (
        <Card>
          <CardContent className="p-6 sm:p-8">
            <div className="rounded-[1.8rem] border border-dashed border-border bg-background/70 p-6 sm:p-8">
              <div className="mb-4 inline-flex rounded-2xl bg-secondary p-3 text-secondary-foreground">
                <BookMarked className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-semibold tracking-tight">
                No decks yet on this device.
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                Create the first deck to start building a local study library.
                Cards and review scheduling land in later MVP slices.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild>
                  <Link to="/decks/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Create your first deck
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/settings">Inspect settings</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : decks.length > 0 ? (
        <section className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">Decks</h2>
              <p className="text-sm text-muted-foreground">
                {decks.length} {decks.length === 1 ? 'deck' : 'decks'} stored
                locally and ready for the next MVP slices.
              </p>
            </div>
            <Button asChild>
              <Link to="/decks/new">
                <Plus className="mr-2 h-4 w-4" />
                New deck
              </Link>
            </Button>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {decks.map((deck) => (
              <Card key={deck.id}>
                <CardHeader className="gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <CardTitle>{deck.name}</CardTitle>
                      <CardDescription>
                        {deck.description ??
                          'No description yet. Use this deck shell for an upcoming card slice.'}
                      </CardDescription>
                    </div>
                    <Badge variant="outline">Updated {formatUpdatedAt(deck.updatedAt)}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-[1.3rem] border border-border/70 bg-background/70 p-4 text-sm text-muted-foreground">
                    Stored locally with deck settings defaults ready. Card list,
                    counters, and study flow are still intentionally pending.
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button asChild>
                      <Link to={`/decks/${deck.id}`} aria-label={`Open ${deck.name}`}>
                        Open
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>

                    <Button asChild variant="outline">
                      <Link
                        to={`/decks/${deck.id}/edit`}
                        aria-label={`Edit ${deck.name}`}
                      >
                        <PencilLine className="mr-2 h-4 w-4" />
                        Edit
                      </Link>
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => void handleDeleteDeck(deck)}
                      disabled={deletingDeckId === deck.id}
                      aria-label={`Delete ${deck.name}`}
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {deletingDeckId === deck.id ? 'Deleting...' : 'Delete'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
