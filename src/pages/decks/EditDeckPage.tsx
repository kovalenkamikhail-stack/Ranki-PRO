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
import { DEFAULT_GLOBAL_NEW_CARDS_PER_DAY } from '@/entities/app-settings'
import {
  DEFAULT_NEW_CARD_ORDER,
  NEW_CARD_ORDER_OPTIONS,
  getNewCardOrderLabel,
  isNewCardOrder,
  type NewCardOrder,
} from '@/entities/deck'
import { createDeck, getDeck, updateDeck } from '@/db/decks'

interface EditDeckPageProps {
  mode: 'create' | 'edit'
}

const inputClassName =
  'mt-2 w-full rounded-[1.15rem] border border-input bg-background/85 px-4 py-3 text-sm text-foreground shadow-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60'

export function EditDeckPage({ mode }: EditDeckPageProps) {
  const { deckId } = useParams()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [useGlobalLimits, setUseGlobalLimits] = useState(true)
  const [newCardOrder, setNewCardOrder] = useState<NewCardOrder>(
    DEFAULT_NEW_CARD_ORDER,
  )
  const [newCardsPerDayOverride, setNewCardsPerDayOverride] = useState(
    DEFAULT_GLOBAL_NEW_CARDS_PER_DAY.toString(),
  )
  const [maxReviewsPerDayOverride, setMaxReviewsPerDayOverride] = useState('')
  const [isUnlimitedMaxReviews, setIsUnlimitedMaxReviews] = useState(true)
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
        setUseGlobalLimits(deck.useGlobalLimits)
        setNewCardOrder(deck.newCardOrder ?? DEFAULT_NEW_CARD_ORDER)
        setNewCardsPerDayOverride(
          (deck.newCardsPerDayOverride ?? DEFAULT_GLOBAL_NEW_CARDS_PER_DAY).toString(),
        )
        setMaxReviewsPerDayOverride(deck.maxReviewsPerDayOverride?.toString() ?? '')
        setIsUnlimitedMaxReviews(deck.maxReviewsPerDayOverride === null)
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

  const parseNonNegativeInteger = (value: string, fieldName: string) => {
    if (value.trim().length === 0) {
      throw new Error(`${fieldName} is required.`)
    }

    const parsed = Number(value)

    if (!Number.isInteger(parsed) || parsed < 0) {
      throw new Error(`${fieldName} must be 0 or greater.`)
    }

    return parsed
  }

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
        useGlobalLimits,
        newCardOrder,
        newCardsPerDayOverride: useGlobalLimits
          ? null
          : parseNonNegativeInteger(
              newCardsPerDayOverride,
              'Deck new cards per day',
            ),
        maxReviewsPerDayOverride:
          useGlobalLimits || isUnlimitedMaxReviews
            ? null
            : parseNonNegativeInteger(
                maxReviewsPerDayOverride,
                'Deck max reviews per day',
              ),
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
              : 'Update the deck name, description, and study-limit behavior without touching cards or study history.'}
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

          <div className="space-y-4 rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
            <div className="space-y-2">
              <p className="text-sm font-medium text-foreground">
                New card order
              </p>
              <p className="text-sm text-muted-foreground">
                Due cards still stay first. This only changes how new cards are
                ordered after the due queue is exhausted.
              </p>
            </div>

            <label className="block text-sm font-medium text-foreground">
              New card order
              <select
                value={newCardOrder}
                onChange={(event) => {
                  if (isNewCardOrder(event.target.value)) {
                    setNewCardOrder(event.target.value)
                  }
                }}
                className={inputClassName}
                aria-label="New card order"
              >
                {NEW_CARD_ORDER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="rounded-[1.2rem] border border-dashed border-border/70 bg-background/85 p-4 text-sm text-muted-foreground">
              {NEW_CARD_ORDER_OPTIONS.find((option) => option.value === newCardOrder)
                ?.description ?? getNewCardOrderLabel(newCardOrder)}
            </div>
          </div>

          {mode === 'edit' ? (
            <div className="space-y-4 rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">
                  Study limits
                </p>
                <p className="text-sm text-muted-foreground">
                  Keep this deck on global study defaults, or persist a local
                  override for its new-card and review caps.
                </p>
              </div>

              <label className="flex items-center gap-3 text-sm font-medium text-foreground">
                <input
                  type="checkbox"
                  checked={useGlobalLimits}
                  onChange={(event) => setUseGlobalLimits(event.target.checked)}
                  aria-label="Use global study limits"
                />
                Use global study limits
              </label>

              {!useGlobalLimits ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-medium text-foreground">
                    Deck new cards per day
                    <input
                      type="number"
                      min={0}
                      step={1}
                      inputMode="numeric"
                      aria-label="Deck new cards per day"
                      value={newCardsPerDayOverride}
                      onChange={(event) =>
                        setNewCardsPerDayOverride(event.target.value)
                      }
                      className={inputClassName}
                    />
                  </label>

                  <label className="flex items-start gap-3 rounded-[1.2rem] border border-border/70 bg-card/70 p-4 text-sm font-medium text-foreground sm:col-span-2">
                    <input
                      type="checkbox"
                      checked={isUnlimitedMaxReviews}
                      onChange={(event) =>
                        setIsUnlimitedMaxReviews(event.target.checked)
                      }
                      aria-label="Unlimited max reviews for this deck"
                      className="mt-1 h-4 w-4 rounded border-input"
                    />
                    <span>
                      Unlimited max reviews for this deck
                      <span className="mt-1 block text-sm font-normal leading-6 text-muted-foreground">
                        Leave due reviews uncapped for this deck only.
                      </span>
                    </span>
                  </label>

                  <label className="block text-sm font-medium text-foreground">
                    Deck max reviews per day
                    <input
                      type="number"
                      min={0}
                      step={1}
                      inputMode="numeric"
                      aria-label="Deck max reviews per day"
                      value={maxReviewsPerDayOverride}
                      onChange={(event) =>
                        setMaxReviewsPerDayOverride(event.target.value)
                      }
                      disabled={isUnlimitedMaxReviews}
                      className={inputClassName}
                    />
                  </label>
                </div>
              ) : (
                <div className="rounded-[1.2rem] border border-dashed border-border/70 bg-background/85 p-4 text-sm text-muted-foreground">
                  This deck currently inherits the global study limits from
                  Settings.
                </div>
              )}
            </div>
          ) : null}

          <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4 text-sm text-muted-foreground">
            {mode === 'create'
              ? 'Stored only on this device for MVP. New decks start on global study defaults, and the new-card order saves with the deck right away.'
              : 'Stored only on this device for MVP. Text-first card CRUD and the deck-scoped study session are live, and deck-level study settings now save directly into Dexie.'}
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
