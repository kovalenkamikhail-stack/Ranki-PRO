import { useParams } from 'react-router-dom'
import { NotReadyPage } from '@/pages/shared/NotReadyPage'

interface EditDeckPageProps {
  mode: 'create' | 'edit'
}

export function EditDeckPage({ mode }: EditDeckPageProps) {
  const { deckId } = useParams()

  return (
    <NotReadyPage
      eyebrow="Deck Editor"
      title={mode === 'create' ? 'Create a deck' : 'Edit a deck'}
      description={
        mode === 'create'
          ? 'The first real form slice will start here, with a required deck name and optional description.'
          : `The edit route for deck ${deckId ?? '...'} is scaffolded and ready for a future form.`
      }
      nextSlice="Deck CRUD with delete confirmation and immediate local persistence."
    />
  )
}
