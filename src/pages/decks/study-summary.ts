import type { DeckStudySessionSnapshot } from '@/db/study-session'
import type { BadgeProps } from '@/components/ui/badge'

const timestampFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export interface DeckStudySummary {
  dueCount: number
  newCount: number
  isReady: boolean
  statusLabel: string
  statusDetail: string
  statusVariant: BadgeProps['variant']
}

function formatTimestamp(timestamp: number) {
  return timestampFormatter.format(timestamp)
}

export function getDeckStudySummary(
  session:
    | Pick<DeckStudySessionSnapshot, 'state' | 'queue' | 'nextDueAt'>
    | null
    | undefined,
): DeckStudySummary {
  const dueCount = session?.queue.dueCards.length ?? 0
  const newCount = session?.queue.newCards.length ?? 0

  if (!session || session.state === 'empty') {
    return {
      dueCount,
      newCount,
      isReady: false,
      statusLabel: 'No cards yet',
      statusDetail: 'Add the first card to make this deck study-ready.',
      statusVariant: 'default',
    }
  }

  if (session.state === 'ready') {
    const readyCount = session.queue.cards.length
    const cardLabel = readyCount === 1 ? 'card is' : 'cards are'

    return {
      dueCount,
      newCount,
      isReady: true,
      statusLabel: 'Ready now',
      statusDetail: `${readyCount} ${cardLabel} available to study.`,
      statusVariant: 'accent',
    }
  }

  if (session.nextDueAt !== null) {
    return {
      dueCount,
      newCount,
      isReady: false,
      statusLabel: 'Waiting for next due card',
      statusDetail: `Next due ${formatTimestamp(session.nextDueAt)}.`,
      statusVariant: 'outline',
    }
  }

  return {
    dueCount,
    newCount,
    isReady: false,
    statusLabel: 'Nothing due right now',
    statusDetail: 'This deck has no eligible cards under the current limits.',
    statusVariant: 'outline',
  }
}
