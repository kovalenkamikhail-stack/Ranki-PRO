import {
  ArrowRight,
  BookOpenText,
  Clock3,
  LibraryBig,
  LoaderCircle,
  NotebookPen,
  PencilLine,
  Plus,
  Rows3,
} from 'lucide-react'
import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { PageIntro, PageScaffold } from '@/app/shell/PageScaffold'
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
import { listBooks } from '@/db/books'
import {
  createReadingDocument,
  listReadingDocuments,
} from '@/db/reading-documents'
import { formatImportedBookFormat, type Book } from '@/entities/book'
import {
  READING_WORDS_PER_MINUTE,
  type ReadingDocument,
} from '@/entities/reading-document'

const inputClassName =
  'w-full rounded-[1.4rem] border border-primary/18 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--background)_84%,white_6%),color-mix(in_oklab,var(--card)_92%,transparent))] px-4 py-3.5 text-sm text-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] outline-none transition placeholder:text-muted-foreground/75 focus:border-ring focus:ring-2 focus:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60'

type ReadingHubView = 'all' | 'documents' | 'books'

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

function formatBookCount(count: number) {
  return `${count} ${count === 1 ? 'book' : 'books'}`
}

function getResumeBadgeLabel(lastReadProgress: number) {
  return lastReadProgress > 0 ? `Resume ${formatProgress(lastReadProgress)}` : 'Start at top'
}

function getOpenActionLabel(document: ReadingDocument) {
  return document.lastReadProgress > 0 || document.lastOpenedAt !== null
    ? 'Resume reading'
    : 'Open reader'
}

function getOpenBookActionLabel(book: Book) {
  return book.lastOpenedAt !== null || book.lastReadProgress > 0
    ? 'Resume book'
    : 'Open book'
}

function HubFilterBar({
  currentView,
  documentCount,
  bookCount,
  onChange,
}: {
  currentView: ReadingHubView
  documentCount: number
  bookCount: number
  onChange: (view: ReadingHubView) => void
}) {
  const filters: Array<{
    key: ReadingHubView
    label: string
    count: number
  }> = [
    {
      key: 'all',
      label: 'All items',
      count: documentCount + bookCount,
    },
    {
      key: 'documents',
      label: 'Reading notes',
      count: documentCount,
    },
    {
      key: 'books',
      label: 'Imported books',
      count: bookCount,
    },
  ]

  return (
    <div className="flex flex-wrap gap-2">
      {filters.map((filter) => {
        const isActive = currentView === filter.key

        return (
          <button
            key={filter.key}
            type="button"
            aria-label={filter.label}
            aria-pressed={isActive}
            onClick={() => onChange(filter.key)}
            className={
              isActive
                ? 'inline-flex items-center gap-2 rounded-full border border-primary/30 bg-[linear-gradient(135deg,color-mix(in_oklab,var(--primary)_92%,white_8%),color-mix(in_oklab,var(--primary)_78%,var(--accent)_22%))] px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_16px_36px_rgba(43,117,181,0.22)]'
                : 'inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/75 px-4 py-2.5 text-sm font-semibold text-muted-foreground transition hover:border-primary/18 hover:bg-accent/60 hover:text-foreground'
            }
          >
            <span>{filter.label}</span>
            <span
              aria-hidden="true"
              className={isActive ? 'text-primary-foreground/78' : 'text-muted-foreground'}
            >
              {filter.count}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function ReadingHubSidebar({
  documentCount,
  bookCount,
}: {
  documentCount: number
  bookCount: number
}) {
  return (
    <Card className="h-fit">
      <CardHeader className="gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="accent">Reading hub</Badge>
          <Badge variant="outline">Separate storage models</Badge>
        </div>
        <CardTitle>My sanctuary</CardTitle>
        <CardDescription>
          Continue your deep study journey with locally saved notes and a
          separate imported-book path that stays beside decks instead of
          replacing them.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <div className="rounded-[1.45rem] border border-border/70 bg-background/70 p-4">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              Reading notes
            </p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              {documentCount}
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Pasted documents saved as note-style reading items.
            </p>
          </div>

          <div className="rounded-[1.45rem] border border-border/70 bg-background/70 p-4">
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
              Imported books
            </p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              {bookCount}
            </p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              EPUB, FB2, and MOBI volumes stay in the separate book library.
            </p>
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-border/70 bg-background/70 p-4 text-sm leading-6 text-muted-foreground">
          Reading stays local to this install, and reading notes remain
          separate from imported books, decks, and card review so the workflow
          stays calm, explicit, and visibly secondary to the MVP core path.
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
          <Badge variant="accent">Create from pasted text</Badge>
          <Badge variant="outline">Plain text only</Badge>
        </div>
        <CardTitle>Capture a new reading note</CardTitle>
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
            <div className="rounded-[1.35rem] border border-border/70 bg-background/70 p-4">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                Words
              </p>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
                {wordCount}
              </p>
            </div>
            <div className="rounded-[1.35rem] border border-border/70 bg-background/70 p-4">
              <p className="text-[0.72rem] font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                Estimated read
              </p>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">
                {wordCount ? `${estimateReadingMinutes(wordCount)} min` : '0 min'}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <Button
              type="submit"
              size="lg"
              disabled={isSaving}
              className="w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              {isSaving ? 'Saving locally...' : 'Save and open reader'}
            </Button>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild variant="outline" className="w-full sm:flex-1">
                <Link to="/reading/books">
                  <BookOpenText className="mr-2 h-4 w-4" />
                  Book library
                </Link>
              </Button>
              <Button asChild variant="ghost" className="w-full sm:flex-1">
                <Link to="/">Back to decks</Link>
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

function ReadingDocumentCard({ document }: { document: ReadingDocument }) {
  const openActionLabel = getOpenActionLabel(document)

  return (
    <Card className="group h-full overflow-hidden">
      <CardHeader className="gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">Reading note</Badge>
          <Badge variant="accent">
            {getResumeBadgeLabel(document.lastReadProgress)}
          </Badge>
        </div>

        <div className="space-y-2">
          <CardTitle className="text-xl leading-tight sm:text-[1.4rem]">
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
        <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
          <p className="text-sm leading-6 text-muted-foreground">
            {getPreviewText(document.bodyText)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="outline">{document.wordCount} words</Badge>
          <Badge variant="outline">
            {estimateReadingMinutes(document.wordCount)} min read
          </Badge>
          <Badge variant="outline">Updated {formatTimestamp(document.updatedAt)}</Badge>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
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
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h2
            id="reading-library-heading"
            className="text-2xl font-semibold tracking-tight text-foreground"
          >
            Reading Library
          </h2>
          <Badge variant="outline">{formatDocumentCount(documents.length)}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">Most recently opened first</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {documents.map((document) => (
          <ReadingDocumentCard key={document.id} document={document} />
        ))}
      </div>
    </section>
  )
}

function ImportedBooksSection({
  books,
  title = 'Imported books',
  description = 'The separate book library remains available here without merging its storage model into reading notes.',
}: {
  books: Book[]
  title?: string
  description?: string
}) {
  return (
    <section className="space-y-4" aria-labelledby="reading-books-heading">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2
              id="reading-books-heading"
              className="text-2xl font-semibold tracking-tight text-foreground"
            >
              {title}
            </h2>
            <Badge variant="outline">{formatBookCount(books.length)}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>

        <Button asChild variant="outline" className="w-full sm:w-auto">
          <Link to="/reading/books">
            Browse book library
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {books.map((book) => {
          const openActionLabel = getOpenBookActionLabel(book)

          return (
            <Card key={book.id} className="h-full overflow-hidden">
              <CardHeader className="gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="accent">{formatImportedBookFormat(book.format)}</Badge>
                  <Badge variant="outline">{book.chapterCount} chapters</Badge>
                  <Badge variant="outline">Resume {formatProgress(book.lastReadProgress)}</Badge>
                </div>

                <div className="space-y-2">
                  <CardTitle className="text-xl leading-tight sm:text-[1.4rem]">
                    {book.title}
                  </CardTitle>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>{book.author ?? 'Author metadata unavailable'}</p>
                    <p className="inline-flex items-center gap-1.5">
                      <Clock3 className="h-4 w-4" />
                      {formatTimestamp(book.lastOpenedAt)}
                    </p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="rounded-[1.35rem] border border-border/70 bg-background/70 p-4 text-sm leading-6 text-muted-foreground">
                  {book.totalWordCount} words across {book.chapterCount} chapters
                  from {book.fileName}.
                </div>

                <Button asChild className="w-full sm:w-auto">
                  <Link
                    to={`/reading/books/${book.id}`}
                    aria-label={`${openActionLabel} ${book.title}`}
                  >
                    <BookOpenText className="mr-2 h-4 w-4" />
                    {openActionLabel}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
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
        <div className="rounded-[2rem] border border-dashed border-border bg-background/70 p-6 sm:p-8">
          <div className="mb-4 inline-flex rounded-[1.4rem] bg-secondary/70 p-3 text-secondary-foreground">
            <LibraryBig className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Your library is ready for the first reading note.
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            Paste an article, transcript, or long-form note above. The saved
            item will appear here, keep its word count, and reopen from the
            last local reading position on this device.
          </p>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            The separate book library can also import EPUB, FB2, or MOBI files
            without collapsing into the reading-note model.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <a href="#new-reading-form">
                <NotebookPen className="mr-2 h-4 w-4" />
                Start with pasted text
              </a>
            </Button>
            <Button asChild variant="outline">
              <Link to="/reading/books">
                <BookOpenText className="mr-2 h-4 w-4" />
                Open book library
              </Link>
            </Button>
            <Button asChild variant="ghost">
              <Link to="/">Back to decks</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ViewEmptyState({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action: ReactNode
}) {
  return (
    <Card>
      <CardContent className="p-6 sm:p-8">
        <div className="rounded-[2rem] border border-dashed border-border bg-background/70 p-6 sm:p-8">
          <div className="mb-4 inline-flex rounded-[1.4rem] bg-secondary/70 p-3 text-secondary-foreground">
            <Rows3 className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            {title}
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            {description}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">{action}</div>
        </div>
      </CardContent>
    </Card>
  )
}

export function ReadingLibraryPage() {
  const navigate = useNavigate()
  const [documents, setDocuments] = useState<ReadingDocument[]>([])
  const [books, setBooks] = useState<Book[]>([])
  const [title, setTitle] = useState('')
  const [bodyText, setBodyText] = useState('')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [currentView, setCurrentView] = useState<ReadingHubView>('all')

  useEffect(() => {
    let isMounted = true

    void bootstrapAppDb()
      .then(() => Promise.all([listReadingDocuments(), listBooks()]))
      .then(([nextDocuments, nextBooks]) => {
        if (isMounted) {
          setDocuments(nextDocuments)
          setBooks(nextBooks)
          setIsLoading(false)
        }
      })
      .catch((nextError: unknown) => {
        if (isMounted) {
          setLoadError(
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
    setSaveError(null)

    try {
      const createdDocument = await createReadingDocument({
        title,
        bodyText,
      })

      setDocuments((currentDocuments) => [createdDocument, ...currentDocuments])
      setTitle('')
      setBodyText('')
      setCurrentView('documents')
      navigate(`/reading/${createdDocument.id}`)
    } catch (nextError: unknown) {
      setSaveError(
        nextError instanceof Error
          ? nextError.message
          : 'Failed to save the reading item.',
      )
    } finally {
      setIsSaving(false)
    }
  }

  const hasDocuments = documents.length > 0
  const hasBooks = books.length > 0
  const hasLibraryContent = hasDocuments || hasBooks
  const visibleDocuments =
    currentView === 'books' ? [] : documents
  const visibleBooks =
    currentView === 'documents' ? [] : books
  const featuredBooks = useMemo(
    () => (currentView === 'all' ? books.slice(0, 2) : books),
    [books, currentView],
  )

  return (
    <PageScaffold
      header={
        <PageIntro
          eyebrow="Reading library"
          title="My sanctuary"
          description="Continue your deep study journey. Your library houses everything from fleeting notes to imported technical volumes while keeping decks and study as the MVP core."
          badges={
            <>
              <Badge variant="accent">Reading hub</Badge>
              <Badge variant="outline">Optional extra</Badge>
              <Badge variant="outline">Local-first library</Badge>
              <Badge variant="outline">Separate notes and books</Badge>
            </>
          }
        />
      }
      actions={
        <>
          <Button asChild size="lg">
            <a href="#new-reading-form">
              <NotebookPen className="mr-2 h-4 w-4" />
              Create from pasted text
            </a>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/reading/books">
              <BookOpenText className="mr-2 h-4 w-4" />
              Browse book library
            </Link>
          </Button>
          <Button asChild variant="ghost" size="lg">
            <Link to="/">Back to decks</Link>
          </Button>
        </>
      }
      list={
        <div className="space-y-6">
          <HubFilterBar
            currentView={currentView}
            documentCount={documents.length}
            bookCount={books.length}
            onChange={setCurrentView}
          />

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
          ) : loadError ? (
            <div
              role="alert"
              className="rounded-[1.4rem] border border-destructive/30 bg-destructive/8 p-4 text-sm text-destructive"
            >
              {loadError}
            </div>
          ) : !hasLibraryContent ? (
            <ReadingEmptyState />
          ) : (
            <>
              {(currentView === 'all' || currentView === 'documents') &&
              hasDocuments ? (
                <ReadingDocumentsSection documents={visibleDocuments} />
              ) : null}

              {currentView === 'documents' && !hasDocuments ? (
                <ViewEmptyState
                  title="No reading notes yet."
                  description="This view only shows note-style reading documents. Start with pasted text to populate it."
                  action={
                    <Button asChild>
                      <a href="#new-reading-form">
                        <NotebookPen className="mr-2 h-4 w-4" />
                        Start with pasted text
                      </a>
                    </Button>
                  }
                />
              ) : null}

              {(currentView === 'all' || currentView === 'books') && hasBooks ? (
                <ImportedBooksSection
                  books={currentView === 'all' ? featuredBooks : visibleBooks}
                  title={currentView === 'all' ? 'Imported books spotlight' : 'Imported books'}
                  description={
                    currentView === 'all'
                      ? 'A quick preview of the separate book library, with the full collection still living on its own route.'
                      : 'Imported books keep their own route and storage model while remaining easy to reach from the reading hub.'
                  }
                />
              ) : null}

              {currentView === 'books' && !hasBooks ? (
                <ViewEmptyState
                  title="No imported books yet."
                  description="The book view stays separate from reading notes. Open the book library to import an EPUB, FB2, or MOBI file."
                  action={
                    <Button asChild>
                      <Link to="/reading/books">
                        <BookOpenText className="mr-2 h-4 w-4" />
                        Open book library
                      </Link>
                    </Button>
                  }
                />
              ) : null}
            </>
          )}
        </div>
      }
      detail={
        <div className="space-y-6">
          <ReadingHubSidebar
            documentCount={documents.length}
            bookCount={books.length}
          />
          <ReadingCreationForm
            bodyText={bodyText}
            error={saveError}
            isSaving={isSaving}
            title={title}
            onBodyTextChange={setBodyText}
            onSubmit={handleSubmit}
            onTitleChange={setTitle}
          />
        </div>
      }
      layout="detail"
    />
  )
}
