import {
  ArrowRight,
  BookOpenText,
  Clock3,
  LibraryBig,
  NotebookPen,
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
  'mt-2 w-full rounded-[1.15rem] border border-input bg-background/85 px-4 py-3 text-sm text-foreground shadow-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-60'

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

function getPreviewText(bodyText: string, maxLength = 220) {
  if (bodyText.length <= maxLength) {
    return bodyText
  }

  return `${bodyText.slice(0, maxLength - 3)}...`
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

  return (
    <div className="space-y-6">
      <section className="grid gap-6 xl:grid-cols-[1.12fr_0.88fr]">
        <Card className="overflow-hidden">
          <CardHeader className="gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="accent">Reading tools</Badge>
              <Badge variant="outline">Local-first library</Badge>
            </div>

            <div className="space-y-3">
              <CardTitle className="max-w-2xl text-3xl sm:text-4xl">
                Keep long-form notes and reading passages beside your decks.
              </CardTitle>
              <CardDescription className="max-w-2xl text-base">
                Save pasted text directly into Ranki, reopen it later, and
                continue from the last local reading position without leaving the
                offline app shell.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Reading items
                </p>
                <p className="mt-2 text-3xl font-semibold">
                  {isLoading ? '...' : documents.length}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Stored locally in IndexedDB.
                </p>
              </div>

              <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
                <p className="text-sm font-medium text-muted-foreground">
                  First input
                </p>
                <p className="mt-2 text-xl font-semibold">Pasted text</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  No file import, OCR, or sync in this slice.
                </p>
              </div>

              <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Resume state
                </p>
                <p className="mt-2 text-xl font-semibold">Last open + scroll</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Simple, explicit, and device-local.
                </p>
              </div>
            </div>

            <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4 text-sm leading-6 text-muted-foreground">
              Reading documents stay separate from decks, cards, and study
              events so the post-MVP reader can grow without bending Ranki’s
              current offline architecture.
            </div>
          </CardContent>
        </Card>

        <Card id="new-reading-form">
          <CardHeader>
            <CardTitle>Create from pasted text</CardTitle>
            <CardDescription>
              Give the document a title, paste the text, and open it right away
              in the local reader.
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

            <form className="space-y-5" onSubmit={handleSubmit}>
              <label className="block text-sm font-medium text-foreground">
                Title
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className={inputClassName}
                  maxLength={160}
                  autoFocus
                />
              </label>

              <label className="block text-sm font-medium text-foreground">
                Reading text
                <textarea
                  value={bodyText}
                  onChange={(event) => setBodyText(event.target.value)}
                  className={`${inputClassName} min-h-64 resize-y`}
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.2rem] border border-border/70 bg-background/70 p-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Words
                  </p>
                  <p className="mt-2 text-2xl font-semibold">
                    {bodyText.trim() ? bodyText.trim().split(/\s+/).length : 0}
                  </p>
                </div>
                <div className="rounded-[1.2rem] border border-border/70 bg-background/70 p-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Estimated read
                  </p>
                  <p className="mt-2 text-2xl font-semibold">
                    {bodyText.trim()
                      ? `${estimateReadingMinutes(
                          bodyText.trim().split(/\s+/).length,
                        )} min`
                      : '0 min'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button type="submit" size="lg" disabled={isSaving}>
                  <Plus className="mr-2 h-4 w-4" />
                  {isSaving ? 'Saving locally...' : 'Save and open'}
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link to="/">Back to decks</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </section>

      {isLoading ? (
        <Card>
          <CardHeader>
            <CardTitle>Loading reading library</CardTitle>
            <CardDescription>
              Reading the latest local documents from IndexedDB.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : documents.length === 0 && !error ? (
        <Card>
          <CardContent className="p-6 sm:p-8">
            <div className="rounded-[1.8rem] border border-dashed border-border bg-background/70 p-6 sm:p-8">
              <div className="mb-4 inline-flex rounded-2xl bg-secondary p-3 text-secondary-foreground">
                <LibraryBig className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-semibold tracking-tight">
                No reading items yet.
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                Start the library with a pasted article, transcript, or long-form
                note. Ranki will keep the text local and reopen it from the saved
                reading position later.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild>
                  <a href="#new-reading-form">
                    <NotebookPen className="mr-2 h-4 w-4" />
                    Create first reading item
                  </a>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/">Back to decks</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <section className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight">
                Reading Library
              </h2>
              <p className="text-sm text-muted-foreground">
                {documents.length} {documents.length === 1 ? 'document' : 'documents'}{' '}
                available locally.
              </p>
            </div>
            <Button asChild variant="outline">
              <a href="#new-reading-form">
                <NotebookPen className="mr-2 h-4 w-4" />
                New pasted text
              </a>
            </Button>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {documents.map((document) => (
              <Card key={document.id}>
                <CardHeader className="gap-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">Pasted text</Badge>
                        <Badge variant="outline">
                          {estimateReadingMinutes(document.wordCount)} min read
                        </Badge>
                        <Badge variant="accent">
                          Resume {formatProgress(document.lastReadProgress)}
                        </Badge>
                      </div>
                      <CardTitle className="text-xl">{document.title}</CardTitle>
                    </div>

                    <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-3 py-1 text-sm text-muted-foreground">
                      <Clock3 className="h-4 w-4" />
                      {formatTimestamp(document.lastOpenedAt)}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <div className="rounded-[1.3rem] border border-border/70 bg-background/70 p-4 text-sm leading-6 text-muted-foreground">
                    {getPreviewText(document.bodyText)}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[1.2rem] border border-border/70 bg-background/70 p-4">
                      <p className="text-sm font-medium text-muted-foreground">
                        Word count
                      </p>
                      <p className="mt-2 text-xl font-semibold">
                        {document.wordCount}
                      </p>
                    </div>
                    <div className="rounded-[1.2rem] border border-border/70 bg-background/70 p-4">
                      <p className="text-sm font-medium text-muted-foreground">
                        Updated
                      </p>
                      <p className="mt-2 text-base font-semibold">
                        {formatTimestamp(document.updatedAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <Button asChild>
                      <Link
                        to={`/reading/${document.id}`}
                        aria-label={`Open ${document.title}`}
                      >
                        <BookOpenText className="mr-2 h-4 w-4" />
                        Open reader
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
