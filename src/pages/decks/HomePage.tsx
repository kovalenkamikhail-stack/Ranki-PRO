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
import {
  loadStudyActivityStatistics,
  type ActiveDeckStudyActivity,
  type StudyActivityStatistics,
} from '@/db/statistics'
import { loadDeckStudySession } from '@/db/study-session'
import type { Deck } from '@/entities/deck'
import { getDeckStudySummary, type DeckStudySummary } from '@/pages/decks/study-summary'

const EMPTY_STUDY_SUMMARY = getDeckStudySummary(null)

function formatUpdatedAt(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(timestamp)
}

function getDeckActivityById(statistics: StudyActivityStatistics | null) {
  return new Map(
    (statistics?.mostActiveDecksLast7Days ?? []).map((deckActivity) => [
      deckActivity.deckId,
      deckActivity,
    ]),
  )
}

function getHomeStudyPulseDetail(statistics: StudyActivityStatistics | null) {
  if (!statistics || !statistics.hasAnyReviewHistory) {
    return 'No saved reviews yet. Home stays deck-first until the first study session lands on this device.'
  }

  const mostActiveDeck = statistics.mostActiveDecksLast7Days[0]

  if (!mostActiveDeck) {
    return 'Review history exists on this device, but nothing landed in the recent seven-day window.'
  }

  return `${mostActiveDeck.deckName} is the most active deck this week with ${mostActiveDeck.reviewCount} saved reviews across ${mostActiveDeck.cardsStudiedCount} cards.`
}

function getDeckRecentActivitySummary({
  deckActivity,
  statistics,
}: {
  deckActivity: ActiveDeckStudyActivity | undefined
  statistics: StudyActivityStatistics | null
}) {
  if (!statistics || !statistics.hasAnyReviewHistory) {
    return {
      badgeLabel: 'No saved reviews yet',
      badgeVariant: 'outline' as const,
      detail:
        'This deck still has no saved review history on this device.',
    }
  }

  if (!deckActivity) {
    return {
      badgeLabel: 'Quiet this week',
      badgeVariant: 'outline' as const,
      detail:
        'No saved review activity for this deck in the last 7 local days.',
    }
  }

  return {
    badgeLabel: 'Active this week',
    badgeVariant: 'accent' as const,
    detail: `${deckActivity.reviewCount} saved reviews across ${deckActivity.cardsStudiedCount} cards in the last 7 local days. Last studied ${formatUpdatedAt(deckActivity.lastReviewedAt)}.`,
  }
}

export function HomePage() {
  const [decks, setDecks] = useState<Deck[]>([])
  const [studySummaryByDeckId, setStudySummaryByDeckId] = useState<
    Record<string, DeckStudySummary>
  >({})
  const [statistics, setStatistics] = useState<StudyActivityStatistics | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [deletingDeckId, setDeletingDeckId] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    void bootstrapAppDb()
      .then(() => Promise.all([listDecks(), loadStudyActivityStatistics()]))
      .then(async ([nextDecks, nextStatistics]) => {
        const studySummaryEntries = await Promise.all(
          nextDecks.map(async (deck) => {
            const session = await loadDeckStudySession(deck.id)

            return [deck.id, getDeckStudySummary(session)] as const
          }),
        )

        if (isMounted) {
          setDecks(nextDecks)
          setStudySummaryByDeckId(Object.fromEntries(studySummaryEntries))
          setStatistics(nextStatistics)
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

  const deckActivityById = getDeckActivityById(statistics)

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
      setStudySummaryByDeckId((currentCounts) => {
        const nextCounts = { ...currentCounts }
        delete nextCounts[deck.id]
        return nextCounts
      })
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
              <Badge variant="accent">Deck-first MVP</Badge>
              <Badge variant="outline">IndexedDB on this device</Badge>
            </div>

            <div className="space-y-3">
              <CardTitle className="max-w-2xl text-3xl sm:text-4xl">
                Decks stay at the center of Ranki&apos;s MVP.
              </CardTitle>
              <CardDescription className="max-w-2xl text-base">
                Create, rename, and manage decks offline. Each deck opens into
                a local workspace for manual card work and deck-scoped study,
                while extra surfaces stay nearby without replacing the core flow.
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
                  Study scope
                </p>
                <p className="mt-2 text-xl font-semibold">One deck at a time</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Due and new counters stay tied to the selected deck queue.
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
            <CardTitle>Study pulse</CardTitle>
            <CardDescription>
              Compact recent-study signals from saved local review logs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
              <p className="text-sm font-medium text-muted-foreground">
                Reviews today
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {isLoading ? '...' : (statistics?.reviewsCompletedToday ?? 0)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Saved rating actions completed since local midnight.
              </p>
            </div>

            <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
              <p className="text-sm font-medium text-muted-foreground">
                Reviews in last 7 days
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {isLoading ? '...' : (statistics?.reviewsCompletedLast7Days ?? 0)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Saved review events in the recent local window.
              </p>
            </div>

            <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
              <p className="text-sm font-medium text-muted-foreground">
                Active decks in last 7 days
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {isLoading ? '...' : (statistics?.activeDeckCountLast7Days ?? 0)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Decks with at least one saved review in the recent window.
              </p>
            </div>

            <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4 text-sm leading-6 text-muted-foreground">
              {getHomeStudyPulseDetail(statistics)}
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
                Create the first deck to start a local flashcards library. Each
                deck opens into its own workspace for cards and deck-scoped
                review, with progress saved on this device.
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
                locally and ready for deck-scoped study.
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
            {decks.map((deck) => {
              const studySummary =
                studySummaryByDeckId[deck.id] ?? EMPTY_STUDY_SUMMARY

              return (
                <Card key={deck.id}>
                  <CardHeader className="gap-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-2">
                        <CardTitle>{deck.name}</CardTitle>
                        <CardDescription>
                          {deck.description ??
                            'No description yet. Add cards when you are ready to study this deck.'}
                        </CardDescription>
                      </div>
                      <Badge variant="outline">
                        Updated {formatUpdatedAt(deck.updatedAt)}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {(() => {
                      const deckActivity = deckActivityById.get(deck.id)
                      const recentActivitySummary = getDeckRecentActivitySummary({
                        deckActivity,
                        statistics,
                      })

                      return (
                        <div className="rounded-[1.3rem] border border-border/70 bg-background/70 p-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium text-muted-foreground">
                              Recent study
                            </p>
                            <Badge variant={recentActivitySummary.badgeVariant}>
                              {recentActivitySummary.badgeLabel}
                            </Badge>
                          </div>
                          <p className="mt-3 text-sm leading-6 text-muted-foreground">
                            {recentActivitySummary.detail}
                          </p>
                        </div>
                      )
                    })()}

                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="outline">Due {studySummary.dueCount}</Badge>
                      <Badge variant="outline">New {studySummary.newCount}</Badge>
                      <Badge variant={studySummary.statusVariant}>
                        {studySummary.statusLabel}
                      </Badge>
                    </div>

                    <p className="text-sm text-muted-foreground">
                      {studySummary.statusDetail}
                    </p>

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
              )
            })}
          </div>
        </section>
      ) : null}
    </div>
  )
}
