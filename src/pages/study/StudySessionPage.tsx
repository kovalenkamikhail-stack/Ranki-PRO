import {
  ArrowLeft,
  BookMarked,
  CheckCircle2,
  Eye,
  RotateCcw,
} from 'lucide-react'
import { type ReactNode, useEffect, useEffectEvent, useState } from 'react'
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
import { getCardBackImage, type CardBackImage as StoredCardBackImage } from '@/db/media-assets'
import {
  loadDeckStudySession,
  reviewDeckStudyCard,
  type DeckStudySessionSnapshot,
} from '@/db/study-session'
import type { ReviewRating } from '@/entities/review-log'
import { nowMs } from '@/lib/time'

const timestampFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const reviewActions: Array<{
  rating: ReviewRating
  title: string
  detail: string
  variant: 'outline' | 'secondary' | 'default'
}> = [
  {
    rating: 'again',
    title: 'Again',
    detail: '10 minutes',
    variant: 'outline',
  },
  {
    rating: 'hard',
    title: 'Hard',
    detail: '2 minutes',
    variant: 'secondary',
  },
  {
    rating: 'good',
    title: 'Good',
    detail: 'Next step',
    variant: 'default',
  },
  {
    rating: 'easy',
    title: 'Easy',
    detail: 'Jump 2 steps',
    variant: 'default',
  },
]

function formatTimestamp(timestamp: number) {
  return timestampFormatter.format(timestamp)
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
            Study Session
          </p>
          <CardTitle className="text-3xl">Missing deck id</CardTitle>
          <CardDescription className="text-base">
            This route needs a deck identifier before the local study session can
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

function SessionStateCard({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string
  title: string
  description: string
  children?: ReactNode
}) {
  return (
    <Card className="mx-auto max-w-4xl">
      <CardHeader className="gap-4">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-[1.6rem] bg-secondary text-secondary-foreground">
          <BookMarked className="h-7 w-7" />
        </div>
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            {eyebrow}
          </p>
          <CardTitle className="text-3xl">{title}</CardTitle>
          <CardDescription className="text-base">{description}</CardDescription>
        </div>
      </CardHeader>
      {children ? <CardContent>{children}</CardContent> : null}
    </Card>
  )
}

function StudySessionWorkspace({ deckId }: { deckId: string }) {
  const [session, setSession] = useState<DeckStudySessionSnapshot | null>(null)
  const [currentBackImage, setCurrentBackImage] =
    useState<StoredCardBackImage | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isMissing, setIsMissing] = useState(false)
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false)
  const [submittingRating, setSubmittingRating] = useState<ReviewRating | null>(
    null,
  )
  const previewCard = session?.currentCard ?? null

  const commitLoadedSession = useEffectEvent(
    (nextSession: DeckStudySessionSnapshot | null) => {
      if (!nextSession) {
        setSession(null)
        setIsMissing(true)
        return
      }

      setSession(nextSession)
      setIsMissing(false)
      setLoadError(null)
    },
  )

  useEffect(() => {
    let isMounted = true

    setIsLoading(true)
    setIsMissing(false)
    setLoadError(null)
    setActionError(null)

    void loadDeckStudySession(deckId)
      .then((nextSession) => {
        if (isMounted) {
          commitLoadedSession(nextSession)
        }
      })
      .catch((nextError: unknown) => {
        if (isMounted) {
          setLoadError(
            nextError instanceof Error
              ? nextError.message
              : 'Failed to load study session.',
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

  useEffect(() => {
    setIsAnswerRevealed(false)
    setActionError(null)
  }, [session?.currentCard?.id])

  useEffect(() => {
    let isMounted = true

    if (!previewCard?.backImageAssetId) {
      setCurrentBackImage(null)
      return () => {
        isMounted = false
      }
    }

    void getCardBackImage(previewCard)
      .then((nextBackImage) => {
        if (isMounted) {
          setCurrentBackImage(nextBackImage)
        }
      })
      .catch((nextError: unknown) => {
        if (isMounted) {
          setCurrentBackImage(null)
          setActionError(
            nextError instanceof Error
              ? nextError.message
              : 'Failed to load the attached back image.',
          )
        }
      })

    return () => {
      isMounted = false
    }
  }, [previewCard])

  useEffect(() => {
    if (!session || session.currentCard || session.nextDueAt === null) {
      return
    }

    const delayMs = Math.max(session.nextDueAt - nowMs(), 0)
    const timerId = window.setTimeout(() => {
      void loadDeckStudySession(deckId)
        .then((nextSession) => {
          commitLoadedSession(nextSession)
        })
        .catch((nextError: unknown) => {
          setActionError(
            nextError instanceof Error
              ? nextError.message
              : 'Failed to refresh the next due card.',
          )
        })
    }, delayMs)

    return () => {
      window.clearTimeout(timerId)
    }
  }, [deckId, session])

  const handleRating = async (rating: ReviewRating) => {
    if (!session?.currentCard) {
      return
    }

    setSubmittingRating(rating)
    setActionError(null)

    try {
      const nextSession = await reviewDeckStudyCard({
        deckId,
        cardId: session.currentCard.id,
        rating,
      })

      setSession(nextSession)
    } catch (nextError: unknown) {
      setActionError(
        nextError instanceof Error
          ? nextError.message
          : 'Failed to save the review result.',
      )
    } finally {
      setSubmittingRating(null)
    }
  }

  const handleRefreshSession = async () => {
    setActionError(null)

    try {
      const nextSession = await loadDeckStudySession(deckId)

      if (!nextSession) {
        setSession(null)
        setIsMissing(true)
        return
      }

      setSession(nextSession)
      setIsMissing(false)
      setLoadError(null)
    } catch (nextError: unknown) {
      setActionError(
        nextError instanceof Error
          ? nextError.message
          : 'Failed to refresh the study session.',
      )
    }
  }

  if (isLoading) {
    return (
      <SessionStateCard
        eyebrow="Study Session"
        title="Loading study session"
        description="Reading the selected deck, cards, and review history from IndexedDB."
      />
    )
  }

  if (loadError) {
    return (
      <SessionStateCard
        eyebrow="Study Session"
        title="Study session unavailable"
        description={loadError}
      >
        <Button asChild>
          <Link to={`/decks/${deckId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to deck
          </Link>
        </Button>
      </SessionStateCard>
    )
  }

  if (isMissing || !session) {
    return (
      <SessionStateCard
        eyebrow="Study Session"
        title="Deck not found"
        description="This deck is not stored on the current device anymore."
      >
        <Button asChild>
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to decks
          </Link>
        </Button>
      </SessionStateCard>
    )
  }

  const { deck, currentCard, cardsInDeckCount, limits, nextDueAt, queue } =
    session

  if (!currentCard) {
    const isDeckEmpty = cardsInDeckCount === 0

    return (
      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <SessionStateCard
          eyebrow="Study Session"
          title={
            isDeckEmpty
              ? 'No cards in this deck yet'
              : 'Study queue complete for now'
          }
          description={
            isDeckEmpty
              ? 'Add the first card to this deck before starting a local review session.'
              : nextDueAt === null
                ? 'There are no eligible cards left in this deck right now.'
                : `There are no eligible cards right now. The next retry becomes due at ${formatTimestamp(nextDueAt)} while this page stays open.`
          }
        >
          <div className="flex flex-wrap gap-3">
            {isDeckEmpty ? (
              <Button asChild>
                <Link to={`/decks/${deck.id}/cards/new`}>Add first card</Link>
              </Button>
            ) : (
              <Button type="button" onClick={() => void handleRefreshSession()}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Refresh queue
              </Button>
            )}
            {!isDeckEmpty ? (
              <Button asChild>
                <Link to={`/decks/${deck.id}/cards/new`}>Add another card</Link>
              </Button>
            ) : null}
            <Button asChild variant="outline">
              <Link to={`/decks/${deck.id}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to deck
              </Link>
            </Button>
          </div>
        </SessionStateCard>

        <Card>
          <CardHeader>
            <CardTitle>{deck.name}</CardTitle>
            <CardDescription>
              Deck-scoped session limits and persisted study facts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
              <p className="text-sm font-medium text-muted-foreground">
                Cards stored
              </p>
              <p className="mt-2 text-2xl font-semibold">{cardsInDeckCount}</p>
            </div>

            <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
              <p className="text-sm font-medium text-muted-foreground">
                New cards today
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {limits.introducedNewCardsToday} / {limits.newCardsPerDay}
              </p>
            </div>

            <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
              <p className="text-sm font-medium text-muted-foreground">
                Due reviews left today
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {limits.remainingReviewCardsToday === null
                  ? 'Unlimited'
                  : limits.remainingReviewCardsToday}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <Card className="overflow-hidden">
        <CardHeader className="gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="accent">Study session</Badge>
            <Badge variant="outline">Deck-scoped only</Badge>
          </div>

          <div className="space-y-3">
            <CardTitle className="text-3xl sm:text-4xl">{deck.name}</CardTitle>
            <CardDescription className="max-w-2xl text-base">
              One persisted card at a time. Reveal the answer, then rate it through
              the existing scheduler core.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
              <p className="text-sm font-medium text-muted-foreground">
                Ready now
              </p>
              <p className="mt-2 text-3xl font-semibold">{queue.cards.length}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Due cards stay ahead of new cards.
              </p>
            </div>

            <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
              <p className="text-sm font-medium text-muted-foreground">
                Due ready
              </p>
              <p className="mt-2 text-3xl font-semibold">{queue.dueCards.length}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Filtered with deck-scoped limits.
              </p>
            </div>

            <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
              <p className="text-sm font-medium text-muted-foreground">
                New ready
              </p>
              <p className="mt-2 text-3xl font-semibold">{queue.newCards.length}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Oldest-first from saved cards.
              </p>
            </div>
          </div>

          {actionError ? (
            <div
              role="alert"
              className="rounded-[1.4rem] border border-destructive/30 bg-destructive/8 p-4 text-sm text-destructive"
            >
              {actionError}
            </div>
          ) : null}

          <section className="space-y-4">
            <div className="rounded-[1.8rem] border border-border/70 bg-background/75 p-5 sm:p-6">
              <p className="text-sm font-medium uppercase tracking-[0.24em] text-muted-foreground">
                Front
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight">
                {currentCard.frontText}
              </h2>
            </div>

            {isAnswerRevealed ? (
              <div className="rounded-[1.8rem] border border-border/70 bg-secondary/35 p-5 sm:p-6">
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-muted-foreground">
                  Back
                </p>
                <p className="mt-4 text-base leading-7 text-foreground">
                  {currentCard.backText}
                </p>
                {currentBackImage ? (
                  <CardBackImage
                    blob={currentBackImage.blob}
                    alt={`Back image for ${currentCard.frontText}`}
                    className="mt-4 max-h-80 w-full rounded-[1.2rem] border border-border/70 object-cover"
                  />
                ) : null}
              </div>
            ) : (
              <Button
                type="button"
                size="lg"
                onClick={() => setIsAnswerRevealed(true)}
              >
                <Eye className="mr-2 h-4 w-4" />
                Show answer
              </Button>
            )}
          </section>

          {isAnswerRevealed ? (
            <section className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RotateCcw className="h-4 w-4" />
                Persist one rating, then advance to the next eligible card.
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {reviewActions.map((action) => (
                  <Button
                    key={action.rating}
                    type="button"
                    aria-label={action.title}
                    size="lg"
                    variant={action.variant}
                    disabled={submittingRating !== null}
                    onClick={() => void handleRating(action.rating)}
                    className="h-auto min-h-24 flex-col items-start rounded-[1.4rem] px-5 py-4 text-left"
                  >
                    <span className="text-base font-semibold">{action.title}</span>
                    <span className="mt-1 text-sm opacity-80">{action.detail}</span>
                    <span className="mt-3 text-xs uppercase tracking-[0.2em] opacity-60">
                      {submittingRating === action.rating ? 'Saving' : 'Rate card'}
                    </span>
                  </Button>
                ))}
              </div>
            </section>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <Button asChild variant="ghost" size="lg">
              <Link to={`/decks/${deck.id}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to deck
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Session facts</CardTitle>
          <CardDescription>
            Persisted queue state for this deck on the current device.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
            <p className="text-sm font-medium text-muted-foreground">
              Current card state
            </p>
            <p className="mt-2 text-xl font-semibold capitalize">
              {currentCard.state}
            </p>
          </div>

          <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
            <p className="text-sm font-medium text-muted-foreground">
              New cards today
            </p>
            <p className="mt-2 text-xl font-semibold">
              {limits.introducedNewCardsToday} / {limits.newCardsPerDay}
            </p>
          </div>

          <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
            <p className="text-sm font-medium text-muted-foreground">
              Due reviews left today
            </p>
            <p className="mt-2 text-xl font-semibold">
              {limits.remainingReviewCardsToday === null
                ? 'Unlimited'
                : limits.remainingReviewCardsToday}
            </p>
          </div>

          <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
            <p className="text-sm font-medium text-muted-foreground">Next retry</p>
            <p className="mt-2 text-xl font-semibold">
              {nextDueAt === null ? 'None scheduled' : formatTimestamp(nextDueAt)}
            </p>
          </div>

          <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4 text-sm leading-6 text-muted-foreground">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none" />
              <p>
                Ratings save card state and append a ReviewLog entry in Dexie before
                the queue reloads.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function StudySessionPage() {
  const { deckId } = useParams()

  if (!deckId) {
    return <MissingDeckIdState />
  }

  return <StudySessionWorkspace key={deckId} deckId={deckId} />
}
