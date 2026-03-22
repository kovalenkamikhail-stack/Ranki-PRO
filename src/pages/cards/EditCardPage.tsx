import { ArrowLeft, Rows3, Save, Trash2 } from 'lucide-react'
import {
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { PageIntro, PageScaffold } from '@/app/shell/PageScaffold'
import { CardBackImage } from '@/components/cards/CardBackImage'
import { Badge } from '@/components/ui/badge'
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
import {
  BACK_IMAGE_INPUT_ACCEPT,
  getCardBackImage,
  prepareBackImageDraft,
  type BackImageDraft,
  type CardBackImage as StoredCardBackImage,
} from '@/db/media-assets'
import type { Card as CardRecord } from '@/entities/card'
import type { Deck } from '@/entities/deck'
import {
  hasQuickCaptureCardDraftContent,
  parseQuickCaptureSearchParams,
} from '@/lib/quick-capture'

interface EditCardPageProps {
  mode: 'create' | 'edit'
}

const inputClassName =
  'mt-2 w-full rounded-[1.35rem] border border-input/80 bg-background/90 px-4 py-3.5 text-sm text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/35'

type BackImageFieldState =
  | { kind: 'none' }
  | { kind: 'stored'; image: StoredCardBackImage }
  | { kind: 'draft'; image: BackImageDraft }

function formatBytes(sizeBytes: number) {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`
  }

  const sizeInKb = sizeBytes / 1024

  if (sizeInKb < 1024) {
    return `${sizeInKb.toFixed(1)} KB`
  }

  return `${(sizeInKb / 1024).toFixed(1)} MB`
}

function getBackImageMeta(backImage: BackImageFieldState) {
  if (backImage.kind === 'stored') {
    return {
      fileName: backImage.image.asset.fileName,
      sizeBytes: backImage.image.asset.sizeBytes,
    }
  }

  if (backImage.kind === 'draft') {
    return {
      fileName: backImage.image.fileName,
      sizeBytes: backImage.image.sizeBytes,
    }
  }

  return null
}

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

function ContextCard({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string
  title: string
  description?: string
  children?: ReactNode
}) {
  return (
    <Card className="h-fit">
      <CardHeader className="gap-3">
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
          {eyebrow}
        </p>
        <div className="space-y-2">
          <CardTitle className="text-xl">{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
      </CardHeader>
      {children ? <CardContent className="space-y-4">{children}</CardContent> : null}
    </Card>
  )
}

export function EditCardPage({ mode }: EditCardPageProps) {
  const { deckId, cardId } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const hasCaptureQuery = location.search.length > 1
  const quickCapture = useMemo(
    () =>
      mode === 'create'
        ? parseQuickCaptureSearchParams(new URLSearchParams(location.search))
        : null,
    [location.search, mode],
  )
  const [deck, setDeck] = useState<Deck | null>(null)
  const [card, setCard] = useState<CardRecord | null>(null)
  const [frontText, setFrontText] = useState('')
  const [backText, setBackText] = useState('')
  const [backImage, setBackImage] = useState<BackImageFieldState>({
    kind: 'none',
  })
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isMissingDeck, setIsMissingDeck] = useState(false)
  const [isMissingCard, setIsMissingCard] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isProcessingBackImage, setIsProcessingBackImage] = useState(false)
  const appliedQuickCapturePrefillRef = useRef(false)
  const isProcessingBackImageRef = useRef(false)
  const backImageRequestIdRef = useRef(0)
  const backImageMeta = getBackImageMeta(backImage)

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
    appliedQuickCapturePrefillRef.current = false

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
          setBackImage({ kind: 'none' })

          if (
            hasCaptureQuery &&
            quickCapture &&
            quickCapture.errors.length === 0 &&
            hasQuickCaptureCardDraftContent(quickCapture.payload) &&
            !appliedQuickCapturePrefillRef.current
          ) {
            setFrontText(quickCapture.payload.frontText)
            setBackText(quickCapture.payload.backText)
            appliedQuickCapturePrefillRef.current = true
          }
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
        const nextBackImage = await getCardBackImage(nextCard)

        if (!isMounted) {
          return
        }

        setDeck(nextDeck)
        setCard(nextCard)
        setFrontText(nextCard.frontText)
        setBackText(nextCard.backText)
        setBackImage(
          nextBackImage
            ? {
                kind: 'stored',
                image: nextBackImage,
              }
            : {
                kind: 'none',
              },
        )
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
  }, [cardId, deckId, hasCaptureQuery, mode, quickCapture])

  const handleBackImageChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    event.target.value = ''

    if (!selectedFile) {
      return
    }

    const requestId = backImageRequestIdRef.current + 1
    backImageRequestIdRef.current = requestId
    isProcessingBackImageRef.current = true
    setIsProcessingBackImage(true)
    setSaveError(null)

    try {
      const preparedBackImage = await prepareBackImageDraft(selectedFile)

      if (backImageRequestIdRef.current !== requestId) {
        return
      }

      setBackImage({
        kind: 'draft',
        image: preparedBackImage,
      })
    } catch (nextError: unknown) {
      if (backImageRequestIdRef.current !== requestId) {
        return
      }

      setSaveError(
        nextError instanceof Error
          ? nextError.message
          : 'Failed to prepare the back image.',
      )
    } finally {
      if (backImageRequestIdRef.current === requestId) {
        isProcessingBackImageRef.current = false
        setIsProcessingBackImage(false)
      }
    }
  }

  const handleRemoveBackImage = () => {
    backImageRequestIdRef.current += 1
    isProcessingBackImageRef.current = false
    setIsProcessingBackImage(false)
    setBackImage({ kind: 'none' })
    setSaveError(null)
  }

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

    if (isProcessingBackImageRef.current || isProcessingBackImage) {
      setSaveError('Wait for the back image to finish processing.')
      return
    }

    setIsSaving(true)
    setSaveError(null)

    try {
      const backImageDraft =
        mode === 'create'
          ? backImage.kind === 'draft'
            ? backImage.image
            : null
          : backImage.kind === 'draft'
            ? backImage.image
            : backImage.kind === 'none' && card?.backImageAssetId
              ? null
              : undefined
      const draft = {
        frontText: trimmedFrontText,
        backText: trimmedBackText,
        backImage: backImageDraft,
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

  const quickCaptureHasDraft =
    mode === 'create' &&
    hasCaptureQuery &&
    quickCapture?.errors.length === 0 &&
    hasQuickCaptureCardDraftContent(quickCapture.payload)

  return (
    <form onSubmit={handleSubmit}>
      <PageScaffold
        header={
          <PageIntro
            eyebrow="Card editor"
            title={mode === 'create' ? 'Add a card' : 'Edit card'}
            description={
              mode === 'create'
                ? 'Create a local card with required front/back text and one optional image on the back.'
                : 'Fine-tune the saved front, back, and optional back image without leaving the selected deck.'
            }
            badges={
              <>
                <Badge variant="accent">Deck-scoped</Badge>
                <Badge variant="outline">Local-only media</Badge>
              </>
            }
          />
        }
        detail={
          <div className="space-y-5">
            {saveError ? (
              <div
                role="alert"
                className="rounded-[1.4rem] border border-destructive/30 bg-destructive/8 p-4 text-sm text-destructive"
              >
                {saveError}
              </div>
            ) : null}

            <Card className="overflow-hidden">
              <CardHeader className="gap-3">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                  Front side
                </p>
                <div className="space-y-2">
                  <CardTitle>What should surface first?</CardTitle>
                  <CardDescription>
                    Keep the prompt short enough to feel fast during study.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <label className="block text-sm font-medium text-foreground">
                  Front text
                  <input
                    value={frontText}
                    onChange={(event) => setFrontText(event.target.value)}
                    className={inputClassName}
                    autoFocus
                    placeholder="What is the concept or question?"
                  />
                </label>
              </CardContent>
            </Card>

            <Card className="overflow-hidden">
              <CardHeader className="gap-3">
                <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                  Back side
                </p>
                <div className="space-y-2">
                  <CardTitle>Answer, explanation, or definition</CardTitle>
                  <CardDescription>
                    The answer stays text-first and can keep one optional image.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <label className="block text-sm font-medium text-foreground">
                  Back text
                  <textarea
                    value={backText}
                    onChange={(event) => setBackText(event.target.value)}
                    className={`${inputClassName} min-h-44 resize-y`}
                    placeholder="Detailed explanation, formula, or definition..."
                  />
                </label>

                <div className="rounded-[1.5rem] border border-border/70 bg-background/72 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        Back image (optional)
                      </p>
                      <p className="text-sm leading-6 text-muted-foreground">
                        Attach one PNG, JPEG, or WebP image up to 12 MB. Large
                        images are resized locally before they are saved to this device.
                      </p>
                    </div>

                    {backImage.kind !== 'none' ? (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={handleRemoveBackImage}
                        disabled={isProcessingBackImage}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Remove image
                      </Button>
                    ) : null}
                  </div>

                  <label className="mt-4 block text-sm font-medium text-foreground">
                    Choose image
                    <input
                      type="file"
                      accept={BACK_IMAGE_INPUT_ACCEPT}
                      onChange={(event) => void handleBackImageChange(event)}
                      disabled={isProcessingBackImage}
                      className={inputClassName}
                    />
                  </label>

                  {isProcessingBackImage ? (
                    <p className="mt-4 text-sm text-muted-foreground">
                      Preparing the selected image locally before save.
                    </p>
                  ) : backImage.kind === 'none' ? (
                    <div className="mt-4 rounded-[1.3rem] border border-dashed border-border/70 bg-background/80 p-4 text-sm leading-6 text-muted-foreground">
                      No back image attached. Text-only cards still work exactly
                      as before.
                    </div>
                  ) : (
                    <div className="mt-4 rounded-[1.3rem] border border-border/70 bg-background/80 p-4">
                      <CardBackImage
                        blob={backImage.image.blob}
                        alt={
                          frontText.trim().length > 0
                            ? `Back image for ${frontText.trim()}`
                            : 'Back image preview'
                        }
                        className="max-h-64 w-full rounded-[1.1rem] border border-border/70 object-cover"
                      />
                      <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                        <p>
                          {backImageMeta?.fileName ?? 'Attached image'} ·{' '}
                          {formatBytes(backImageMeta?.sizeBytes ?? 0)}
                        </p>
                        <p>
                          {backImage.kind === 'draft'
                            ? 'This optimized image will be saved when you submit the card.'
                            : 'This image is already saved locally with the card.'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        }
        aside={
          <div className="space-y-4">
            <ContextCard
              eyebrow="Deck association"
              title={deck?.name ?? 'Current deck'}
              description={
                card
                  ? 'Editing the saved front/back copy and optional back image for this deck-scoped card.'
                  : 'New cards save directly to this deck in Dexie with optional media stored only on this device.'
              }
            >
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">{mode === 'create' ? 'Create mode' : 'Edit mode'}</Badge>
                <Badge variant="outline">
                  {backImage.kind === 'none' ? 'Text only' : 'Image attached'}
                </Badge>
              </div>
            </ContextCard>

            {mode === 'create' && hasCaptureQuery && quickCapture?.errors.length ? (
              <ContextCard
                eyebrow="Quick capture"
                title="Quick capture prefill could not be used."
                description="The incoming capture URL could not produce a usable card draft."
              >
                <div
                  role="alert"
                  className="rounded-[1.2rem] border border-destructive/30 bg-destructive/8 p-4 text-sm text-destructive"
                >
                  <ul className="list-disc space-y-1 pl-5">
                    {quickCapture.errors.map((captureError) => (
                      <li key={captureError}>{captureError}</li>
                    ))}
                  </ul>
                </div>
              </ContextCard>
            ) : null}

            {mode === 'create' && hasCaptureQuery && quickCapture?.warnings.length ? (
              <ContextCard
                eyebrow="Quick capture"
                title="Quick capture adjusted part of the payload."
                description="Recoverable issues were cleaned up before prefilling the editor."
              >
                <div className="rounded-[1.2rem] border border-amber-500/20 bg-amber-500/[0.08] p-4 text-sm leading-6 text-foreground">
                  <ul className="list-disc space-y-1 pl-5">
                    {quickCapture.warnings.map((captureWarning) => (
                      <li key={captureWarning}>{captureWarning}</li>
                    ))}
                  </ul>
                </div>
              </ContextCard>
            ) : null}

            {quickCaptureHasDraft && quickCapture ? (
              <ContextCard
                eyebrow="Quick capture"
                title="Quick capture draft"
                description="Usable front and back text were prefilled, but nothing saves automatically."
              >
                {quickCapture.payload.contextText ? (
                  <div className="rounded-[1.2rem] border border-border/70 bg-background/80 p-4">
                    <p className="text-sm font-medium text-foreground">
                      Captured context (not auto-saved)
                    </p>
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-muted-foreground">
                      {quickCapture.payload.contextText}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm leading-6 text-muted-foreground">
                    The payload only included front/back card copy, so there is
                    no extra reference context to keep alongside this draft.
                  </p>
                )}
              </ContextCard>
            ) : null}

            <ContextCard
              eyebrow="Image state"
              title={
                isProcessingBackImage
                  ? 'Preparing image'
                  : backImage.kind === 'none'
                    ? 'No image attached'
                    : backImage.kind === 'draft'
                      ? 'Ready to save'
                      : 'Stored on this device'
              }
              description={
                isProcessingBackImage
                  ? 'The selected file is being resized and normalized before submit.'
                  : backImage.kind === 'none'
                    ? 'Text-only cards are still fully supported.'
                    : `${backImageMeta?.fileName ?? 'Attached image'} · ${formatBytes(backImageMeta?.sizeBytes ?? 0)}`
              }
            />

            <ContextCard
              eyebrow="Actions"
              title="Save back into the deck"
              description="All actions here map directly to the real local card flow."
            >
              <div className="space-y-3">
                <Button
                  type="submit"
                  size="lg"
                  disabled={isSaving || isProcessingBackImage}
                  className="w-full"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {mode === 'create'
                    ? isSaving
                      ? 'Creating card...'
                      : 'Create card'
                    : isSaving
                      ? 'Saving changes...'
                      : 'Save changes'}
                </Button>

                <Button asChild variant="outline" size="lg" className="w-full">
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
                    className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    {isDeleting ? 'Deleting...' : 'Delete card'}
                  </Button>
                ) : null}
              </div>
            </ContextCard>
          </div>
        }
        layout="focus"
      />
    </form>
  )
}
