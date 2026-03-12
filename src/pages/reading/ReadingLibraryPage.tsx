import {
  ArrowRight,
  BookOpenText,
  Clock3,
  LibraryBig,
  LoaderCircle,
  NotebookPen,
  PencilLine,
  Plus,
} from 'lucide-react'
import { type FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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
  createReadingDocument,
  listReadingDocuments,
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

function estimateReadingMinutes(wordCount: number) {
  return Math.max(1, Math.ceil(wordCount / READING_WORDS_PER_MINUTE))
}

function formatProgress(lastReadProgress: number) {
  return `${Math.round(lastReadProgress * 100)}%`
}

function getPreviewText(bodyText: string, maxLength = 180) {
  const normalized = bodyText.replace(/\s+/g, ' ').trim()

  if (normalized.length <= maxLength) {
    return normalized
  }

  return `${normalized.slice(0, maxLength - 3).trimEnd()}...`
}

function formatDocumentCount(count: number) {
  return `${count} ${count === 1 ? 'document' : 'documents'}`
}

function getResumeBadgeLabel(lastReadProgress: number) {
  return lastReadProgress > 0 ? `Resume ${formatProgress(lastReadProgress)}` : 'Start at top'
}

function getOpenActionLabel(document: ReadingDocument) {
  return document.lastReadProgress > 0 || document.lastOpenedAt !== null
    ? 'Resume reading'
    : 'Open reader'
}

function ReadingLibraryIntro({
  documentCount,
  hasDocuments,
  isLoading,
}: {
  documentCount: number
  hasDocuments: boolean
  isLoading: boolean
}) {
  return (
    <Card className="h-fit overflow-hidden">
      <CardHeader className="gap-5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="accent">Optional extra</Badge>
          <Badge variant="outline">Reading tools</Badge>
          <Badge variant="outline">Local-first library</Badge>
        </div>

        <div className="space-y-3">
          <CardTitle className="max-w-2xl text-3xl sm:text-4xl">
            {hasDocuments
              ? 'Add another reading note without losing the library.'
              : 'Keep reading notes close to the rest of your study flow.'}
          </CardTitle>
          <CardDescription className="max-w-2xl text-base">
            {hasDocuments
              ? 'Saved notes stay easy to reopen, and the next pasted text opens in the reader right after you save it. Decks and study session still remain the MVP core path.'
              : 'Paste an article, transcript, or chapter excerpt, then reopen it later and continue from the last saved spot on this device. This extra stays nearby without replacing deck-first review.'}
          </CardDescription>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
            <p className="text-sm font-medium text-muted-foreground">
              Library items
            </p>
            <p className="mt-2 text-3xl font-semibold">
              {isLoading ? '...' : documentCount}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Saved locally in IndexedDB.
            </p>
          </div>

          <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
            <p className="text-sm font-medium text-muted-foreground">
              Start with
            </p>
            <p className="mt-2 text-xl font-semibold">Pasted text</p>
            <p className="mt-1 text-sm text-muted-foreground">
              The fastest way to capture a reading note in this slice.
            </p>
          </div>

          <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
            <p className="text-sm font-medium text-muted-foreground">
              Resume state
            </p>
            <p className="mt-2 text-xl font-semibold">Last spot saved</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Open again and continue where you left off.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <a href="#new-reading-form">
              <NotebookPen className="mr-2 h-4 w-4" />
              {hasDocuments ? 'Add from pasted text' : 'Start with pasted text'}
            </a>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
            <Link to="/reading/books">
              <BookOpenText className="mr-2 h-4 w-4" />
              Open book library
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
            <Link to="/">Back to decks</Link>
          </Button>
        </div>

        <div className="rounded-[1.4rem] border border-primary/20 bg-primary/5 p-4">
          <p className="font-medium text-foreground">Also available: local EPUB books</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Open the separate optional book library to import EPUB files and
            continue in the dedicated reader without affecting your saved
            reading notes or the core deck workflow.
          </p>
        </div>

        <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4 text-sm leading-6 text-muted-foreground">
          Reading stays local to this install, and saved documents remain
          separate from decks and card review so the workflow stays calm,
          explicit, and visibly secondary to the core MVP flow.
        </div>
      </CardContent>
    </Card>
  )
}

function ReadingCreationForm({
  bodyText,
  error,
  isSaving,
  title,
  onBodyTextChange,
  onSubmit,
  onTitleChange,
}: {
  bodyText: string
  error: string | null
  isSaving: boolean
  title: string
  onBodyTextChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onTitleChange: (value: string) => void
}) {
  const trimmedBodyText = bodyText.trim()
  const wordCount = trimmedBodyText ? trimmedBodyText.split(/\s+/).length : 0

  return (
    <Card id="new-reading-form" className="h-fit">
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="accent">New reading note</Badge>
          <Badge variant="outline">Plain text only</Badge>
        </div>
        <CardTitle>Create from pasted text</CardTitle>
        <CardDescription>
          Give it a short title, paste the text, and Ranki will open the local
          reader immediately after save.
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

        <form className="space-y-5" onSubmit={onSubmit}>
          <div className="space-y-2">
            <label
              htmlFor="reading-title"
              className="block text-sm font-medium text-foreground"
            >
              Title
            </label>
            <input
              id="reading-title"
              value={title}
              onChange={(event) => onTitleChange(event.target.value)}
              className={inputClassName}
              maxLength={160}
              autoFocus
              required
              placeholder="For example, Chapter 3 notes"
              aria-describedby="reading-title-hint"
            />
            <p id="reading-title-hint" className="text-sm text-muted-foreground">
              Keep it short enough to scan quickly when the library fills up.
            </p>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="reading-body"
              className="block text-sm font-medium text-foreground"
            >
              Reading text
            </label>
            <textarea
              id="reading-body"
              value={bodyText}
              onChange={(event) => onBodyTextChange(event.target.value)}
              className={`${inputClassName} min-h-52 resize-y sm:min-h-64`}
              required
              placeholder="Paste the text you want to keep reading inside Ranki."
              aria-describedby="reading-body-hint"
            />
            <p
              id="reading-body-hint"
              className="text-sm leading-6 text-muted-foreground"
            >
              Plain text only in this slice. No file import, sync, or
              annotations yet.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.2rem] border border-border/70 bg-background/70 p-3.5">
              <p className="text-sm font-medium text-muted-foreground">Words</p>
              <p className="mt-2 text-2xl font-semibold">{wordCount}</p>
            </div>
            <div className="rounded-[1.2rem] border border-border/70 bg-background/70 p-3.5">
              <p className="text-sm font-medium text-muted-foreground">
                Estimated read
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {wordCount ? `${estimateReadingMinutes(wordCount)} min` : '0 min'}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Button
              type="submit"
              size="lg"
              disabled={isSaving}
              className="w-full sm:w-auto"
            >
              <Plus className="mr-2 h-4 w-4" />
              {isSaving ? 'Saving locally...' : 'Save and open reader'}
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full sm:w-auto"
            >
              <Link to="/">Back to decks</Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function ReadingDocumentsSection({
  documents,
}: {
  documents: ReadingDocument[]
}) {
  return (
    <section
      id="reading-library-list"
      aria-labelledby="reading-library-heading"
      className="space-y-4"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2
              id="reading-library-heading"
              className="text-2xl font-semibold tracking-tight"
            >
              Reading Library
            </h2>
            <Badge variant="outline">{formatDocumentCount(documents.length)}</Badge>
            <Badge variant="outline">Most recently opened first</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Saved locally and ready to reopen from the latest spot.
          </p>
        </div>

        <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
          <a href="#new-reading-form">
            <NotebookPen className="mr-2 h-4 w-4" />
            Add from pasted text
          </a>
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {documents.map((document) => {
          const openActionLabel = getOpenActionLabel(document)

          return (
            <Card
              key={document.id}
              className="group h-full overflow-hidden transition-all duration-200 motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-[0_28px_90px_rgba(19,35,31,0.11)] motion-reduce:transform-none"
            >
              <CardHeader className="gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">Pasted text</Badge>
                  <Badge variant="accent">
                    {getResumeBadgeLabel(document.lastReadProgress)}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <CardTitle className="text-xl leading-tight sm:text-[1.35rem]">
                    {document.title}
                  </CardTitle>
                  <CardDescription className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock3 className="h-4 w-4" />
                      {document.lastOpenedAt === null
                        ? 'Not opened yet'
                        : `Last opened ${formatTimestamp(document.lastOpenedAt)}`}
                    </span>
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="rounded-[1.3rem] border border-border/70 bg-background/70 p-4">
                  <p className="text-sm leading-6 text-muted-foreground">
                    {getPreviewText(document.bodyText)}
                  </p>
                </div>

                <p className="text-sm leading-6 text-muted-foreground">
                  {document.wordCount} words / {estimateReadingMinutes(document.wordCount)}{' '}
                  min read / Updated {formatTimestamp(document.updatedAt)}
                </p>

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm leading-6 text-muted-foreground">
                    {document.lastReadProgress > 0
                      ? `Resume from ${formatProgress(document.lastReadProgress)} of the document.`
                      : 'Start from the beginning in the calm reader view.'}
                  </p>

                  <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                    <Button asChild className="w-full sm:w-auto">
                      <Link
                        to={`/reading/${document.id}`}
                        aria-label={`${openActionLabel} ${document.title}`}
                      >
                        <BookOpenText className="mr-2 h-4 w-4" />
                        {openActionLabel}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>

                    <Button asChild variant="outline" className="w-full sm:w-auto">
                      <Link
                        to={`/reading/${document.id}/edit`}
                        aria-label={`Edit ${document.title}`}
                      >
                        <PencilLine className="mr-2 h-4 w-4" />
                        Edit
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </section>
  )
}

function ReadingEmptyState() {
  return (
    <Card>
      <CardContent className="p-6 sm:p-8">
        <div className="rounded-[1.8rem] border border-dashed border-border bg-background/70 p-6 sm:p-8">
          <div className="mb-4 inline-flex rounded-2xl bg-secondary p-3 text-secondary-foreground">
            <LibraryBig className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Your library is ready for the first reading note.
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            Paste an article, transcript, or long-form note above. The saved
            item will appear here, keep its word count, and reopen from the
            last local reading position on this device.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <a href="#new-reading-form">
                <NotebookPen className="mr-2 h-4 w-4" />
                Start with pasted text
              </a>
            </Button>
            <Button asChild variant="outline">
              <Link to="/">Back to decks</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function ReadingLibraryPage() {
  const navigate = useNavigate()
  const [documents, setDocuments] = useState<ReadingDocument[]>([])
  const [title, setTitle] = useState('')
  const [bodyText, setBodyText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    let isMounted = true

    void bootstrapAppDb()
      .then(() => listReadingDocuments())
      .then((nextDocuments) => {
        if (isMounted) {
          setDocuments(nextDocuments)
          setIsLoading(false)
        }
      })
      .catch((nextError: unknown) => {
        if (isMounted) {
          setError(
            nextError instanceof Error
              ? nextError.message
              : 'Failed to load the reading library.',
          )
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    setIsSaving(true)
    setError(null)

    try {
      const createdDocument = await createReadingDocument({
        title,
        bodyText,
      })

      setDocuments((currentDocuments) => [createdDocument, ...currentDocuments])
      setTitle('')
      setBodyText('')
      navigate(`/reading/${createdDocument.id}`)
    } catch (nextError: unknown) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Failed to save the reading item.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  const hasDocuments = documents.length > 0

  return (
    <div className="space-y-6">
      {!isLoading && !error && hasDocuments ? (
        <ReadingDocumentsSection documents={documents} />
      ) : null}

      <section className="grid items-start gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <ReadingLibraryIntro
          documentCount={documents.length}
          hasDocuments={hasDocuments}
          isLoading={isLoading}
        />
        <ReadingCreationForm
          bodyText={bodyText}
          error={error}
          isSaving={isSaving}
          title={title}
          onBodyTextChange={setBodyText}
          onSubmit={handleSubmit}
          onTitleChange={setTitle}
        />
      </section>

      {isLoading ? (
        <Card>
          <CardHeader>
            <CardTitle>Loading reading library</CardTitle>
            <CardDescription>
              Reading the latest local documents from IndexedDB.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <LoaderCircle className="h-4 w-4 motion-safe:animate-spin" />
              Gathering the latest saved notes and resume points.
            </div>
          </CardContent>
        </Card>
      ) : !error && !hasDocuments ? (
        <ReadingEmptyState />
      ) : null}
    </div>
  )
}
