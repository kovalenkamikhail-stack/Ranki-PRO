import { ArrowLeft, BookMarked, Rows3, Save, Trash2 } from 'lucide-react'
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
import { createCard, deleteCardCascade, getCard, updateCard } from '@/db/cards'
import { getDeck } from '@/db/decks'
import type { Card as CardRecord } from '@/entities/card'
import type { Deck } from '@/entities/deck'

interface EditCardPageProps {
  mode: 'create' | 'edit'
}

const inputClassName =
  'mt-2 w-full rounded-[1.15rem] border border-input bg-background/85 px-4 py-3 text-sm text-foreground shadow-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/40'

function EditorUnavailableState({
  title,
  description,
  backHref,
  backLabel,
}: {
  title: string
  description: string
  backHref: string
  backLabel: string
}) {
  return (
    <Card className="mx-auto max-w-3xl">
      <CardHeader className="gap-4">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-[1.6rem] bg-secondary text-secondary-foreground">
          <Rows3 className="h-7 w-7" />
        </div>
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            Card Editor
          </p>
          <CardTitle className="text-3xl">{title}</CardTitle>
          <CardDescription className="text-base">{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <Button asChild>
          <Link to={backHref}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {backLabel}
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

export function EditCardPage({ mode }: EditCardPageProps) {
  const { deckId, cardId } = useParams()
  const navigate = useNavigate()
  const [deck, setDeck] = useState<Deck | null>(null)
  const [card, setCard] = useState<CardRecord | null>(null)
  const [frontText, setFrontText] = useState('')
  const [backText, setBackText] = useState('')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isMissingDeck, setIsMissingDeck] = useState(false)
  const [isMissingCard, setIsMissingCard] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (!deckId) {
      setLoadError('Missing deck id.')
      setIsLoading(false)
      return
    }

    if (mode === 'edit' && !cardId) {
      setLoadError('Missing card id.')
      setIsLoading(false)
      return
    }

    let isMounted = true

    const loadEditor = async () => {
      const nextDeck = await getDeck(deckId)

      if (!nextDeck) {
        if (isMounted) {
          setIsMissingDeck(true)
        }
        return
      }

      if (mode === 'create') {
        if (isMounted) {
          setDeck(nextDeck)
        }
        return
      }

      const nextCard = await getCard(cardId!)

      if (!nextCard || nextCard.deckId !== deckId) {
        if (isMounted) {
          setDeck(nextDeck)
          setIsMissingCard(true)
        }
        return
      }

      if (isMounted) {
        setDeck(nextDeck)
        setCard(nextCard)
        setFrontText(nextCard.frontText)
        setBackText(nextCard.backText)
      }
    }

    void loadEditor()
      .catch((nextError: unknown) => {
        if (isMounted) {
          setLoadError(
            nextError instanceof Error
              ? nextError.message
              : 'Failed to load card editor.',
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
  }, [cardId, deckId, mode])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedFrontText = frontText.trim()
    const trimmedBackText = backText.trim()

    if (!trimmedFrontText) {
      setSaveError('Front text is required.')
      return
    }

    if (!trimmedBackText) {
      setSaveError('Back text is required.')
      return
    }

    if (!deckId) {
      setSaveError('Missing deck id.')
      return
    }

    if (mode === 'edit' && !cardId) {
      setSaveError('Missing card id.')
      return
    }

    setIsSaving(true)
    setSaveError(null)

    try {
      const draft = {
        frontText: trimmedFrontText,
        backText: trimmedBackText,
      }

      if (mode === 'create') {
        await createCard(deckId, draft)
      } else {
        await updateCard(cardId!, draft)
      }

      navigate(`/decks/${deckId}`)
    } catch (nextError: unknown) {
      setSaveError(
        nextError instanceof Error ? nextError.message : 'Failed to save card.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (mode !== 'edit') {
      return
    }

    if (!cardId) {
      setSaveError('Missing card id.')
      return
    }

    const confirmed = window.confirm(
      deck
        ? `Delete this card from "${deck.name}" on this device?`
        : 'Delete this card from this device?',
    )

    if (!confirmed) {
      return
    }

    setIsDeleting(true)
    setSaveError(null)

    try {
      await deleteCardCascade(cardId)
      navigate(deckId ? `/decks/${deckId}` : '/')
    } catch (nextError: unknown) {
      setSaveError(
        nextError instanceof Error ? nextError.message : 'Failed to delete card.',
      )
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <Card className="mx-auto max-w-3xl">
        <CardHeader>
          <CardTitle>Loading card editor</CardTitle>
          <CardDescription>
            Reading the selected deck and card content from IndexedDB.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (loadError) {
    return (
      <EditorUnavailableState
        title="Card editor unavailable"
        description={loadError}
        backHref={deckId ? `/decks/${deckId}` : '/'}
        backLabel={deckId ? 'Back to deck' : 'Back to decks'}
      />
    )
  }

  if (isMissingDeck) {
    return (
      <EditorUnavailableState
        title="Deck not found"
        description="This deck is not stored on the current device anymore."
        backHref="/"
        backLabel="Back to decks"
      />
    )
  }

  if (isMissingCard) {
    return (
      <EditorUnavailableState
        title="Card not found"
        description="This card is not stored inside the selected deck on this device anymore."
        backHref={deckId ? `/decks/${deckId}` : '/'}
        backLabel={deckId ? 'Back to deck' : 'Back to decks'}
      />
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
            Card Editor
          </p>
          <CardTitle className="text-3xl">
            {mode === 'create' ? 'Add a card' : 'Edit card'}
          </CardTitle>
          <CardDescription className="text-base">
            {mode === 'create'
              ? 'Create a text-first card inside the current deck. Image upload and review actions stay in later slices.'
              : 'Update the front and back text for this local card without changing study state or media.'}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
          <p className="text-sm font-medium text-muted-foreground">Deck</p>
          <p className="mt-2 text-base font-semibold">
            {deck?.name ?? 'Current deck'}
          </p>
          {card ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Editing the saved front/back copy for this deck-scoped card.
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              New cards save directly to this deck in Dexie.
            </p>
          )}
        </div>

        {saveError ? (
          <div
            role="alert"
            className="rounded-[1.4rem] border border-destructive/30 bg-destructive/8 p-4 text-sm text-destructive"
          >
            {saveError}
          </div>
        ) : null}

        <form className="space-y-5" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-foreground">
            Front text
            <input
              value={frontText}
              onChange={(event) => setFrontText(event.target.value)}
              className={inputClassName}
              autoFocus
            />
          </label>

          <label className="block text-sm font-medium text-foreground">
            Back text
            <textarea
              value={backText}
              onChange={(event) => setBackText(event.target.value)}
              className={`${inputClassName} min-h-40 resize-y`}
            />
          </label>

          <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4 text-sm text-muted-foreground">
            Text-only CRUD is live in this slice. Back images, scheduler rules,
            and study session behavior stay out of scope.
          </div>

          <div className="flex flex-wrap gap-3">
            <Button type="submit" size="lg" disabled={isSaving}>
              <Save className="mr-2 h-4 w-4" />
              {mode === 'create'
                ? isSaving
                  ? 'Creating card...'
                  : 'Create card'
                : isSaving
                  ? 'Saving changes...'
                  : 'Save changes'}
            </Button>

            <Button asChild variant="outline" size="lg">
              <Link to={deckId ? `/decks/${deckId}` : '/'}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {deckId ? 'Back to deck' : 'Back to decks'}
              </Link>
            </Button>

            {mode === 'edit' ? (
              <Button
                type="button"
                variant="ghost"
                size="lg"
                disabled={isDeleting}
                onClick={() => void handleDelete()}
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                {isDeleting ? 'Deleting...' : 'Delete card'}
              </Button>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
