import { useParams } from 'react-router-dom'
import { NotReadyPage } from '@/pages/shared/NotReadyPage'

export function DeckDetailsPage() {
  const { deckId } = useParams()

  return (
    <NotReadyPage
      eyebrow="Deck Details"
      title="Deck workspace reserved"
      description={`The deck-scoped route for ${deckId ?? '...'} now has real deck CRUD feeding into it. Card lists, review entry points, and deck-scoped counts are still intentionally pending.`}
      nextSlice="Deck details with card list, add-card entry point, and start-review CTA."
    />
  )
}
