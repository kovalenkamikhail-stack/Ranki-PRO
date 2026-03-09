import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  Clock3,
  Columns2,
  LibraryBig,
  LoaderCircle,
  StretchHorizontal,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  getBookWithChapters,
  markBookOpened,
  saveBookProgress,
} from '@/db/books'
import { bootstrapAppDb } from '@/db/bootstrap'
import type { Book, BookChapter, BookContentBlock } from '@/entities/book'
import { cn } from '@/lib/utils'

const timestampFormatter = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
})

type ReaderWidth = 'focused' | 'wide'

function formatTimestamp(timestamp: number | null) {
  if (timestamp === null) {
    return 'Not opened yet'
  }

  return timestampFormatter.format(timestamp)
}

function formatProgress(lastReadProgress: number) {
  return `${Math.round(lastReadProgress * 100)}%`
}

function getScrollProgress(element: HTMLDivElement) {
  const maxScrollTop = element.scrollHeight - element.clientHeight

  if (maxScrollTop <= 0) {
    return 0
  }

  return element.scrollTop / maxScrollTop
}

function ReaderUnavailableState({
  description,
  title,
}: {
  description: string
  title: string
}) {
  return (
    <Card className="mx-auto max-w-4xl">
      <CardHeader className="gap-4">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-[1.6rem] bg-secondary text-secondary-foreground">
          <BookOpenText className="h-7 w-7" />
        </div>
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            Book Reader
          </p>
          <CardTitle className="text-3xl">{title}</CardTitle>
          <CardDescription className="text-base">{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <Button asChild>
          <Link to="/reading/books">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to book library
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}

function renderBookBlock(block: BookContentBlock, key: string) {
  if (block.type === 'heading') {
    const headingClassName =
      block.level <= 1
        ? 'text-3xl font-semibold tracking-tight sm:text-4xl'
        : block.level === 2
          ? 'text-2xl font-semibold tracking-tight sm:text-3xl'
          : 'text-xl font-semibold tracking-tight'

    return (
      <h2 key={key} className={headingClassName}>
        {block.text}
      </h2>
    )
  }

  if (block.type === 'quote') {
    return (
      <blockquote
        key={key}
        className="rounded-[1.3rem] border-l-4 border-primary/40 bg-background/70 px-5 py-4 text-[1.03rem] italic leading-8 text-foreground/90"
      >
        {block.text}
      </blockquote>
    )
  }

  if (block.type === 'list-item') {
    return (
      <p
        key={key}
        className="pl-6 text-[1.03rem] leading-8 text-foreground before:mr-3 before:inline-block before:content-['•']"
      >
        {block.text}
      </p>
    )
  }

  return (
    <p key={key} className="text-[1.03rem] leading-8 text-foreground">
      {block.text}
    </p>
  )
}

function BookReaderWorkspace({ bookId }: { bookId: string }) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const saveTimerRef = useRef<number | null>(null)
  const hasRestoredScrollRef = useRef(false)
  const latestBookIdRef = useRef<string | null>(null)
  const latestChapterIndexRef = useRef(0)
  const latestProgressRef = useRef(0)
  const [book, setBook] = useState<Book | null>(null)
  const [chapters, setChapters] = useState<BookChapter[]>([])
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isMissing, setIsMissing] = useState(false)
  const [readerWidth, setReaderWidth] = useState<ReaderWidth>('focused')

  useEffect(() => {
    let isMounted = true
    hasRestoredScrollRef.current = false

    void bootstrapAppDb()
      .then(() => getBookWithChapters(bookId))
      .then(async (snapshot) => {
        if (!snapshot) {
          return null
        }

        const openedBook = await markBookOpened(bookId)

        return {
          book: openedBook,
          chapters: snapshot.chapters,
        }
      })
      .then((snapshot) => {
        if (!isMounted) {
          return
        }

        if (!snapshot || snapshot.chapters.length === 0) {
          setIsMissing(true)
          setBook(null)
          setChapters([])
          return
        }

        setBook(snapshot.book)
        setChapters(snapshot.chapters)
        setCurrentChapterIndex(snapshot.book.lastReadChapterIndex)
        latestBookIdRef.current = snapshot.book.id
        latestChapterIndexRef.current = snapshot.book.lastReadChapterIndex
        latestProgressRef.current = snapshot.book.lastReadProgress
        setLoadError(null)
        setActionError(null)
        setIsMissing(false)
      })
      .catch((nextError: unknown) => {
        if (isMounted) {
          setLoadError(
            nextError instanceof Error
              ? nextError.message
              : 'Failed to load the book reader.',
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

      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current)
      }

      const latestBookId = latestBookIdRef.current

      if (!latestBookId) {
        return
      }

      void saveBookProgress(
        latestBookId,
        latestChapterIndexRef.current,
        latestProgressRef.current,
      ).catch(() => {
        // Best-effort flush on exit.
      })
    }
  }, [bookId])

  const currentChapter = useMemo(
    () => chapters[currentChapterIndex] ?? null,
    [chapters, currentChapterIndex],
  )

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current

    if (!book || !currentChapter || !scrollContainer || hasRestoredScrollRef.current) {
      return
    }

    hasRestoredScrollRef.current = true

    const targetProgress =
      currentChapterIndex === book.lastReadChapterIndex ? book.lastReadProgress : 0

    let frameIdOne = 0
    let frameIdTwo = 0

    frameIdOne = window.requestAnimationFrame(() => {
      frameIdTwo = window.requestAnimationFrame(() => {
        const maxScrollTop =
          scrollContainer.scrollHeight - scrollContainer.clientHeight

        scrollContainer.scrollTop = maxScrollTop <= 0 ? 0 : maxScrollTop * targetProgress
      })
    })

    return () => {
      window.cancelAnimationFrame(frameIdOne)
      window.cancelAnimationFrame(frameIdTwo)
    }
  }, [book, currentChapter, currentChapterIndex])

  useEffect(() => {
    hasRestoredScrollRef.current = false
  }, [currentChapterIndex])

  const persistProgress = (chapterIndex: number, progress: number) => {
    const currentBook = latestBookIdRef.current

    if (!currentBook) {
      return
    }

    void saveBookProgress(currentBook, chapterIndex, progress)
      .then((updatedBook) => {
        latestBookIdRef.current = updatedBook.id
        latestChapterIndexRef.current = updatedBook.lastReadChapterIndex
        latestProgressRef.current = updatedBook.lastReadProgress
        setBook((currentBookState) =>
          currentBookState?.id === updatedBook.id ? updatedBook : currentBookState,
        )
        setActionError(null)
      })
      .catch((nextError: unknown) => {
        setActionError(
          nextError instanceof Error
            ? nextError.message
            : 'Failed to save the book position.',
        )
      })
  }

  const handleScroll = () => {
    const scrollContainer = scrollContainerRef.current

    if (!book || !currentChapter || !scrollContainer) {
      return
    }

    const nextProgress = getScrollProgress(scrollContainer)
    latestBookIdRef.current = book.id
    latestChapterIndexRef.current = currentChapterIndex
    latestProgressRef.current = nextProgress
    setBook((currentBookState) =>
      currentBookState
        ? {
            ...currentBookState,
            lastReadChapterIndex: currentChapterIndex,
            lastReadProgress: nextProgress,
          }
        : currentBookState,
    )

    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current)
    }

    saveTimerRef.current = window.setTimeout(() => {
      persistProgress(currentChapterIndex, nextProgress)
    }, 180)
  }

  const handleChapterSelect = (chapterIndex: number) => {
    if (!book || !chapters[chapterIndex]) {
      return
    }

    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current)
    }

    latestBookIdRef.current = book.id
    latestChapterIndexRef.current = chapterIndex
    latestProgressRef.current = 0
    setBook((currentBookState) =>
      currentBookState
        ? {
            ...currentBookState,
            lastReadChapterIndex: chapterIndex,
            lastReadProgress: 0,
          }
        : currentBookState,
    )
    setCurrentChapterIndex(chapterIndex)
    setActionError(null)
  }

  if (isLoading) {
    return (
      <Card className="mx-auto max-w-4xl">
        <CardHeader>
          <CardTitle>Loading book reader</CardTitle>
          <CardDescription>
            Opening the imported EPUB from IndexedDB.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <LoaderCircle className="h-4 w-4 motion-safe:animate-spin" />
            Restoring the latest local book and chapter position.
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loadError) {
    return (
      <ReaderUnavailableState
        title="Book reader unavailable"
        description={loadError}
      />
    )
  }

  if (isMissing || !book || chapters.length === 0 || !currentChapter) {
    return (
      <ReaderUnavailableState
        title="Book not found"
        description="This imported book is not stored on the current device anymore."
      />
    )
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <Card className="overflow-hidden">
        <CardHeader className="gap-4 border-b border-border/50 bg-card/72">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="accent">Book reader</Badge>
            <Badge variant="outline">EPUB</Badge>
            <Badge variant="outline">Saved on this device</Badge>
          </div>

          <div className="space-y-3">
            <CardTitle className="text-3xl sm:text-4xl">{book.title}</CardTitle>
            <CardDescription className="max-w-2xl text-base">
              {book.author
                ? `${book.author} · ${book.chapterCount} ${book.chapterCount === 1 ? 'chapter' : 'chapters'}`
                : `${book.chapterCount} ${book.chapterCount === 1 ? 'chapter' : 'chapters'} saved locally from ${book.fileName}.`}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">
          {actionError ? (
            <div
              role="alert"
              className="rounded-[1.4rem] border border-destructive/30 bg-destructive/8 p-4 text-sm text-destructive"
            >
              {actionError}
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
              <p className="text-sm font-medium text-muted-foreground">
                Current chapter
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {currentChapterIndex + 1} / {chapters.length}
              </p>
            </div>

            <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
              <p className="text-sm font-medium text-muted-foreground">
                Resume point
              </p>
              <p className="mt-2 text-2xl font-semibold">
                {formatProgress(book.lastReadProgress)}
              </p>
            </div>

            <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
              <p className="text-sm font-medium text-muted-foreground">Words</p>
              <p className="mt-2 text-2xl font-semibold">{currentChapter.wordCount}</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
              <Link to="/reading/books">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to book library
              </Link>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="lg"
              disabled={currentChapterIndex === 0}
              onClick={() => handleChapterSelect(currentChapterIndex - 1)}
              className="w-full sm:w-auto"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Previous chapter
            </Button>

            <Button
              type="button"
              size="lg"
              disabled={currentChapterIndex >= chapters.length - 1}
              onClick={() => handleChapterSelect(currentChapterIndex + 1)}
              className="w-full sm:w-auto"
            >
              Next chapter
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>

          <div className="rounded-[1.8rem] border border-border/70 bg-background/82 p-3 sm:p-4">
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              aria-label="Book chapter content"
              className="max-h-[68dvh] overflow-y-auto rounded-[1.4rem] bg-card/72 px-4 py-6 sm:px-6"
            >
              <article
                className={cn(
                  'mx-auto w-full space-y-5 text-foreground',
                  readerWidth === 'focused' ? 'max-w-3xl' : 'max-w-5xl',
                )}
              >
                {currentChapter.blocks.map((block, index) =>
                  renderBookBlock(
                    block,
                    `${currentChapter.id}-${block.type}-${index}`,
                  ),
                )}
              </article>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Book context</CardTitle>
          <CardDescription>
            Local reader state for this imported EPUB.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
            <p className="text-sm font-medium text-muted-foreground">Last opened</p>
            <p className="mt-2 text-base font-semibold">
              {formatTimestamp(book.lastOpenedAt)}
            </p>
          </div>

          <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
            <p className="text-sm font-medium text-muted-foreground">
              Imported file
            </p>
            <p className="mt-2 text-base font-semibold">{book.fileName}</p>
          </div>

          <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
            <p className="text-sm font-medium text-muted-foreground">Width control</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={readerWidth === 'focused' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setReaderWidth('focused')}
              >
                <Columns2 className="mr-2 h-4 w-4" />
                Focused
              </Button>
              <Button
                type="button"
                variant={readerWidth === 'wide' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setReaderWidth('wide')}
              >
                <StretchHorizontal className="mr-2 h-4 w-4" />
                Wide
              </Button>
            </div>
          </div>

          <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
            <p className="text-sm font-medium text-muted-foreground">
              Chapter list
            </p>
            <div className="mt-3 max-h-[34dvh] space-y-2 overflow-y-auto">
              {chapters.map((chapter) => (
                <Button
                  key={chapter.id}
                  type="button"
                  variant={
                    chapter.chapterIndex === currentChapterIndex ? 'default' : 'ghost'
                  }
                  size="sm"
                  onClick={() => handleChapterSelect(chapter.chapterIndex)}
                  className="h-auto min-h-12 w-full justify-start rounded-[1.2rem] px-4 py-3 text-left"
                >
                  <span className="line-clamp-2">
                    {chapter.chapterIndex + 1}. {chapter.title}
                  </span>
                </Button>
              ))}
            </div>
          </div>

          <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4 text-sm leading-6 text-muted-foreground">
            <div className="flex items-start gap-3">
              <LibraryBig className="mt-0.5 h-4 w-4 flex-none text-primary" />
              <p>
                This first slice intentionally favors safe, text-first EPUB
                reading over CSS-fidelity or inline asset support.
              </p>
            </div>
          </div>

          <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4 text-sm leading-6 text-muted-foreground">
            <div className="flex items-start gap-3">
              <Clock3 className="mt-0.5 h-4 w-4 flex-none text-primary" />
              <p>
                Ranki stores chapter index and scroll progression locally so the
                book reopens near the same spot later.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function BookReaderPage() {
  const { bookId } = useParams()

  if (!bookId) {
    return (
      <ReaderUnavailableState
        title="Missing book id"
        description="Open an imported book from the library so Ranki can restore its local reader state."
      />
    )
  }

  return <BookReaderWorkspace key={bookId} bookId={bookId} />
}
