import { useParams } from 'react-router-dom'
import { NotReadyPage } from '@/pages/shared/NotReadyPage'

export function DeckDetailsPage() {
  const { deckId } = useParams()

  return (
    <NotReadyPage
      eyebrow="Deck Details"
      title="Deck workspace reserved"
      description={`The deck-scoped route for ${deckId ?? '...'} exists now so navigation, deep links, and offline shell caching are in place before deck CRUD lands.`}
      nextSlice="Deck CRUD will turn this into the real deck management page."
    />
  )
}
