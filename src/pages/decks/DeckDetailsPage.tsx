import {
  ArrowLeft,
  BookMarked,
  CalendarClock,
  CirclePlay,
  PencilLine,
  Plus,
  Rows3,
  Trash2,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { CardBackImage } from '@/components/cards/CardBackImage'
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
import { deleteCardCascade, listCardsForDeck } from '@/db/cards'
import { getDeck } from '@/db/decks'
import { listCardBackImages, type CardBackImage as StoredCardBackImage } from '@/db/media-assets'
import {
  loadDeckStudyActivitySummary,
  type DeckStudyActivitySummary,
} from '@/db/statistics'
import { loadDeckStudySession } from '@/db/study-session'
import type { Card as DeckCard, CardState } from '@/entities/card'
import {
  DEFAULT_NEW_CARD_ORDER,
  getNewCardOrderLabel,
  type Deck,
} from '@/entities/deck'
import { getDeckStudySummary, type DeckStudySummary } from '@/pages/decks/study-summary'

const timestampFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function formatTimestamp(timestamp: number) {
  return timestampFormatter.format(timestamp)
}

const EMPTY_STUDY_SUMMARY = getDeckStudySummary(null)
const EMPTY_ACTIVITY_SUMMARY: DeckStudyActivitySummary = {
  deckId: '',
  generatedAt: 0,
  todayStart: 0,
  nextDayStart: 0,
  recentWindowStart: 0,
  recentWindowDays: 7,
  totalReviewHistoryCount: 0,
  hasAnyReviewHistory: false,
  hasRecentActivity: false,
  reviewsCompletedToday: 0,
  reviewsCompletedLast7Days: 0,
  cardsStudiedLast7Days: 0,
  lastReviewedAt: null,
}

function formatCardState(state: CardState) {
  if (state === 'learning') {
    return 'Learning'
  }

  if (state === 'review') {
    return 'Review'
  }

  return 'New'
}

function getCardStateVariant(state: CardState) {
  if (state === 'learning') {
    return 'accent' as const
  }

  if (state === 'review') {
    return 'outline' as const
  }

  return 'default' as const
}

function getPreviewText(text: string, maxLength = 160) {
  const normalized = text.trim()

  if (normalized.length <= maxLength) {
    return normalized
  }

  return `${normalized.slice(0, maxLength - 3)}...`
}

function getDueLabel(card: DeckCard) {
  if (card.dueAt === null) {
    return 'No due date yet'
  }

  return `Due ${formatTimestamp(card.dueAt)}`
}

function getCardBackImageAlt(card: DeckCard) {
  return `Back image for ${card.frontText}`
}

function getDeckActivityStatus(summary: DeckStudyActivitySummary) {
  if (!summary.hasAnyReviewHistory) {
    return {
      label: 'No saved reviews yet',
      variant: 'outline' as const,
      detail:
        'This deck still has no saved review history on this device.',
    }
  }

  if (!summary.hasRecentActivity) {
    return {
      label: 'Quiet this week',
      variant: 'outline' as const,
      detail:
        'No saved reviews landed for this deck in the last 7 local days.',
    }
  }

  return {
    label: 'Active this week',
    variant: 'accent' as const,
    detail: `${summary.reviewsCompletedLast7Days} saved review${summary.reviewsCompletedLast7Days === 1 ? '' : 's'} across ${summary.cardsStudiedLast7Days} card${summary.cardsStudiedLast7Days === 1 ? '' : 's'} in the last 7 local days.`,
  }
}

function MissingDeckIdState() {
  return (
    <Card className="mx-auto max-w-4xl">
      <CardHeader className="gap-4">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-[1.6rem] bg-destructive/12 text-destructive">
          <BookMarked className="h-7 w-7" />
        </div>
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            Deck Details
          </p>
          <CardTitle className="text-3xl">Missing deck id</CardTitle>
          <CardDescription className="text-base">
            This route needs a deck identifier before the local workspace can
            load.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <Button asChild>
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to decks
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

function DeckWorkspace({ deckId }: { deckId: string }) {
  const [deck, setDeck] = useState<Deck | null>(null)
  const [cards, setCards] = useState<DeckCard[]>([])
  const [cardBackImages, setCardBackImages] = useState<
    Map<string, StoredCardBackImage>
  >(new Map())
  const [studySummary, setStudySummary] = useState<DeckStudySummary>(
    EMPTY_STUDY_SUMMARY,
  )
  const [activitySummary, setActivitySummary] = useState<DeckStudyActivitySummary>(
    EMPTY_ACTIVITY_SUMMARY,
  )
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isMissing, setIsMissing] = useState(false)
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    void bootstrapAppDb()
      .then(() =>
        Promise.all([
          getDeck(deckId),
          listCardsForDeck(deckId),
          loadDeckStudySession(deckId),
          loadDeckStudyActivitySummary(deckId),
        ]),
      )
      .then(async ([nextDeck, nextCards, nextSession, nextActivitySummary]) => {
        if (!isMounted) {
          return
        }

        if (!nextDeck) {
          setIsMissing(true)
          return
        }

        const nextCardBackImages = await listCardBackImages(nextCards)

        if (!isMounted) {
          return
        }

        setDeck(nextDeck)
        setCards(nextCards)
        setCardBackImages(nextCardBackImages)
        setStudySummary(getDeckStudySummary(nextSession))
        setActivitySummary(nextActivitySummary)
      })
      .catch((nextError: unknown) => {
        if (isMounted) {
          setLoadError(
            nextError instanceof Error
              ? nextError.message
              : 'Failed to load deck workspace.',
          )
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [deckId])

  const handleDeleteCard = async (card: DeckCard) => {
    const confirmed = window.confirm(
      `Delete "${card.frontText}" from "${deck?.name ?? 'this deck'}" on this device?`,
    )

    if (!confirmed) {
      return
    }

    setDeletingCardId(card.id)
    setActionError(null)

    try {
      await deleteCardCascade(card.id)
      setCards((currentCards) =>
        currentCards.filter((currentCard) => currentCard.id !== card.id),
      )
      setCardBackImages((currentCardBackImages) => {
        const nextCardBackImages = new Map(currentCardBackImages)
        nextCardBackImages.delete(card.id)
        return nextCardBackImages
      })

      const refreshedDeck = await getDeck(deckId)
      const refreshedSession = await loadDeckStudySession(deckId)
      const refreshedActivitySummary = await loadDeckStudyActivitySummary(deckId)

      if (refreshedDeck) {
        setDeck(refreshedDeck)
      }

      setStudySummary(getDeckStudySummary(refreshedSession))
      setActivitySummary(refreshedActivitySummary)
    } catch (nextError: unknown) {
      setActionError(
        nextError instanceof Error ? nextError.message : 'Failed to delete card.',
      )
    } finally {
      setDeletingCardId(null)
    }
  }

  if (isLoading) {
    return (
      <Card className="mx-auto max-w-4xl">
        <CardHeader>
          <CardTitle>Loading deck workspace</CardTitle>
          <CardDescription>
            Reading the selected deck and its cards from IndexedDB.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (loadError) {
    return (
      <Card className="mx-auto max-w-4xl">
        <CardHeader className="gap-4">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-[1.6rem] bg-destructive/12 text-destructive">
            <BookMarked className="h-7 w-7" />
          </div>
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              Deck Details
            </p>
            <CardTitle className="text-3xl">Deck workspace unavailable</CardTitle>
            <CardDescription className="text-base">{loadError}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to decks
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to={`/decks/${deckId}/edit`}>
              <PencilLine className="mr-2 h-4 w-4" />
              Edit deck
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (isMissing || !deck) {
    return (
      <Card className="mx-auto max-w-4xl">
        <CardHeader className="gap-4">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-[1.6rem] bg-secondary text-secondary-foreground">
            <BookMarked className="h-7 w-7" />
          </div>
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              Deck Details
            </p>
            <CardTitle className="text-3xl">Deck not found</CardTitle>
            <CardDescription className="text-base">
              This deck is not stored on the current device anymore.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to decks
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to={`/decks/${deckId}/edit`}>
              <PencilLine className="mr-2 h-4 w-4" />
              Edit deck
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  const activityStatus = getDeckActivityStatus(activitySummary)

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="overflow-hidden">
          <CardHeader className="gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="accent">Deck workspace</Badge>
              <Badge variant="outline">Device-local Dexie</Badge>
            </div>

            <div className="space-y-3">
              <CardTitle className="text-3xl sm:text-4xl">{deck.name}</CardTitle>
              <CardDescription className="max-w-2xl text-base">
                {deck.description ??
                  'No description yet. This deck workspace is ready for text-first cards and a deck-scoped study session.'}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Due today
                </p>
                <p className="mt-2 text-3xl font-semibold">
                  {studySummary.dueCount}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Eligible due cards from the saved study queue.
                </p>
              </div>

              <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
                <p className="text-sm font-medium text-muted-foreground">
                  New today
                </p>
                <p className="mt-2 text-3xl font-semibold">
                  {studySummary.newCount}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Available new cards after current limits.
                </p>
              </div>

              <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Cards stored
                </p>
                <p className="mt-2 text-3xl font-semibold">{cards.length}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Listed directly from IndexedDB for this deck.
                </p>
              </div>
            </div>

            <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-muted-foreground">
                  Study status
                </p>
                <Badge variant={studySummary.statusVariant}>
                  {studySummary.statusLabel}
                </Badge>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {studySummary.statusDetail}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to={`/decks/${deck.id}/cards/new`}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add card
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to={`/decks/${deck.id}/edit`}>
                  <PencilLine className="mr-2 h-4 w-4" />
                  Edit deck
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to={`/decks/${deck.id}/study`}>
                  <CirclePlay className="mr-2 h-4 w-4" />
                  Start study
                </Link>
              </Button>
              <Button asChild variant="ghost" size="lg">
                <Link to="/">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to decks
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Deck context</CardTitle>
            <CardDescription>
              Recent study context and a few stable deck facts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
              <p className="text-sm font-medium text-muted-foreground">
                Activity
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant={activityStatus.variant}>{activityStatus.label}</Badge>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {activityStatus.detail}
              </p>
            </div>

            <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
              <p className="text-sm font-medium text-muted-foreground">
                Last studied
              </p>
              <p className="mt-2 text-base font-semibold">
                {activitySummary.lastReviewedAt === null
                  ? 'Not studied yet'
                  : formatTimestamp(activitySummary.lastReviewedAt)}
              </p>
            </div>

            <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
              <p className="text-sm font-medium text-muted-foreground">
                Reviews today
              </p>
              <p className="mt-2 text-base font-semibold">
                {activitySummary.reviewsCompletedToday}
              </p>
            </div>

            <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
              <p className="text-sm font-medium text-muted-foreground">
                Last 7 days
              </p>
              <p className="mt-2 text-base font-semibold">
                {activitySummary.reviewsCompletedLast7Days} reviews /{' '}
                {activitySummary.cardsStudiedLast7Days} cards
              </p>
            </div>

            <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
              <p className="text-sm font-medium text-muted-foreground">
                Limits mode
              </p>
              <p className="mt-2 text-base font-semibold">
                {deck.useGlobalLimits ? 'Global defaults' : 'Deck override'}
              </p>
            </div>

            <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
              <p className="text-sm font-medium text-muted-foreground">
                New card order
              </p>
              <p className="mt-2 text-base font-semibold">
                {getNewCardOrderLabel(
                  deck.newCardOrder ?? DEFAULT_NEW_CARD_ORDER,
                )}
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="space-y-4">
        {actionError ? (
          <div
            role="alert"
            className="rounded-[1.4rem] border border-destructive/30 bg-destructive/8 p-5 text-sm text-destructive"
          >
            {actionError}
          </div>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Cards</h2>
            <p className="text-sm text-muted-foreground">
              {cards.length === 0
                ? 'This deck is ready for its first local card.'
                : `${cards.length} ${cards.length === 1 ? 'card' : 'cards'} listed from Dexie for this deck.`}
            </p>
          </div>
          <Button asChild>
            <Link to={`/decks/${deck.id}/cards/new`}>
              <Plus className="mr-2 h-4 w-4" />
              Add card
            </Link>
          </Button>
        </div>

        {cards.length === 0 ? (
          <Card>
            <CardContent className="p-6 sm:p-8">
              <div className="rounded-[1.8rem] border border-dashed border-border bg-background/70 p-6 sm:p-8">
                <div className="mb-4 inline-flex rounded-2xl bg-secondary p-3 text-secondary-foreground">
                  <Rows3 className="h-6 w-6" />
                </div>
                <h3 className="text-2xl font-semibold tracking-tight">
                  No cards in this deck yet.
                </h3>
                <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                  The deck workspace is live, but this deck still needs its first
                  card. Add one manually and it will save locally to Dexie right
                  away.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button asChild>
                    <Link to={`/decks/${deck.id}/cards/new`}>
                      <Plus className="mr-2 h-4 w-4" />
                      Add first card
                    </Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link to={`/decks/${deck.id}/edit`}>
                      <PencilLine className="mr-2 h-4 w-4" />
                      Review deck settings
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {cards.map((card) => (
              <Card key={card.id}>
                <CardHeader className="gap-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={getCardStateVariant(card.state)}>
                          {formatCardState(card.state)}
                        </Badge>
                        <Badge variant="outline">{getDueLabel(card)}</Badge>
                      </div>
                      <CardTitle className="text-xl">{card.frontText}</CardTitle>
                    </div>

                    <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-3 py-1 text-sm text-muted-foreground">
                      <CalendarClock className="h-4 w-4" />
                      Updated {formatTimestamp(card.updatedAt)}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="rounded-[1.3rem] border border-border/70 bg-background/70 p-4">
                    <p className="text-sm font-medium text-muted-foreground">
                      Back
                    </p>
                    <p className="mt-2 text-sm leading-6 text-foreground">
                      {getPreviewText(card.backText)}
                    </p>
                    {cardBackImages.get(card.id) ? (
                      <CardBackImage
                        blob={cardBackImages.get(card.id)!.blob}
                        alt={getCardBackImageAlt(card)}
                        className="mt-4 max-h-48 w-full rounded-[1rem] border border-border/70 object-cover"
                      />
                    ) : null}
                  </div>

                  <p className="text-sm text-muted-foreground">
                    {card.backImageAssetId
                      ? 'This card keeps its optional back image local to this device. Review actions still run from the deck-scoped study route.'
                      : 'Text-only cards still work as before. Review actions now run from the deck-scoped study route.'}
                  </p>

                  <div className="flex flex-wrap gap-3">
                    <Button asChild variant="outline">
                      <Link
                        to={`/decks/${deck.id}/cards/${card.id}/edit`}
                        aria-label={`Edit ${card.frontText}`}
                      >
                        <PencilLine className="mr-2 h-4 w-4" />
                        Edit
                      </Link>
                    </Button>

                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => void handleDeleteCard(card)}
                      disabled={deletingCardId === card.id}
                      aria-label={`Delete ${card.frontText}`}
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {deletingCardId === card.id ? 'Deleting...' : 'Delete'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export function DeckDetailsPage() {
  const { deckId } = useParams()

  if (!deckId) {
    return <MissingDeckIdState />
  }

  return <DeckWorkspace key={deckId} deckId={deckId} />
}
