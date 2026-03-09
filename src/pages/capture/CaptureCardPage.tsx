import {
  BookOpenText,
  BookPlus,
  Link2,
  LoaderCircle,
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

function DeckSelectionSummary({
  badgeLabel,
  badgeVariant,
  detail,
  title,
}: {
  badgeLabel: string
  badgeVariant: 'accent' | 'outline'
  detail: string
  title: string
}) {
  return (
    <div className="rounded-[1.4rem] border border-border/70 bg-background/72 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm font-medium text-muted-foreground">Target deck</p>
        <Badge variant={badgeVariant}>{badgeLabel}</Badge>
      </div>
      <p className="mt-3 text-base font-semibold text-foreground">{title}</p>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</p>
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
  const [manualSelection, setManualSelection] = useState<{
    deckId: string
    scope: string
  }>({
    deckId: '',
    scope: '',
  })
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

  const selectionScope = useMemo(
    () =>
      `${capture.payload.deckId ?? ''}::${decks.map((deck) => deck.id).join(',')}`,
    [capture.payload.deckId, decks],
  )
  const defaultSelectedDeckId = useMemo(() => {
    if (decks.length === 0) {
      return ''
    }

    const preferredDeckId = capture.payload.deckId
    const matchingDeck = preferredDeckId
      ? decks.find((deck) => deck.id === preferredDeckId)
      : null

    if (matchingDeck) {
      return matchingDeck.id
    }

    if (decks.length === 1) {
      return decks[0].id
    }

    return ''
  }, [capture.payload.deckId, decks])
  const selectedDeckId =
    manualSelection.scope === selectionScope
      ? manualSelection.deckId
      : defaultSelectedDeckId

  const hasRequestedUnknownDeck =
    capture.payload.deckId !== null &&
    decks.length > 0 &&
    !decks.some((deck) => deck.id === capture.payload.deckId)
  const selectedDeck = decks.find((deck) => deck.id === selectedDeckId) ?? null
  const continueHref = selectedDeckId
    ? `/decks/${selectedDeckId}/cards/new?${buildQuickCaptureSearchParams(
        capture.payload,
        { includeDeckId: false },
      ).toString()}`
    : null
  const canContinue = Boolean(continueHref) && capture.errors.length === 0

  const selectionSummary = (() => {
    if (isLoading) {
      return {
        badgeLabel: 'Loading decks',
        badgeVariant: 'outline' as const,
        title: 'Checking local deck options',
        detail:
          'Ranki is reading the current deck list from IndexedDB before it confirms the handoff target.',
      }
    }

    if (decks.length === 0 && capture.payload.deckId) {
      return {
        badgeLabel: 'Requested deck unavailable',
        badgeVariant: 'outline' as const,
        title: 'No local decks found yet',
        detail:
          'This capture asked for a deck, but no local decks are stored on this device yet. Create one first, then reopen the capture link.',
      }
    }

    if (decks.length === 0) {
      return {
        badgeLabel: 'No decks yet',
        badgeVariant: 'outline' as const,
        title: 'Create a deck before continuing',
        detail:
          'Quick capture still hands off into the normal deck-scoped card editor, so the local deck needs to exist first.',
      }
    }

    if (selectedDeck && capture.payload.deckId === selectedDeck.id) {
      return {
        badgeLabel: 'Requested deck found',
        badgeVariant: 'accent' as const,
        title: selectedDeck.name,
        detail:
          selectedDeck.description ??
          'This deck came from the capture URL and is ready for confirmation.',
      }
    }

    if (selectedDeck && capture.payload.deckId === null && decks.length === 1) {
      return {
        badgeLabel: 'Only local deck',
        badgeVariant: 'accent' as const,
        title: selectedDeck.name,
        detail:
          selectedDeck.description ??
          'Ranki selected the only local deck available on this device.',
      }
    }

    if (selectedDeck) {
      return {
        badgeLabel: 'Selected manually',
        badgeVariant: 'accent' as const,
        title: selectedDeck.name,
        detail:
          selectedDeck.description ??
          'This local deck will receive the capture when you continue into the editor.',
      }
    }

    if (hasRequestedUnknownDeck) {
      return {
        badgeLabel: 'Requested deck unavailable',
        badgeVariant: 'outline' as const,
        title: 'Choose another local deck',
        detail:
          'The capture asked for a deck that is not stored on this device anymore. Pick a local deck below to finish the handoff.',
      }
    }

    return {
      badgeLabel: 'Selection needed',
      badgeVariant: 'outline' as const,
      title: 'Choose the target deck',
      detail:
        'This capture did not arrive with a usable local deck preference, so choose the deck explicitly before continuing.',
    }
  })()

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
        <Card className="order-2 overflow-hidden xl:order-1">
          <CardHeader className="gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="accent">Quick capture</Badge>
              <Badge variant="outline">Manual URL handoff</Badge>
              <Badge variant="outline">No auto-save</Badge>
            </div>

            <div className="space-y-3">
              <CardTitle className="max-w-2xl text-3xl sm:text-4xl">
                Send a small browser capture into Ranki&apos;s normal card editor.
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
                <p className="mt-2 text-xl font-semibold">Requested deckId</p>
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

        <Card className="order-1 xl:order-2">
          <CardHeader>
            <CardTitle>Continue into a deck</CardTitle>
            <CardDescription>
              Confirm the target deck first, then open the normal card editor
              with the captured text prefilled.
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
                The requested `deckId` is not stored on this device anymore.
                Choose another local deck below.
              </div>
            ) : null}

            <div role="status" aria-live="polite">
              <DeckSelectionSummary {...selectionSummary} />
            </div>

            {isLoading ? (
              <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-3">
                  <LoaderCircle className="h-4 w-4 motion-safe:animate-spin" />
                  Reading the latest local deck list from IndexedDB.
                </div>
              </div>
            ) : decks.length === 0 ? (
              <div className="rounded-[1.4rem] border border-dashed border-border bg-background/70 p-5 text-sm leading-6 text-muted-foreground">
                Create a deck first, then reopen this capture URL to finish the
                handoff into a saved card.
              </div>
            ) : (
              <div className="space-y-2">
                <label
                  htmlFor="capture-target-deck"
                  className="block text-sm font-medium text-foreground"
                >
                  Target deck
                </label>
                <select
                  id="capture-target-deck"
                  value={selectedDeckId}
                  onChange={(event) =>
                    setManualSelection({
                      deckId: event.target.value,
                      scope: selectionScope,
                    })
                  }
                  className={inputClassName}
                  aria-label="Target deck"
                  aria-describedby="capture-target-deck-hint"
                >
                  <option value="">Choose a deck</option>
                  {decks.map((deck) => (
                    <option key={deck.id} value={deck.id}>
                      {deck.name}
                    </option>
                  ))}
                </select>
                <p
                  id="capture-target-deck-hint"
                  className="text-sm leading-6 text-muted-foreground"
                >
                  {selectedDeck
                    ? 'You can keep this deck or switch to another local deck before opening the editor.'
                    : 'Pick the local deck that should receive this capture when you continue.'}
                </p>
              </div>
            )}

            <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4 text-sm leading-6 text-muted-foreground">
              Optional `context` is shown for reference in the editor, but it is
              not saved into a dedicated card field in this first pass.
            </div>

            <div className="flex flex-wrap gap-3">
              {canContinue && continueHref ? (
                <Button asChild size="lg">
                  <Link to={continueHref}>
                    <Send className="mr-2 h-4 w-4" />
                    {selectedDeck
                      ? `Continue to ${selectedDeck.name}`
                      : 'Continue to editor'}
                  </Link>
                </Button>
              ) : decks.length > 0 && capture.errors.length === 0 ? (
                <Button type="button" size="lg" disabled>
                  <Send className="mr-2 h-4 w-4" />
                  Choose a deck to continue
                </Button>
              ) : capture.errors.length > 0 ? (
                <Button type="button" size="lg" disabled>
                  <Send className="mr-2 h-4 w-4" />
                  Capture details need attention
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
                  /capture/card?front=obscure&amp;back=hidden+from+view&amp;context=Seen+in+a+sentence.&amp;deckId=your-deck-id
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
