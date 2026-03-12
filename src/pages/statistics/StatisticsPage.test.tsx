import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { StatisticsPage } from '@/pages/statistics/StatisticsPage'

const {
  bootstrapAppDbMock,
  loadStudyActivityStatisticsMock,
} = vi.hoisted(() => ({
  bootstrapAppDbMock: vi.fn(),
  loadStudyActivityStatisticsMock: vi.fn(),
}))

vi.mock('@/db/bootstrap', () => ({
  bootstrapAppDb: bootstrapAppDbMock,
}))

vi.mock('@/db/statistics', () => ({
  loadStudyActivityStatistics: loadStudyActivityStatisticsMock,
}))

function renderStatisticsPage() {
  const router = createMemoryRouter(
    [
      {
        path: '/statistics',
        element: <StatisticsPage />,
      },
    ],
    {
      initialEntries: ['/statistics'],
    },
  )

  return render(<RouterProvider router={router} />)
}

describe('StatisticsPage', () => {
  beforeEach(() => {
    bootstrapAppDbMock.mockReset()
    loadStudyActivityStatisticsMock.mockReset()
    bootstrapAppDbMock.mockResolvedValue(undefined)
  })

  it('keeps the empty state hidden while statistics are still loading', async () => {
    let resolveStatistics:
      | ((value: {
          generatedAt: number
          todayStart: number
          nextDayStart: number
          recentWindowStart: number
          recentWindowDays: number
          totalReviewHistoryCount: number
          hasAnyReviewHistory: boolean
          hasRecentActivity: boolean
          reviewsCompletedToday: number
          reviewsCompletedLast7Days: number
          cardsStudiedToday: number
          activeDeckCountLast7Days: number
          ratingDistributionLast7Days: {
            again: number
            hard: number
            good: number
            easy: number
            total: number
          }
          mostActiveDecksLast7Days: []
        }) => void)
      | undefined

    loadStudyActivityStatisticsMock.mockReturnValue(
      new Promise((resolve) => {
        resolveStatistics = resolve
      }),
    )

    renderStatisticsPage()

    expect(screen.getByText('Loading statistics')).toBeInTheDocument()
    expect(
      screen.queryByText('No saved reviews yet on this device.'),
    ).not.toBeInTheDocument()

    resolveStatistics?.({
      generatedAt: 10,
      todayStart: 0,
      nextDayStart: 1,
      recentWindowStart: -1,
      recentWindowDays: 7,
      totalReviewHistoryCount: 0,
      hasAnyReviewHistory: false,
      hasRecentActivity: false,
      reviewsCompletedToday: 0,
      reviewsCompletedLast7Days: 0,
      cardsStudiedToday: 0,
      activeDeckCountLast7Days: 0,
      ratingDistributionLast7Days: {
        again: 0,
        hard: 0,
        good: 0,
        easy: 0,
        total: 0,
      },
      mostActiveDecksLast7Days: [],
    })

    expect(
      await screen.findByText('No saved reviews yet on this device.'),
    ).toBeInTheDocument()
  })

  it('renders an honest empty state when no review history exists yet', async () => {
    loadStudyActivityStatisticsMock.mockResolvedValue({
      generatedAt: 10,
      todayStart: 0,
      nextDayStart: 1,
      recentWindowStart: -1,
      recentWindowDays: 7,
      totalReviewHistoryCount: 0,
      hasAnyReviewHistory: false,
      hasRecentActivity: false,
      reviewsCompletedToday: 0,
      reviewsCompletedLast7Days: 0,
      cardsStudiedToday: 0,
      activeDeckCountLast7Days: 0,
      ratingDistributionLast7Days: {
        again: 0,
        hard: 0,
        good: 0,
        easy: 0,
        total: 0,
      },
      mostActiveDecksLast7Days: [],
    })

    renderStatisticsPage()

    expect(
      await screen.findByText('No saved reviews yet on this device.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Until then, Ranki keeps this page intentionally quiet/i),
    ).toBeInTheDocument()
  })

  it('renders the recent-quiet state honestly when older review history exists outside the 7-day window', async () => {
    loadStudyActivityStatisticsMock.mockResolvedValue({
      generatedAt: Date.UTC(2026, 2, 8, 12, 0, 0),
      todayStart: Date.UTC(2026, 2, 8, 0, 0, 0),
      nextDayStart: Date.UTC(2026, 2, 9, 0, 0, 0),
      recentWindowStart: Date.UTC(2026, 2, 2, 0, 0, 0),
      recentWindowDays: 7,
      totalReviewHistoryCount: 5,
      hasAnyReviewHistory: true,
      hasRecentActivity: false,
      reviewsCompletedToday: 0,
      reviewsCompletedLast7Days: 0,
      cardsStudiedToday: 0,
      activeDeckCountLast7Days: 0,
      ratingDistributionLast7Days: {
        again: 0,
        hard: 0,
        good: 0,
        easy: 0,
        total: 0,
      },
      mostActiveDecksLast7Days: [],
    })

    renderStatisticsPage()

    expect(await screen.findByRole('heading', { name: 'Statistics' })).toBeInTheDocument()
    expect(screen.getByText('Optional extra')).toBeInTheDocument()
    expect(
      screen.getByText(/Quiet in the last 7 local days/i),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/No deck had saved review activity in this seven-day window/i),
    ).toBeInTheDocument()
  })

  it('renders recent activity metrics, rating counts, and active decks from saved review history', async () => {
    loadStudyActivityStatisticsMock.mockResolvedValue({
      generatedAt: Date.UTC(2026, 2, 8, 12, 0, 0),
      todayStart: Date.UTC(2026, 2, 8, 0, 0, 0),
      nextDayStart: Date.UTC(2026, 2, 9, 0, 0, 0),
      recentWindowStart: Date.UTC(2026, 2, 2, 0, 0, 0),
      recentWindowDays: 7,
      totalReviewHistoryCount: 12,
      hasAnyReviewHistory: true,
      hasRecentActivity: true,
      reviewsCompletedToday: 4,
      reviewsCompletedLast7Days: 9,
      cardsStudiedToday: 3,
      activeDeckCountLast7Days: 2,
      ratingDistributionLast7Days: {
        again: 2,
        hard: 1,
        good: 4,
        easy: 2,
        total: 9,
      },
      mostActiveDecksLast7Days: [
        {
          deckId: 'deck-1',
          deckName: 'English',
          reviewCount: 6,
          cardsStudiedCount: 3,
          lastReviewedAt: Date.UTC(2026, 2, 8, 11, 0, 0),
        },
        {
          deckId: 'deck-2',
          deckName: 'Spanish',
          reviewCount: 3,
          cardsStudiedCount: 2,
          lastReviewedAt: Date.UTC(2026, 2, 7, 10, 0, 0),
        },
      ],
    })

    renderStatisticsPage()

    expect(await screen.findByRole('heading', { name: 'Statistics' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Back to decks' })).toHaveAttribute(
      'href',
      '/',
    )
    expect(screen.getByText('Reviews today')).toBeInTheDocument()
    expect(screen.getByText('Cards studied today')).toBeInTheDocument()
    expect(screen.getByText('Reviews in last 7 days')).toBeInTheDocument()
    expect(screen.getByText('Active decks in last 7 days')).toBeInTheDocument()
    expect(screen.getByText('English')).toBeInTheDocument()
    expect(screen.getByText('Spanish')).toBeInTheDocument()
    expect(screen.getByText('Again')).toBeInTheDocument()
    expect(screen.getByText('Good')).toBeInTheDocument()
    expect(
      screen.getByText(/6 saved reviews across 3 cards/i),
    ).toBeInTheDocument()
  })
})
