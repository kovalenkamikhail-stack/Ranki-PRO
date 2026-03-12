import { ArrowLeft, BookText, Save, Trash2 } from 'lucide-react'
import { type FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
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
import {
  deleteReadingDocument,
  getReadingDocument,
  updateReadingDocument,
} from '@/db/reading-documents'
import {
  READING_WORDS_PER_MINUTE,
  type ReadingDocument,
} from '@/entities/reading-document'

const inputClassName =
  'w-full rounded-[1.15rem] border border-input bg-background/85 px-4 py-3 text-sm text-foreground shadow-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60'

const timestampFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

function formatTimestamp(timestamp: number | null) {
  if (timestamp === null) {
    return 'Not opened yet'
  }

  return timestampFormatter.format(timestamp)
}

function formatProgress(lastReadProgress: number) {
  return `${Math.round(lastReadProgress * 100)}%`
}

function estimateReadingMinutes(wordCount: number) {
  return Math.max(1, Math.ceil(wordCount / READING_WORDS_PER_MINUTE))
}

function countWords(text: string) {
  const trimmed = text.trim()

  if (!trimmed) {
    return 0
  }

  return trimmed.split(/\s+/).length
}

function ReadingEditorUnavailableState({
  description,
  title,
}: {
  description: string
  title: string
}) {
  return (
    <Card className="mx-auto max-w-3xl">
      <CardHeader className="gap-4">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-[1.6rem] bg-secondary text-secondary-foreground">
          <BookText className="h-7 w-7" />
        </div>
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            Reading Editor
          </p>
          <CardTitle className="text-3xl">{title}</CardTitle>
          <CardDescription className="text-base">{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <Button asChild>
          <Link to="/reading">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to reading library
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

export function EditReadingDocumentPage() {
  const { documentId } = useParams()
  const navigate = useNavigate()
  const [document, setDocument] = useState<ReadingDocument | null>(null)
  const [title, setTitle] = useState('')
  const [bodyText, setBodyText] = useState('')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isMissing, setIsMissing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (!documentId) {
      setLoadError('Missing reading id.')
      setIsLoading(false)
      return
    }

    let isMounted = true

    void bootstrapAppDb()
      .then(() => getReadingDocument(documentId))
      .then((storedDocument) => {
        if (!isMounted) {
          return
        }

        if (!storedDocument) {
          setIsMissing(true)
          return
        }

        setDocument(storedDocument)
        setTitle(storedDocument.title)
        setBodyText(storedDocument.bodyText)
      })
      .catch((nextError: unknown) => {
        if (isMounted) {
          setLoadError(
            nextError instanceof Error
              ? nextError.message
              : 'Failed to load the reading document editor.',
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
  }, [documentId])

  const wordCount = countWords(bodyText)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!documentId) {
      setActionError('Missing reading id.')
      return
    }

    setIsSaving(true)
    setActionError(null)

    try {
      const updatedDocument = await updateReadingDocument(documentId, {
        title,
        bodyText,
      })

      navigate(`/reading/${updatedDocument.id}`)
    } catch (nextError: unknown) {
      setActionError(
        nextError instanceof Error
          ? nextError.message
          : 'Failed to save the reading note.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!documentId) {
      setActionError('Missing reading id.')
      return
    }

    const documentLabel = document?.title.trim() || 'this reading note'
    const confirmed = window.confirm(
      `Delete "${documentLabel}" from this device? This also removes its saved reading position from the local library.`,
    )

    if (!confirmed) {
      return
    }

    setIsDeleting(true)
    setActionError(null)

    try {
      await deleteReadingDocument(documentId)
      navigate('/reading')
    } catch (nextError: unknown) {
      setActionError(
        nextError instanceof Error
          ? nextError.message
          : 'Failed to delete the reading note.',
      )
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <Card className="mx-auto max-w-3xl">
        <CardHeader>
          <CardTitle>Loading reading editor</CardTitle>
          <CardDescription>
            Reading the saved note from IndexedDB before editing it.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (loadError) {
    return (
      <ReadingEditorUnavailableState
        title="Reading editor unavailable"
        description={loadError}
      />
    )
  }

  if (isMissing || !document) {
    return (
      <ReadingEditorUnavailableState
        title="Reading note not found"
        description="This reading note is not stored on the current device anymore."
      />
    )
  }

  return (
    <Card className="mx-auto max-w-3xl">
      <CardHeader className="gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="accent">Optional extra</Badge>
          <Badge variant="outline">Reading editor</Badge>
          <Badge variant="outline">Local-only note</Badge>
        </div>

        <div className="space-y-3">
          <CardTitle className="text-3xl">Edit reading note</CardTitle>
          <CardDescription className="text-base">
            Update the saved title or text without losing the local resume
            point. Delete remains explicit and reversible only through
            confirmation, while decks and study session remain the MVP core.
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
            <p className="text-sm font-medium text-muted-foreground">Words</p>
            <p className="mt-2 text-2xl font-semibold">{wordCount}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Recounted from the edited text.
            </p>
          </div>
          <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
            <p className="text-sm font-medium text-muted-foreground">
              Estimated read
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {wordCount ? `${estimateReadingMinutes(wordCount)} min` : '0 min'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Keeps the library card honest after edits.
            </p>
          </div>
          <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
            <p className="text-sm font-medium text-muted-foreground">
              Resume point
            </p>
            <p className="mt-2 text-2xl font-semibold">
              {formatProgress(document.lastReadProgress)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Last opened {formatTimestamp(document.lastOpenedAt)}.
            </p>
          </div>
        </div>

        {actionError ? (
          <div
            role="alert"
            className="rounded-[1.4rem] border border-destructive/30 bg-destructive/8 p-4 text-sm text-destructive"
          >
            {actionError}
          </div>
        ) : null}

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label
              htmlFor="edit-reading-title"
              className="block text-sm font-medium text-foreground"
            >
              Title
            </label>
            <input
              id="edit-reading-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className={inputClassName}
              maxLength={160}
              autoFocus
              required
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="edit-reading-body"
              className="block text-sm font-medium text-foreground"
            >
              Reading text
            </label>
            <textarea
              id="edit-reading-body"
              value={bodyText}
              onChange={(event) => setBodyText(event.target.value)}
              className={`${inputClassName} min-h-64 resize-y`}
              required
            />
            <p className="text-sm leading-6 text-muted-foreground">
              Plain text only in this slice. Edits stay on this device and do
              not add annotations, import, or sync behavior.
            </p>
          </div>

          <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4 text-sm leading-6 text-muted-foreground">
            Ranki preserves the existing local resume ratio and reading history
            fields for this document while you update the saved text.
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button
              type="submit"
              size="lg"
              disabled={isSaving || isDeleting}
              className="w-full sm:w-auto"
            >
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Saving changes...' : 'Save changes'}
            </Button>

            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full sm:w-auto"
            >
              <Link to={`/reading/${document.id}`}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to reading view
              </Link>
            </Button>

            <Button asChild variant="ghost" size="lg" className="w-full sm:w-auto">
              <Link to="/">Back to decks</Link>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="lg"
              disabled={isSaving || isDeleting}
              onClick={() => void handleDelete()}
              className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive sm:w-auto"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {isDeleting ? 'Deleting note...' : 'Delete reading note'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
