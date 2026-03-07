import { useParams } from 'react-router-dom'
import { NotReadyPage } from '@/pages/shared/NotReadyPage'

interface EditCardPageProps {
  mode: 'create' | 'edit'
}

export function EditCardPage({ mode }: EditCardPageProps) {
  const { deckId, cardId } = useParams()

  return (
    <NotReadyPage
      eyebrow="Card Editor"
      title={mode === 'create' ? 'Add a card' : 'Edit a card'}
      description={
        mode === 'create'
          ? `This route is scaffolded and ready for the first manual card form inside deck ${deckId ?? '...'}`
          : `This route is reserved for editing card ${cardId ?? '...'} with text and optional back image.`
      }
      nextSlice="Text-first card CRUD, then single-image support."
    />
  )
}
