import {
  ArrowRight,
  BookOpenText,
  Clock3,
  LibraryBig,
  LoaderCircle,
  Upload,
} from 'lucide-react'
import { type ChangeEvent, useEffect, useRef, useState } from 'react'
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
import { importEpubBook, listBooks } from '@/db/books'
import type { Book } from '@/entities/book'
import { EPUB_INPUT_ACCEPT } from '@/importers/epub'

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

function formatBookCount(count: number) {
  return `${count} ${count === 1 ? 'book' : 'books'}`
}

function getOpenActionLabel(book: Book) {
  return book.lastOpenedAt !== null || book.lastReadProgress > 0
    ? 'Resume book'
    : 'Open book'
}

export function BookLibraryPage() {
  const navigate = useNavigate()
  const importInputRef = useRef<HTMLInputElement | null>(null)
  const [books, setBooks] = useState<Book[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    void bootstrapAppDb()
      .then(() => listBooks())
      .then((storedBooks) => {
        if (isMounted) {
          setBooks(storedBooks)
          setIsLoading(false)
        }
      })
      .catch((nextError: unknown) => {
        if (isMounted) {
          setError(
            nextError instanceof Error
              ? nextError.message
              : 'Failed to load the book library.',
          )
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [])

  const handleImportClick = () => {
    importInputRef.current?.click()
  }

  const handleImportChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0]
    event.target.value = ''

    if (!selectedFile) {
      return
    }

    setIsImporting(true)
    setError(null)

    try {
      const imported = await importEpubBook(selectedFile)
      setBooks((currentBooks) => [imported.book, ...currentBooks])
      navigate(`/reading/books/${imported.book.id}`)
    } catch (nextError: unknown) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : 'Failed to import the EPUB book.',
      )
    } finally {
      setIsImporting(false)
    }
  }

  const hasBooks = books.length > 0

  return (
    <div className="space-y-6">
      <section className="grid items-start gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <Card className="h-fit overflow-hidden">
          <CardHeader className="gap-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="accent">Book reader</Badge>
              <Badge variant="outline">EPUB foundation</Badge>
            </div>

            <div className="space-y-3">
              <CardTitle className="max-w-2xl text-3xl sm:text-4xl">
                Import real books and keep them readable offline.
              </CardTitle>
              <CardDescription className="max-w-2xl text-base">
                This first slice starts the actual book-reader direction with
                local EPUB import, a dedicated reader view, and saved reading
                position on this device.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Library
                </p>
                <p className="mt-2 text-3xl font-semibold">
                  {isLoading ? '...' : books.length}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Imported books stored locally.
                </p>
              </div>

              <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
                <p className="text-sm font-medium text-muted-foreground">
                  First format
                </p>
                <p className="mt-2 text-xl font-semibold">EPUB</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Non-DRM EPUB 2/3 in this slice.
                </p>
              </div>

              <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
                <p className="text-sm font-medium text-muted-foreground">
                  Resume model
                </p>
                <p className="mt-2 text-xl font-semibold">Chapter + progress</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Saved locally as you read.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button
                type="button"
                size="lg"
                onClick={handleImportClick}
                disabled={isImporting}
                className="w-full sm:w-auto"
              >
                <Upload className="mr-2 h-4 w-4" />
                {isImporting ? 'Importing EPUB...' : 'Import EPUB book'}
              </Button>
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                <Link to="/reading">Open reading tools</Link>
              </Button>
            </div>

            <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4 text-sm leading-6 text-muted-foreground">
              Deferred on purpose for this first book-reader slice: PDF, MOBI,
              FB2, annotations, highlights, sync, and card generation.
            </div>

            <input
              ref={importInputRef}
              type="file"
              accept={EPUB_INPUT_ACCEPT}
              onChange={(event) => void handleImportChange(event)}
              className="hidden"
              aria-label="Import EPUB book"
            />
          </CardContent>
        </Card>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Import rules</CardTitle>
            <CardDescription>
              Keep the first slice explicit and predictable.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
              <p className="font-medium">Text-first rendering</p>
              <p className="mt-1 text-sm text-muted-foreground">
                The reader focuses on readable chapter flow and safe typography
                before cover art, advanced CSS, or inline assets.
              </p>
            </div>

            <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
              <p className="font-medium">Offline-only storage</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Imported books and reading position stay in IndexedDB on the
                current device only.
              </p>
            </div>

            <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
              <p className="font-medium">One real format first</p>
              <p className="mt-1 text-sm text-muted-foreground">
                EPUB is the first-class format here because it gives us a real
                reflowable book reader without forcing a PDF-style viewer.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {error ? (
        <div
          role="alert"
          className="rounded-[1.4rem] border border-destructive/30 bg-destructive/8 p-5 text-sm text-destructive"
        >
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <Card>
          <CardHeader>
            <CardTitle>Loading book library</CardTitle>
            <CardDescription>
              Reading the latest imported books from IndexedDB.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <LoaderCircle className="h-4 w-4 motion-safe:animate-spin" />
              Gathering imported books and saved reading locators.
            </div>
          </CardContent>
        </Card>
      ) : hasBooks ? (
        <section className="space-y-4" aria-labelledby="book-library-heading">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h2
                  id="book-library-heading"
                  className="text-2xl font-semibold tracking-tight"
                >
                  Book library
                </h2>
                <Badge variant="outline">{formatBookCount(books.length)}</Badge>
                <Badge variant="outline">Most recently opened first</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Imported books that can reopen offline from the last saved spot.
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={handleImportClick}
              disabled={isImporting}
              className="w-full sm:w-auto"
            >
              <Upload className="mr-2 h-4 w-4" />
              {isImporting ? 'Importing EPUB...' : 'Import another EPUB'}
            </Button>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {books.map((book) => {
              const openActionLabel = getOpenActionLabel(book)

              return (
                <Card key={book.id} className="h-full overflow-hidden">
                  <CardHeader className="gap-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="accent">EPUB</Badge>
                      <Badge variant="outline">
                        {book.chapterCount}{' '}
                        {book.chapterCount === 1 ? 'chapter' : 'chapters'}
                      </Badge>
                      <Badge variant="outline">
                        Resume {formatProgress(book.lastReadProgress)}
                      </Badge>
                    </div>

                    <div className="space-y-2">
                      <CardTitle className="text-xl leading-tight sm:text-[1.35rem]">
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
                    <div className="rounded-[1.3rem] border border-border/70 bg-background/70 p-4 text-sm leading-6 text-muted-foreground">
                      {book.totalWordCount} words across {book.chapterCount}{' '}
                      {book.chapterCount === 1 ? 'chapter' : 'chapters'} from{' '}
                      {book.fileName}.
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <p className="text-sm leading-6 text-muted-foreground">
                        {book.lastOpenedAt === null
                          ? 'Imported and ready to open in the dedicated book reader.'
                          : `Reopen chapter ${book.lastReadChapterIndex + 1} from the saved local position.`}
                      </p>

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
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </section>
      ) : (
        <Card>
          <CardContent className="p-6 sm:p-8">
            <div className="rounded-[1.8rem] border border-dashed border-border bg-background/70 p-6 sm:p-8">
              <div className="mb-4 inline-flex rounded-2xl bg-secondary p-3 text-secondary-foreground">
                <LibraryBig className="h-6 w-6" />
              </div>
              <h2 className="text-2xl font-semibold tracking-tight">
                Import the first EPUB to start the real book-reader path.
              </h2>
              <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
                Choose a local non-DRM EPUB book from disk. Ranki will extract a
                text-first chapter flow, store it offline, and reopen the book
                from the last saved reading position later.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button type="button" onClick={handleImportClick} disabled={isImporting}>
                  <Upload className="mr-2 h-4 w-4" />
                  {isImporting ? 'Importing EPUB...' : 'Import EPUB book'}
                </Button>
                <Button asChild variant="outline">
                  <Link to="/reading">Open reading tools</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
