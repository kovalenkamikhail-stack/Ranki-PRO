import {
  BookOpenText,
  BookPlus,
  Link2,
  Send,
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { bootstrapAppDb } from '@/db/bootstrap'
import { listDecks } from '@/db/decks'
import type { Deck } from '@/entities/deck'
import {
  buildQuickCaptureSearchParams,
  parseQuickCaptureSearchParams,
} from '@/lib/quick-capture'

const inputClassName =
  'mt-2 w-full rounded-[1.15rem] border border-input bg-background/85 px-4 py-3 text-sm text-foreground shadow-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/40'

function FieldPreview({
  label,
  value,
  emptyText,
}: {
  label: string
  value: string | null
  emptyText: string
}) {
  return (
    <div className="rounded-[1.4rem] border border-border/70 bg-background/72 p-4">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-foreground">
        {value && value.length > 0 ? value : emptyText}
      </p>
    </div>
  )
}

export function CaptureCardPage() {
  const location = useLocation()
  const capture = useMemo(
    () => parseQuickCaptureSearchParams(new URLSearchParams(location.search)),
    [location.search],
  )
  const [decks, setDecks] = useState<Deck[]>([])
  const [selectedDeckId, setSelectedDeckId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    void bootstrapAppDb()
      .then(() => listDecks())
      .then((nextDecks) => {
        if (isMounted) {
          setDecks(nextDecks)
          setIsLoading(false)
        }
      })
      .catch((nextError: unknown) => {
        if (isMounted) {
          setError(
            nextError instanceof Error
              ? nextError.message
              : 'Failed to load local decks for capture.',
          )
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (decks.length === 0) {
      setSelectedDeckId('')
      return
    }

    const preferredDeckId = capture.payload.deckId
    const matchingDeck = preferredDeckId
      ? decks.find((deck) => deck.id === preferredDeckId)
      : null

    if (matchingDeck) {
      setSelectedDeckId(matchingDeck.id)
      return
    }

    if (decks.length === 1) {
      setSelectedDeckId(decks[0].id)
      return
    }

    setSelectedDeckId('')
  }, [capture.payload.deckId, decks])

  const hasRequestedUnknownDeck =
    capture.payload.deckId !== null &&
    decks.length > 0 &&
    !decks.some((deck) => deck.id === capture.payload.deckId)

  const continueHref = selectedDeckId
    ? `/decks/${selectedDeckId}/cards/new?${buildQuickCaptureSearchParams(
        capture.payload,
        { includeDeckId: false },
      ).toString()}`
    : null

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
        <Card className="overflow-hidden">
          <CardHeader className="gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="accent">Quick capture</Badge>
              <Badge variant="outline">Manual URL handoff</Badge>
              <Badge variant="outline">No auto-save</Badge>
            </div>

            <div className="space-y-3">
              <CardTitle className="max-w-2xl text-3xl sm:text-4xl">
                Send a small browser capture into Ranki’s normal card editor.
              </CardTitle>
              <CardDescription className="max-w-2xl text-base">
                This first pass accepts a small URL payload, shows the captured
                fields, and then hands you off to the existing editor so you can
                confirm, adjust, and save the card into a local deck.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Supported fields
                </p>
                <p className="mt-2 text-xl font-semibold">front, back, context</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Plain-text URL params only in this slice.
                </p>
              </div>

              <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Deck handoff
                </p>
                <p className="mt-2 text-xl font-semibold">Optional deckId</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Used as a local preference, not an auto-save target.
                </p>
              </div>

              <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Save model
                </p>
                <p className="mt-2 text-xl font-semibold">Existing card flow</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Reuses the current create-card logic and Dexie storage.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FieldPreview
                label="Front text"
                value={capture.payload.frontText}
                emptyText="No front text was provided in the capture URL."
              />
              <FieldPreview
                label="Back text"
                value={capture.payload.backText}
                emptyText="No back text was provided in the capture URL."
              />
            </div>

            <FieldPreview
              label="Captured context"
              value={capture.payload.contextText}
              emptyText="No context was provided. If a source sentence matters, send it with the optional context param."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Continue into a deck</CardTitle>
            <CardDescription>
              Choose the target deck explicitly, then open the normal card
              editor with the captured text prefilled.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {error ? (
              <div
                role="alert"
                className="rounded-[1.4rem] border border-destructive/30 bg-destructive/8 p-4 text-sm text-destructive"
              >
                {error}
              </div>
            ) : null}

            {capture.errors.length > 0 ? (
              <div
                role="alert"
                className="rounded-[1.4rem] border border-destructive/30 bg-destructive/8 p-4 text-sm text-destructive"
              >
                <p className="font-medium">This capture request cannot be used yet.</p>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {capture.errors.map((captureError) => (
                    <li key={captureError}>{captureError}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {hasRequestedUnknownDeck ? (
              <div className="rounded-[1.4rem] border border-amber-500/20 bg-amber-500/[0.08] p-4 text-sm text-foreground">
                The requested `deckId` is not stored on this device. Choose
                another local deck below.
              </div>
            ) : null}

            {isLoading ? (
              <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4 text-sm text-muted-foreground">
                Reading the latest local deck list from IndexedDB.
              </div>
            ) : decks.length === 0 ? (
              <div className="rounded-[1.4rem] border border-dashed border-border bg-background/70 p-5 text-sm leading-6 text-muted-foreground">
                Create a deck first, then reopen this capture URL to finish the
                handoff into a saved card.
              </div>
            ) : (
              <label className="block text-sm font-medium text-foreground">
                Target deck
                <select
                  value={selectedDeckId}
                  onChange={(event) => setSelectedDeckId(event.target.value)}
                  className={inputClassName}
                  aria-label="Target deck"
                >
                  <option value="">Choose a deck</option>
                  {decks.map((deck) => (
                    <option key={deck.id} value={deck.id}>
                      {deck.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4 text-sm leading-6 text-muted-foreground">
              Optional `context` is shown for reference in the editor, but it is
              not saved into a dedicated card field in this first pass.
            </div>

            <div className="flex flex-wrap gap-3">
              {continueHref && capture.errors.length === 0 ? (
                <Button asChild size="lg">
                  <Link to={continueHref}>
                    <Send className="mr-2 h-4 w-4" />
                    Continue to editor
                  </Link>
                </Button>
              ) : null}

              {decks.length === 0 ? (
                <Button asChild size="lg">
                  <Link to="/decks/new">
                    <BookPlus className="mr-2 h-4 w-4" />
                    Create a deck first
                  </Link>
                </Button>
              ) : null}

              <Button asChild variant="outline" size="lg">
                <Link to="/">
                  <BookOpenText className="mr-2 h-4 w-4" />
                  Back to decks
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Supported first-pass format</CardTitle>
          <CardDescription>
            This slice is manual URL handoff compatibility, not direct Yomitan
            protocol integration yet.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4 text-sm leading-6 text-muted-foreground">
            <div className="flex items-start gap-3">
              <Link2 className="mt-0.5 h-4 w-4 flex-none text-primary" />
              <div>
                <p className="font-medium text-foreground">Example</p>
                <p className="mt-2 break-words font-mono text-xs">
                  /capture/card?front=obscure&back=hidden+from+view&context=Seen+in+a+sentence.&deckId=your-deck-id
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
