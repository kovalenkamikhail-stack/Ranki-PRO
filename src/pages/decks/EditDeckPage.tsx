import { ArrowLeft, BookMarked, Save } from 'lucide-react'
import { type FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { createDeck, getDeck, updateDeck } from '@/db/decks'

interface EditDeckPageProps {
  mode: 'create' | 'edit'
}

const inputClassName =
  'mt-2 w-full rounded-[1.15rem] border border-input bg-background/85 px-4 py-3 text-sm text-foreground shadow-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/40'

export function EditDeckPage({ mode }: EditDeckPageProps) {
  const { deckId } = useParams()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(mode === 'edit')
  const [isMissing, setIsMissing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (mode !== 'edit') {
      return
    }

    if (!deckId) {
      setError('Missing deck id.')
      setIsLoading(false)
      return
    }

    let isMounted = true

    void getDeck(deckId)
      .then((deck) => {
        if (!isMounted) {
          return
        }

        if (!deck) {
          setIsMissing(true)
          return
        }

        setName(deck.name)
        setDescription(deck.description ?? '')
      })
      .catch((nextError: unknown) => {
        if (isMounted) {
          setError(
            nextError instanceof Error
              ? nextError.message
              : 'Failed to load deck.',
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
  }, [deckId, mode])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedName = name.trim()
    const trimmedDescription = description.trim()

    if (!trimmedName) {
      setError('Deck name is required.')
      return
    }

    if (mode === 'edit' && !deckId) {
      setError('Missing deck id.')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const draft = {
        name: trimmedName,
        description: trimmedDescription.length > 0 ? trimmedDescription : null,
      }

      if (mode === 'create') {
        await createDeck(draft)
      } else {
        await updateDeck(deckId!, draft)
      }

      navigate('/')
    } catch (nextError: unknown) {
      setError(
        nextError instanceof Error ? nextError.message : 'Failed to save deck.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <Card className="mx-auto max-w-3xl">
        <CardHeader>
          <CardTitle>Loading deck</CardTitle>
          <CardDescription>
            Reading the latest deck state from IndexedDB.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (isMissing) {
    return (
      <Card className="mx-auto max-w-3xl">
        <CardHeader className="gap-4">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-[1.6rem] bg-secondary text-secondary-foreground">
            <BookMarked className="h-7 w-7" />
          </div>
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              Deck Editor
            </p>
            <CardTitle className="text-3xl">Deck not found</CardTitle>
            <CardDescription className="text-base">
              This deck is not stored on the current device anymore.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to decks
            </Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="mx-auto max-w-3xl">
      <CardHeader className="gap-4">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-[1.6rem] bg-primary/12 text-primary">
          <BookMarked className="h-7 w-7" />
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            Deck Editor
          </p>
          <CardTitle className="text-3xl">
            {mode === 'create' ? 'Create a deck' : 'Edit deck'}
          </CardTitle>
          <CardDescription className="text-base">
            {mode === 'create'
              ? 'Decks stay local to this device in MVP. Start with a name and add an optional description.'
              : 'Update the deck name or description without touching cards, study history, or settings overrides.'}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {error ? (
          <div
            role="alert"
            className="rounded-[1.4rem] border border-destructive/30 bg-destructive/8 p-4 text-sm text-destructive"
          >
            {error}
          </div>
        ) : null}

        <form className="space-y-5" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-foreground">
            Deck name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={inputClassName}
              maxLength={120}
              autoFocus
            />
          </label>

          <label className="block text-sm font-medium text-foreground">
            Description
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className={`${inputClassName} min-h-32 resize-y`}
              maxLength={400}
            />
          </label>

          <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4 text-sm text-muted-foreground">
            Stored only on this device for MVP. Card CRUD, study queues, and
            per-deck limits land in later slices.
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="submit" size="lg" disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" />
              {mode === 'create'
                ? isSaving
                  ? 'Creating deck...'
                  : 'Create deck'
                : isSaving
                  ? 'Saving changes...'
                  : 'Save changes'}
            </Button>

            <Button asChild variant="outline" size="lg">
              <Link to="/">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to decks
              </Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
