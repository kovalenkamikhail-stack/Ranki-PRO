import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpenText,
  Clock3,
  History,
  Layers3,
  LoaderCircle,
  PieChart,
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
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
import {
  loadStudyActivityStatistics,
  type RatingDistribution,
  type StudyActivityStatistics,
} from '@/db/statistics'
import type { ReviewRating } from '@/entities/review-log'

const timestampFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function formatTimestamp(timestamp: number) {
  return timestampFormatter.format(timestamp)
}

function formatPercentage(count: number, total: number) {
  if (total === 0) {
    return '0%'
  }

  return `${Math.round((count / total) * 100)}%`
}

function formatRatingLabel(rating: ReviewRating) {
  return rating.charAt(0).toUpperCase() + rating.slice(1)
}

function SectionHeading({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </div>
      {action}
    </div>
  )
}

function MetricTile({
  label,
  value,
  detail,
}: {
  label: string
  value: ReactNode
  detail: string
}) {
  return (
    <div
      role="group"
      aria-label={`${label}: ${String(value)}`}
      className="rounded-[1.5rem] border border-border/70 bg-background/72 p-4 shadow-[0_10px_32px_rgba(18,35,33,0.05)]"
    >
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
        {value}
      </p>
      <p className="mt-2 min-h-12 text-sm leading-6 text-muted-foreground">
        {detail}
      </p>
    </div>
  )
}

const ratingStyles: Record<
  ReviewRating,
  {
    tileClassName: string
    barClassName: string
  }
> = {
  again: {
    tileClassName:
      'border-rose-500/20 bg-rose-500/[0.06] dark:border-rose-300/18 dark:bg-rose-300/[0.08]',
    barClassName: 'bg-rose-500 dark:bg-rose-300',
  },
  hard: {
    tileClassName:
      'border-amber-500/20 bg-amber-500/[0.06] dark:border-amber-300/18 dark:bg-amber-300/[0.08]',
    barClassName: 'bg-amber-500 dark:bg-amber-300',
  },
  good: {
    tileClassName: 'border-primary/20 bg-primary/[0.06]',
    barClassName: 'bg-primary',
  },
  easy: {
    tileClassName:
      'border-sky-500/20 bg-sky-500/[0.06] dark:border-sky-300/18 dark:bg-sky-300/[0.08]',
    barClassName: 'bg-sky-500 dark:bg-sky-300',
  },
}

function RatingTile({
  rating,
  count,
  distribution,
}: {
  rating: ReviewRating
  count: number
  distribution: RatingDistribution
}) {
  const percentage = distribution.total === 0 ? 0 : (count / distribution.total) * 100
  const styles = ratingStyles[rating]

  return (
    <div
      role="group"
      aria-label={`${formatRatingLabel(rating)} ratings: ${count}`}
      className={`rounded-[1.5rem] border p-4 shadow-[0_10px_32px_rgba(18,35,33,0.05)] ${styles.tileClassName}`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-foreground">
          {formatRatingLabel(rating)}
        </p>
        <p className="text-sm text-muted-foreground">
          {formatPercentage(count, distribution.total)}
        </p>
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
        {count}
      </p>
      <div className="mt-4 h-2.5 rounded-full bg-background/70">
        <div
          className={`h-2.5 rounded-full transition-[width] ${styles.barClassName}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Saved {formatRatingLabel(rating)} ratings in the last 7 local days.
      </p>
    </div>
  )
}

function WindowRule({
  icon,
  title,
  description,
}: {
  icon: ReactNode
  title: string
  description: string
}) {
  return (
    <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex-none text-primary">{icon}</div>
        <div>
          <p className="font-medium">{title}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
    </div>
  )
}

function RecentWindowQuietState() {
  return (
    <div className="rounded-[1.6rem] border border-dashed border-border/70 bg-background/72 p-5">
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">
        Recent Window
      </p>
      <h3 className="mt-3 text-xl font-semibold tracking-tight text-foreground">
        Quiet in the last 7 local days.
      </h3>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
        Older review history still exists on this device, but nothing landed in
        the current seven-day window. Ranki keeps that lull visible instead of
        smoothing it over with placeholder activity.
      </p>
    </div>
  )
}

function MostActiveDeckCard({
  deck,
  rank,
}: {
  deck: StudyActivityStatistics['mostActiveDecksLast7Days'][number]
  rank: number
}) {
  return (
    <div
      role="group"
      aria-label={`${deck.deckName}: ${deck.reviewCount} reviews`}
      className="rounded-[1.5rem] border border-border/70 bg-background/72 p-4 shadow-[0_10px_32px_rgba(18,35,33,0.05)]"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex h-8 min-w-8 items-center justify-center rounded-full bg-primary/12 px-2 text-sm font-semibold text-primary">
              #{rank}
            </div>
            <Badge variant="outline">{deck.reviewCount} reviews</Badge>
            <Badge variant="outline">{deck.cardsStudiedCount} cards</Badge>
          </div>
          <p className="text-lg font-semibold tracking-tight text-foreground">
            {deck.deckName}
          </p>
        </div>

        <Button asChild variant="ghost" size="sm" className="w-full sm:w-auto">
          <Link to={`/decks/${deck.deckId}`}>
            Open deck
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[1.2rem] border border-border/70 bg-background/85 p-3">
          <div className="flex items-start gap-2">
            <Layers3 className="mt-0.5 h-4 w-4 flex-none text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Review volume
              </p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {deck.reviewCount} saved review
                {deck.reviewCount === 1 ? '' : 's'} across{' '}
                {deck.cardsStudiedCount} card
                {deck.cardsStudiedCount === 1 ? '' : 's'}.
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-[1.2rem] border border-border/70 bg-background/85 p-3">
          <div className="flex items-start gap-2">
            <Clock3 className="mt-0.5 h-4 w-4 flex-none text-primary" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Last activity
              </p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {formatTimestamp(deck.lastReviewedAt)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function EmptyStatisticsState() {
  return (
    <Card>
      <CardContent className="p-6 sm:p-8">
        <div className="rounded-[1.8rem] border border-dashed border-border bg-background/70 p-6 sm:p-8">
          <div className="mb-4 inline-flex rounded-2xl bg-secondary p-3 text-secondary-foreground">
            <BarChart3 className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">
            No saved reviews yet on this device.
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            Statistics appear after the first saved review. Until then, Ranki
            keeps this page intentionally quiet and avoids placeholder streaks,
            charts, or made-up baseline numbers.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1.2rem] border border-border/70 bg-background/80 p-4">
              <p className="text-sm font-medium text-foreground">Honest by default</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                No review logs means no activity tiles yet.
              </p>
            </div>
            <div className="rounded-[1.2rem] border border-border/70 bg-background/80 p-4">
              <p className="text-sm font-medium text-foreground">Local-only</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Nothing here depends on a server or synced account.
              </p>
            </div>
            <div className="rounded-[1.2rem] border border-border/70 bg-background/80 p-4">
              <p className="text-sm font-medium text-foreground">Starts with review</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                The first saved rating will populate this page.
              </p>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/">
                <BookOpenText className="mr-2 h-4 w-4" />
                Open decks
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/settings">
                Open settings
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function StatisticsPage() {
  const [statistics, setStatistics] = useState<StudyActivityStatistics | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    void bootstrapAppDb()
      .then(() => loadStudyActivityStatistics())
      .then((nextStatistics) => {
        if (isMounted) {
          setStatistics(nextStatistics)
          setIsLoading(false)
        }
      })
      .catch((nextError: unknown) => {
        if (isMounted) {
          setError(
            nextError instanceof Error
              ? nextError.message
              : 'Failed to load statistics.',
          )
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  const distribution = statistics?.ratingDistributionLast7Days ?? {
    again: 0,
    hard: 0,
    good: 0,
    easy: 0,
    total: 0,
  }

  return (
    <PageScaffold
      header={
        <PageIntro
          eyebrow="Statistics"
          title="Statistics"
          description="See recent study activity from persisted review logs on this device. The page stays descriptive about effort and frequency, not mastery or retention claims, and remains outside the core deck-and-study workflow."
          badges={
            <>
              <Badge variant="accent">Optional extra</Badge>
              <Badge variant="outline">Statistics</Badge>
              <Badge variant="outline">Saved review logs only</Badge>
              <Badge variant="outline">Local-first activity</Badge>
            </>
          }
        />
      }
      actions={
        <>
          <Button asChild>
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to decks
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/settings">
              Open settings
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </>
      }
      list={
        <>
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
                <CardTitle>Loading statistics</CardTitle>
                <CardDescription>
                  Reading saved review logs from IndexedDB.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <LoaderCircle className="h-4 w-4 motion-safe:animate-spin" />
                  Gathering the latest local activity snapshot.
                </div>
              </CardContent>
            </Card>
          ) : statistics && !statistics.hasAnyReviewHistory ? (
            <EmptyStatisticsState />
          ) : statistics ? (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Window
                  </p>
                  <p className="mt-2 text-xl font-semibold">Last 7 local days</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Includes today and follows the device local date boundary.
                  </p>
                </div>

                <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Today starts
                  </p>
                  <p className="mt-2 text-base font-semibold">
                    {formatTimestamp(statistics.todayStart)}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Midnight in the current local timezone.
                  </p>
                </div>

                <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Saved history
                  </p>
                  <p className="mt-2 text-3xl font-semibold">
                    {statistics.totalReviewHistoryCount}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Total review events stored locally.
                  </p>
                </div>
              </div>

              <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4 text-sm leading-6 text-muted-foreground">
                Every number on this screen comes from saved `reviewLogs`.
                Nothing is sent to a server, and the page intentionally keeps its
                claims narrower than the stored data itself.
              </div>

              <section className="space-y-4">
                <SectionHeading
                  title="Recent activity"
                  description="A clear snapshot of what you actually studied on this device, with the quiet periods left visible instead of hidden."
                />

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <MetricTile
                    label="Reviews today"
                    value={statistics.reviewsCompletedToday}
                    detail="Saved rating actions completed since local midnight."
                  />
                  <MetricTile
                    label="Cards studied today"
                    value={statistics.cardsStudiedToday}
                    detail="Distinct cards touched by today's saved reviews."
                  />
                  <MetricTile
                    label="Reviews in last 7 days"
                    value={statistics.reviewsCompletedLast7Days}
                    detail="Saved review events in the recent local window."
                  />
                  <MetricTile
                    label="Active decks in last 7 days"
                    value={statistics.activeDeckCountLast7Days}
                    detail="Decks with at least one saved review in the recent window."
                  />
                </div>
              </section>

              {!statistics.hasRecentActivity ? <RecentWindowQuietState /> : null}

              <Card>
                <CardHeader>
                  <CardTitle>Rating distribution</CardTitle>
                  <CardDescription>
                    Saved rating actions from the last seven local days.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!statistics.hasRecentActivity ? (
                    <div className="rounded-[1.5rem] border border-dashed border-border/70 bg-background/72 p-5 text-sm leading-6 text-muted-foreground">
                      No saved reviews landed in this seven-day window yet. Older
                      history still exists on this device.
                    </div>
                  ) : null}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <RatingTile
                      rating="again"
                      count={distribution.again}
                      distribution={distribution}
                    />
                    <RatingTile
                      rating="hard"
                      count={distribution.hard}
                      distribution={distribution}
                    />
                    <RatingTile
                      rating="good"
                      count={distribution.good}
                      distribution={distribution}
                    />
                    <RatingTile
                      rating="easy"
                      count={distribution.easy}
                      distribution={distribution}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : null}
        </>
      }
      detail={
        <div className="space-y-6">
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Window rules</CardTitle>
              <CardDescription>
                Keep the definitions explicit so the metrics stay trustworthy when
                activity is high, low, or quiet.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
              <WindowRule
                icon={<Clock3 className="h-4 w-4" />}
                title="Today"
                description="Counts review logs with `reviewedAt` between local midnight and the next local midnight."
              />
              <WindowRule
                icon={<History className="h-4 w-4" />}
                title="Last 7 days"
                description="Uses the last seven local calendar days, including today."
              />
              <WindowRule
                icon={<PieChart className="h-4 w-4" />}
                title="Rating mix"
                description="Shows activity by saved rating action, not any inferred learning outcome."
              />
            </CardContent>
          </Card>

          {statistics && statistics.hasAnyReviewHistory ? (
            <Card>
              <CardHeader>
                <CardTitle>Most active decks</CardTitle>
                <CardDescription>
                  Ranked by saved review count in the last seven local days.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!statistics.hasRecentActivity ? (
                  <div className="rounded-[1.5rem] border border-dashed border-border/70 bg-background/72 p-5 text-sm leading-6 text-muted-foreground">
                    No deck had saved review activity in this seven-day window.
                    The next saved review will repopulate this list
                    automatically.
                  </div>
                ) : (
                  statistics.mostActiveDecksLast7Days
                    .slice(0, 5)
                    .map((deck, index) => (
                      <MostActiveDeckCard
                        key={deck.deckId}
                        deck={deck}
                        rank={index + 1}
                      />
                    ))
                )}
              </CardContent>
            </Card>
          ) : null}
        </div>
      }
      layout="detail"
    />
  )
}
