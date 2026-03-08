import { ArrowLeft, BookMarked, Rows3, Save, Trash2 } from 'lucide-react'
import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { CardBackImage } from '@/components/cards/CardBackImage'
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

interface EditCardPageProps {
  mode: 'create' | 'edit'
}

const inputClassName =
  'mt-2 w-full rounded-[1.15rem] border border-input bg-background/85 px-4 py-3 text-sm text-foreground shadow-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/40'

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

export function EditCardPage({ mode }: EditCardPageProps) {
  const { deckId, cardId } = useParams()
  const navigate = useNavigate()
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
  }, [cardId, deckId, mode])

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
              ? 'Create a local card with required front/back text and one optional image on the back.'
              : 'Update the front and back text for this local card and keep, replace, or remove its optional back image.'}
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
              Editing the saved front/back copy and optional back image for this
              deck-scoped card.
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              New cards save directly to this deck in Dexie with an optional
              image stored only on this device.
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

          <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">
                  Back image (optional)
                </p>
                <p className="text-sm text-muted-foreground">
                  Attach one PNG, JPEG, or WebP image up to 12 MB. Large images
                  are resized locally before they are saved to this device.
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
              <p className="mt-4 text-sm text-muted-foreground">
                No back image attached. Text-only cards still work exactly as
                before.
              </p>
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

          <div className="flex flex-wrap gap-3">
            <Button
              type="submit"
              size="lg"
              disabled={isSaving || isProcessingBackImage}
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
