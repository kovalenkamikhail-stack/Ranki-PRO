import {
  ArrowLeft,
  BookMarked,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Eye,
  Image,
  LoaderCircle,
  RefreshCw,
  RotateCcw,
  Sparkles,
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
import type { CardState } from '@/entities/card'
import type { ReviewRating } from '@/entities/review-log'
import { nowMs } from '@/lib/time'
import { cn } from '@/lib/utils'

const timestampFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const reviewActions: Array<{
  rating: ReviewRating
  title: string
  detail: string
  summary: string
  footer: string
  variant: 'outline' | 'secondary' | 'default'
  className: string
  badgeClassName: string
}> = [
  {
    rating: 'again',
    title: 'Again',
    detail: '10 minutes',
    summary: 'Reset this card and bring it back later today.',
    footer: 'Restart the ladder',
    variant: 'outline',
    className:
      'border-rose-500/25 bg-rose-500/[0.07] text-rose-950 shadow-none hover:bg-rose-500/[0.11] dark:border-rose-300/20 dark:bg-rose-300/[0.08] dark:text-rose-50 dark:hover:bg-rose-300/[0.12]',
    badgeClassName:
      'bg-rose-500/12 text-rose-700 dark:bg-rose-300/16 dark:text-rose-100',
  },
  {
    rating: 'hard',
    title: 'Hard',
    detail: '2 minutes',
    summary: 'Keep the same long-term step and retry soon.',
    footer: 'Short retry',
    variant: 'secondary',
    className:
      'border-amber-500/25 bg-amber-500/[0.08] text-amber-950 shadow-none hover:bg-amber-500/[0.12] dark:border-amber-300/20 dark:bg-amber-300/[0.09] dark:text-amber-50 dark:hover:bg-amber-300/[0.14]',
    badgeClassName:
      'bg-amber-500/12 text-amber-800 dark:bg-amber-300/16 dark:text-amber-100',
  },
  {
    rating: 'good',
    title: 'Good',
    detail: 'Next step',
    summary: 'Move one long-term step forward.',
    footer: 'Steady progress',
    variant: 'default',
    className:
      'border-primary/70 bg-primary text-primary-foreground shadow-lg shadow-primary/18 hover:bg-primary/92',
    badgeClassName: 'bg-white/16 text-primary-foreground/92',
  },
  {
    rating: 'easy',
    title: 'Easy',
    detail: 'Jump 2 steps',
    summary: 'Jump two long-term steps ahead.',
    footer: 'Faster advance',
    variant: 'default',
    className:
      'border-sky-500/25 bg-sky-500/[0.09] text-sky-950 shadow-none hover:bg-sky-500/[0.13] dark:border-sky-300/20 dark:bg-sky-300/[0.1] dark:text-sky-50 dark:hover:bg-sky-300/[0.15]',
    badgeClassName:
      'bg-sky-500/12 text-sky-700 dark:bg-sky-300/18 dark:text-sky-100',
  },
]

function formatTimestamp(timestamp: number) {
  return timestampFormatter.format(timestamp)
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

function formatCountdown(targetTimestamp: number, currentTimestamp: number) {
  const remainingMs = Math.max(targetTimestamp - currentTimestamp, 0)
  const totalSeconds = Math.max(Math.ceil(remainingMs / 1_000), 0)

  if (totalSeconds < 60) {
    return `${Math.max(totalSeconds, 1)}s`
  }

  const hours = Math.floor(totalSeconds / 3_600)
  const minutes = Math.floor((totalSeconds % 3_600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
  }

  return `${minutes}m ${seconds.toString().padStart(2, '0')}s`
}

function MetricTile({
  label,
  value,
  detail,
  className,
  valueClassName,
}: {
  label: string
  value: ReactNode
  detail: string
  className?: string
  valueClassName?: string
}) {
  return (
    <div
      className={cn(
        'rounded-[1.5rem] border border-border/70 bg-background/78 p-4 shadow-[0_10px_32px_rgba(18,35,33,0.05)]',
        className,
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
        {label}
      </p>
      <p
        className={cn(
          'mt-3 text-2xl font-semibold tracking-tight text-foreground',
          valueClassName,
        )}
      >
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</p>
    </div>
  )
}

function MissingDeckIdState() {
  return (
    <SessionStateCard
      eyebrow="Study Session"
      title="Missing deck id"
      description="Open study from a deck so the session stays scoped to one deck at a time."
      icon={<BookMarked className="h-7 w-7" />}
      iconClassName="bg-destructive/12 text-destructive"
    >
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link to="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to decks
          </Link>
        </Button>
      </div>
    </SessionStateCard>
  )
}

function SessionStateCard({
  eyebrow,
  title,
  description,
  icon,
  iconClassName,
  children,
}: {
  eyebrow: string
  title: string
  description: string
  icon: ReactNode
  iconClassName?: string
  children?: ReactNode
}) {
  return (
    <Card className="study-state-enter mx-auto max-w-4xl overflow-hidden">
      <CardHeader className="relative gap-5 overflow-hidden border-b border-border/50 bg-card/72">
        <div className="pointer-events-none absolute -right-14 -top-14 h-36 w-36 rounded-full bg-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute left-8 top-4 h-16 w-16 rounded-full bg-accent/25 blur-2xl" />
        <div
          className={cn(
            'relative inline-flex h-14 w-14 items-center justify-center rounded-[1.6rem] bg-secondary text-secondary-foreground shadow-[0_10px_30px_rgba(18,35,33,0.08)]',
            iconClassName,
          )}
        >
          {icon}
        </div>
        <div className="relative space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            {eyebrow}
          </p>
          <CardTitle className="text-3xl sm:text-[2.15rem]">{title}</CardTitle>
          <CardDescription className="max-w-2xl text-base">
            {description}
          </CardDescription>
        </div>
      </CardHeader>
      {children ? <CardContent className="pt-6">{children}</CardContent> : null}
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
  const [isBackImageLoading, setIsBackImageLoading] = useState(false)
  const [isRefreshingSession, setIsRefreshingSession] = useState(false)
  const [waitingNow, setWaitingNow] = useState(() => nowMs())
  const [submittingRating, setSubmittingRating] = useState<ReviewRating | null>(
    null,
  )
  const previewCard = session?.currentCard ?? null
  const waitingNextDueAt =
    session?.currentCard || session?.nextDueAt === null
      ? null
      : session?.nextDueAt

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
      setIsBackImageLoading(false)
      return () => {
        isMounted = false
      }
    }

    setCurrentBackImage(null)
    setIsBackImageLoading(true)

    void getCardBackImage(previewCard)
      .then((nextBackImage) => {
        if (isMounted) {
          setCurrentBackImage(nextBackImage)
          setIsBackImageLoading(false)
        }
      })
      .catch((nextError: unknown) => {
        if (isMounted) {
          setCurrentBackImage(null)
          setIsBackImageLoading(false)
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

  useEffect(() => {
    if (waitingNextDueAt === null) {
      return
    }

    setWaitingNow(nowMs())
    const intervalId = window.setInterval(() => {
      setWaitingNow(nowMs())
    }, 1_000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [waitingNextDueAt])

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
    setIsRefreshingSession(true)

    try {
      const nextSession = await loadDeckStudySession(deckId)

      if (!nextSession) {
        setSession(null)
        setIsMissing(true)
        setLoadError(null)
        return
      }

      setSession(nextSession)
      setIsMissing(false)
      setLoadError(null)
    } catch (nextError: unknown) {
      const message =
        nextError instanceof Error
          ? nextError.message
          : 'Failed to refresh the study session.'

      if (loadError) {
        setLoadError(message)
      } else {
        setActionError(message)
      }
    } finally {
      setIsRefreshingSession(false)
    }
  }

  if (isLoading) {
    return (
      <SessionStateCard
        eyebrow="Study Session"
        title="Preparing your study session"
        description="Reading the selected deck, its saved study progress, and the next eligible card from this device."
        icon={<LoaderCircle className="h-7 w-7 motion-safe:animate-spin" />}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[1.5rem] border border-border/70 bg-background/72 p-4 motion-safe:animate-pulse motion-reduce:animate-none">
            <div className="h-3 w-24 rounded-full bg-muted" />
            <div className="mt-4 h-8 w-16 rounded-full bg-muted" />
            <div className="mt-3 h-3 w-full rounded-full bg-muted" />
          </div>
          <div className="rounded-[1.5rem] border border-border/70 bg-background/72 p-4 motion-safe:animate-pulse motion-reduce:animate-none">
            <div className="h-3 w-20 rounded-full bg-muted" />
            <div className="mt-4 h-8 w-12 rounded-full bg-muted" />
            <div className="mt-3 h-3 w-5/6 rounded-full bg-muted" />
          </div>
          <div className="rounded-[1.5rem] border border-border/70 bg-background/72 p-4 motion-safe:animate-pulse motion-reduce:animate-none">
            <div className="h-3 w-24 rounded-full bg-muted" />
            <div className="mt-4 h-8 w-24 rounded-full bg-muted" />
            <div className="mt-3 h-3 w-2/3 rounded-full bg-muted" />
          </div>
        </div>
      </SessionStateCard>
    )
  }

  if (loadError) {
    return (
      <SessionStateCard
        eyebrow="Study Session"
        title="Study session unavailable"
        description={loadError}
        icon={<CircleAlert className="h-7 w-7" />}
        iconClassName="bg-destructive/12 text-destructive"
      >
        <div className="flex flex-wrap gap-3">
          <Button
            type="button"
            onClick={() => void handleRefreshSession()}
            disabled={isRefreshingSession}
          >
            <RefreshCw
              className={cn(
                'mr-2 h-4 w-4',
                isRefreshingSession && 'motion-safe:animate-spin',
              )}
            />
            {isRefreshingSession ? 'Retrying' : 'Retry'}
          </Button>
          <Button asChild variant="outline">
            <Link to={`/decks/${deckId}`}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to deck
            </Link>
          </Button>
        </div>
      </SessionStateCard>
    )
  }

  if (isMissing || !session) {
    return (
      <SessionStateCard
        eyebrow="Study Session"
        title="Deck not found"
        description="This deck is not stored on the current device anymore."
        icon={<BookMarked className="h-7 w-7" />}
      >
        <div className="flex flex-wrap gap-3">
          <Button asChild>
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to decks
            </Link>
          </Button>
        </div>
      </SessionStateCard>
    )
  }

  const { deck, currentCard, cardsInDeckCount, limits, nextDueAt, queue } =
    session
  const waitingCountdown =
    currentCard || nextDueAt === null
      ? null
      : formatCountdown(nextDueAt, waitingNow)

  if (!currentCard) {
    const isDeckEmpty = cardsInDeckCount === 0
    const isWaitingForRetry = !isDeckEmpty && nextDueAt !== null

    return (
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_20rem]">
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
              : isWaitingForRetry
                ? `You are caught up for the moment. The next retry unlocks at ${formatTimestamp(nextDueAt!)}.`
                : 'There are no eligible cards left in this deck right now.'
          }
          icon={
            isDeckEmpty ? (
              <BookMarked className="h-7 w-7" />
            ) : isWaitingForRetry ? (
              <Clock3 className="h-7 w-7" />
            ) : (
              <CheckCircle2 className="h-7 w-7" />
            )
          }
          iconClassName={
            isDeckEmpty
              ? undefined
              : isWaitingForRetry
                ? 'bg-primary/14 text-primary'
                : 'bg-accent/80 text-accent-foreground'
          }
        >
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricTile
              label="Cards in deck"
              value={cardsInDeckCount}
              detail="Everything here stays local to this device."
            />
            <MetricTile
              label="New introduced"
              value={`${limits.introducedNewCardsToday} / ${limits.newCardsPerDay}`}
              detail="Today's new-card budget for this deck."
            />
            <MetricTile
              label={isWaitingForRetry ? 'Auto-refresh' : 'Due reviews left'}
              value={
                isWaitingForRetry
                  ? waitingCountdown ?? formatTimestamp(nextDueAt!)
                  : limits.remainingReviewCardsToday === null
                    ? 'Unlimited'
                    : limits.remainingReviewCardsToday
              }
              detail={
                isWaitingForRetry
                  ? `Keep this page open and the next card will appear automatically at ${formatTimestamp(nextDueAt!)}.`
                  : 'Remaining due-card capacity for today.'
              }
            />
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            {isDeckEmpty ? (
              <Button asChild>
                <Link to={`/decks/${deck.id}/cards/new`}>Add first card</Link>
              </Button>
            ) : (
              <Button
                type="button"
                onClick={() => void handleRefreshSession()}
                disabled={isRefreshingSession}
              >
                <RefreshCw
                  className={cn(
                    'mr-2 h-4 w-4',
                    isRefreshingSession && 'motion-safe:animate-spin',
                  )}
                />
                {isRefreshingSession ? 'Refreshing' : 'Refresh queue'}
              </Button>
            )}
            {!isDeckEmpty ? (
              <Button asChild variant="outline">
                <Link to={`/decks/${deck.id}/cards/new`}>Add another card</Link>
              </Button>
            ) : null}
            <Button asChild variant="ghost">
              <Link to={`/decks/${deck.id}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to deck
              </Link>
            </Button>
          </div>
        </SessionStateCard>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Today</CardTitle>
            <CardDescription>
              A quick summary for this deck while you wait or reset the queue.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <MetricTile
              label="Deck"
              value={deck.name}
              detail="Study stays scoped to this deck only."
              valueClassName="text-lg"
            />
            <MetricTile
              label="Ready right now"
              value={queue.cards.length}
              detail="Due cards would appear before new cards."
            />
            <MetricTile
              label="Next retry"
              value={nextDueAt === null ? 'None scheduled' : formatTimestamp(nextDueAt)}
              detail={
                nextDueAt === null
                  ? 'Nothing is waiting to re-enter this session.'
                  : 'Cards rated Hard or Again can come back later in the same session.'
              }
              valueClassName="text-lg"
            />
            <div className="rounded-[1.5rem] border border-border/70 bg-background/78 p-4 text-sm leading-6 text-muted-foreground">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 h-4 w-4 flex-none text-primary" />
                <p>
                  Keep this page open for the calmest flow. Ratings and queue
                  updates keep saving on this device as you study.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.18fr)_22rem]">
      <Card className="overflow-hidden">
        <CardHeader className="relative gap-5 overflow-hidden border-b border-border/50 bg-card/72">
          <div className="pointer-events-none absolute -right-16 -top-16 h-44 w-44 rounded-full bg-primary/12 blur-3xl" />
          <div className="pointer-events-none absolute left-6 top-2 h-20 w-20 rounded-full bg-accent/25 blur-2xl" />

          <div className="relative flex flex-wrap items-center gap-2">
            <Badge variant="accent">Study session</Badge>
            <Badge variant="outline">One card at a time</Badge>
            <Badge variant="outline">Saved on this device</Badge>
          </div>

          <div className="relative space-y-3">
            <CardTitle className="text-3xl sm:text-4xl">{deck.name}</CardTitle>
            <CardDescription className="max-w-2xl text-base">
              Front first. Reveal the answer when you are ready, then choose the
              next interval.
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          <div className="grid gap-3 sm:grid-cols-3">
            <MetricTile
              label="Ready now"
              value={queue.cards.length}
              detail="Remaining eligible cards in this deck."
            />
            <MetricTile
              label="Due first"
              value={queue.dueCards.length}
              detail="Due cards stay ahead of new cards."
            />
            <MetricTile
              label="New ready"
              value={queue.newCards.length}
              detail="Shown after due cards, oldest first."
            />
          </div>

          {actionError ? (
            <div
              role="alert"
              className="rounded-[1.5rem] border border-destructive/30 bg-destructive/8 p-4 text-sm leading-6 text-destructive"
            >
              {actionError}
            </div>
          ) : null}

          <section key={currentCard.id} className="study-card-enter space-y-4">
            <div className="rounded-[2rem] border border-border/70 bg-background/82 p-5 shadow-[0_18px_52px_rgba(18,35,33,0.06)] sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{formatCardState(currentCard.state)} card</Badge>
                  {currentCard.backImageAssetId ? (
                    <Badge variant="outline">Back image attached</Badge>
                  ) : null}
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-1 text-sm text-muted-foreground">
                  <Eye className="h-4 w-4" />
                  {isAnswerRevealed ? 'Answer revealed' : 'Answer hidden'}
                </div>
              </div>

              <div className="mt-8 space-y-4">
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                  Front
                </p>
                <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl sm:leading-tight">
                  {currentCard.frontText}
                </h2>
                <p className="max-w-xl text-sm leading-6 text-muted-foreground">
                  Recall it in your own words first. Reveal the answer only when
                  you are ready to rate this card.
                </p>
              </div>

              {!isAnswerRevealed ? (
                <div className="mt-8 flex flex-col gap-3 rounded-[1.5rem] border border-border/70 bg-muted/35 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm leading-6 text-muted-foreground">
                    Reveal the back and any attached image when you are ready.
                  </p>
                  <Button
                    type="button"
                    size="lg"
                    onClick={() => setIsAnswerRevealed(true)}
                    className="w-full sm:w-auto"
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Show answer
                  </Button>
                </div>
              ) : null}
            </div>

            <div
              className={cn(
                'rounded-[2rem] border p-5 shadow-[0_18px_52px_rgba(18,35,33,0.05)] sm:p-6',
                isAnswerRevealed
                  ? 'study-reveal border-border/70 bg-secondary/38'
                  : 'border-dashed border-border/70 bg-muted/28',
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={isAnswerRevealed ? 'accent' : 'outline'}>
                    {isAnswerRevealed ? 'Back' : 'Answer hidden'}
                  </Badge>
                  {currentCard.backImageAssetId ? (
                    <Badge variant="outline">
                      {currentBackImage
                        ? 'Image ready'
                        : isBackImageLoading
                          ? 'Loading image'
                          : 'Image attached'}
                    </Badge>
                  ) : null}
                </div>
                <p className="text-sm text-muted-foreground">
                  {isAnswerRevealed
                    ? 'Choose a rating when this feels clear.'
                    : 'The answer stays tucked away until you reveal it.'}
                </p>
              </div>

              {isAnswerRevealed ? (
                <>
                  <p className="mt-5 text-base leading-7 text-foreground">
                    {currentCard.backText}
                  </p>

                  {currentCard.backImageAssetId ? (
                    <div className="mt-5 rounded-[1.6rem] border border-border/70 bg-background/72 p-3 sm:p-4">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                        <div className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                          <Image className="h-4 w-4 text-primary" />
                          Attached image
                        </div>
                        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                          Stored on this device
                        </p>
                      </div>

                      {currentBackImage ? (
                        <CardBackImage
                          blob={currentBackImage.blob}
                          alt={`Back image for ${currentCard.frontText}`}
                          className="max-h-[22rem] w-full rounded-[1.2rem] border border-border/70 bg-muted/35 object-contain"
                        />
                      ) : (
                        <div className="flex min-h-44 items-center justify-center rounded-[1.2rem] border border-dashed border-border/70 bg-muted/30 px-4 text-center text-sm text-muted-foreground">
                          {isBackImageLoading
                            ? 'Loading the attached image...'
                            : 'The attached image could not be shown right now.'}
                        </div>
                      )}
                    </div>
                  ) : null}
                </>
              ) : (
                <div className="mt-5 rounded-[1.5rem] border border-dashed border-border/70 bg-background/55 p-5 text-sm leading-6 text-muted-foreground">
                  The answer and optional back image will appear here after you
                  reveal this card.
                </div>
              )}
            </div>
          </section>

          {isAnswerRevealed ? (
            <section className="study-reveal space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h3 className="text-xl font-semibold tracking-tight">
                    How did it feel?
                  </h3>
                  <p className="text-sm leading-6 text-muted-foreground">
                    One tap saves locally, then the next eligible card appears.
                  </p>
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/76 px-3 py-1 text-sm text-muted-foreground">
                  <RotateCcw className="h-4 w-4" />
                  Rate once per reveal
                </div>
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
                    className={cn(
                      'h-auto min-h-32 flex-col items-start rounded-[1.6rem] px-5 py-4 text-left transition-all duration-200 motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-[0_18px_36px_rgba(18,35,33,0.12)] motion-reduce:transform-none',
                      action.className,
                    )}
                  >
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.24em]',
                        action.badgeClassName,
                      )}
                    >
                      {action.detail}
                    </span>
                    <span className="mt-4 text-lg font-semibold">{action.title}</span>
                    <span className="mt-2 text-sm leading-6 opacity-85">
                      {action.summary}
                    </span>
                    <span className="mt-auto pt-4 text-xs uppercase tracking-[0.22em] opacity-70">
                      {submittingRating === action.rating
                        ? 'Saving locally'
                        : action.footer}
                    </span>
                  </Button>
                ))}
              </div>
            </section>
          ) : (
            <div className="rounded-[1.5rem] border border-dashed border-border/70 bg-muted/24 p-4 text-sm leading-6 text-muted-foreground">
              Reveal the answer to unlock the rating choices.
            </div>
          )}

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

      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Today</CardTitle>
          <CardDescription>
            A compact view of the deck-scoped study context.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <MetricTile
            label="Current card"
            value={formatCardState(currentCard.state)}
            detail={
              isAnswerRevealed
                ? 'Answer is visible and ready for rating.'
                : 'Front only until you reveal the answer.'
            }
          />
          <MetricTile
            label="New introduced"
            value={`${limits.introducedNewCardsToday} / ${limits.newCardsPerDay}`}
            detail="Today's new-card budget for this deck."
          />
          <MetricTile
            label="Due reviews left"
            value={
              limits.remainingReviewCardsToday === null
                ? 'Unlimited'
                : limits.remainingReviewCardsToday
            }
            detail="Remaining due-card capacity today."
          />
          <MetricTile
            label="Next retry"
            value={nextDueAt === null ? 'None scheduled' : formatTimestamp(nextDueAt)}
            detail={
              nextDueAt === null
                ? 'Nothing is waiting to re-enter this session.'
                : 'Cards rated Hard or Again can return later in the same deck session.'
            }
            valueClassName="text-lg"
          />

          <div className="rounded-[1.5rem] border border-border/70 bg-background/78 p-4 text-sm leading-6 text-muted-foreground">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-primary" />
              <p>
                Every rating is saved on this device before the next eligible
                card appears.
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
