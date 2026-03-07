import { useParams } from 'react-router-dom'
import { NotReadyPage } from '@/pages/shared/NotReadyPage'

export function StudySessionPage() {
  const { deckId } = useParams()

  return (
    <NotReadyPage
      eyebrow="Study Session"
      title="Deck-scoped review route reserved"
      description={`The study session for deck ${deckId ?? '...'} is intentionally scaffolded before scheduler logic and review persistence arrive.`}
      nextSlice="Pure scheduler logic and queue-building tests should land before this page becomes interactive."
    />
  )
}
