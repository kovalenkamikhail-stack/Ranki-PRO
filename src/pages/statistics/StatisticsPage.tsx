import {
  ArrowRight,
  BarChart3,
  BookOpenText,
  Clock3,
  History,
  Layers3,
  PieChart,
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
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
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</p>
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
      <div className="mt-4 h-2 rounded-full bg-background/70">
        <div
          className={`h-2 rounded-full transition-[width] ${styles.barClassName}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">
        Saved {formatRatingLabel(rating)} ratings in the last 7 local days.
      </p>
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
            No study activity yet on this device.
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            Statistics appear after the first saved review. Ranki only reports
            on-device study activity from persisted review logs, so there are no
            placeholder numbers here.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/">
                <BookOpenText className="mr-2 h-4 w-4" />
                Open decks
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/reading">
                Explore reading tools
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
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="overflow-hidden">
          <CardHeader className="gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="accent">Statistics</Badge>
              <Badge variant="outline">Saved review logs only</Badge>
              <Badge variant="outline">Local-first activity</Badge>
            </div>

            <div className="space-y-3">
              <CardTitle className="max-w-2xl text-3xl sm:text-4xl">
                Statistics
              </CardTitle>
              <CardDescription className="max-w-2xl text-base">
                See recent study activity derived from persisted review logs on
                this device. These numbers describe activity and deck effort,
                not mastery or retention claims.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
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
                  {statistics ? formatTimestamp(statistics.todayStart) : '...'}
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
                  {statistics ? statistics.totalReviewHistoryCount : '...'}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Total review events stored locally.
                </p>
              </div>
            </div>

            <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4 text-sm leading-6 text-muted-foreground">
              Every number on this screen comes from saved `reviewLogs`. Nothing
              is sent to a server, and the page deliberately avoids stronger
              interpretations than the stored data supports.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Window rules</CardTitle>
            <CardDescription>
              Keep the definitions explicit so the numbers stay trustworthy.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
              <div className="flex items-start gap-3">
                <Clock3 className="mt-0.5 h-4 w-4 flex-none text-primary" />
                <div>
                  <p className="font-medium">Today</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Counts review logs with `reviewedAt` between local midnight
                    and the next local midnight.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
              <div className="flex items-start gap-3">
                <History className="mt-0.5 h-4 w-4 flex-none text-primary" />
                <div>
                  <p className="font-medium">Last 7 days</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Uses the last seven local calendar days, including today.
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
              <div className="flex items-start gap-3">
                <PieChart className="mt-0.5 h-4 w-4 flex-none text-primary" />
                <div>
                  <p className="font-medium">Rating mix</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Shows activity by saved rating action, not any inferred
                    learning outcome.
                  </p>
                </div>
              </div>
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
            <CardTitle>Loading statistics</CardTitle>
            <CardDescription>
              Reading saved review logs from IndexedDB.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : statistics && !statistics.hasAnyReviewHistory ? (
        <EmptyStatisticsState />
      ) : statistics ? (
        <>
          <section className="space-y-4">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">
                Recent activity
              </h2>
              <p className="text-sm text-muted-foreground">
                A simple snapshot of what you actually studied on this device.
              </p>
            </div>

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

          <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
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
                    No saved reviews landed in the last seven local days. Older
                    review history still exists on this device.
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
                    No recent deck activity yet in this window. The next saved
                    review will repopulate this list automatically.
                  </div>
                ) : (
                  statistics.mostActiveDecksLast7Days.slice(0, 5).map((deck) => (
                    <div
                      key={deck.deckId}
                      role="group"
                      aria-label={`${deck.deckName}: ${deck.reviewCount} reviews`}
                      className="rounded-[1.4rem] border border-border/70 bg-background/72 p-4 shadow-[0_10px_32px_rgba(18,35,33,0.05)]"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline">{deck.reviewCount} reviews</Badge>
                            <Badge variant="outline">
                              {deck.cardsStudiedCount} cards
                            </Badge>
                          </div>
                          <p className="text-lg font-semibold tracking-tight text-foreground">
                            {deck.deckName}
                          </p>
                        </div>

                        <Button asChild variant="ghost" size="sm">
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
                                {deck.reviewCount === 1 ? '' : 's'} in the
                                recent window.
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
                  ))
                )}
              </CardContent>
            </Card>
          </section>
        </>
      ) : null}
    </div>
  )
}
