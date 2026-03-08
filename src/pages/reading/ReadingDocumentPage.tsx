import {
  ArrowLeft,
  BookOpenText,
  Clock3,
  Columns2,
  FileText,
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
import { bootstrapAppDb } from '@/db/bootstrap'
import {
  getReadingDocument,
  markReadingDocumentOpened,
  saveReadingDocumentProgress,
} from '@/db/reading-documents'
import {
  READING_WORDS_PER_MINUTE,
  type ReadingDocument,
} from '@/entities/reading-document'
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

function estimateReadingMinutes(wordCount: number) {
  return Math.max(1, Math.ceil(wordCount / READING_WORDS_PER_MINUTE))
}

function splitIntoParagraphs(bodyText: string) {
  const paragraphs = bodyText
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)

  return paragraphs.length > 0 ? paragraphs : [bodyText.trim()]
}

function getScrollProgress(element: HTMLDivElement) {
  const maxScrollTop = element.scrollHeight - element.clientHeight

  if (maxScrollTop <= 0) {
    return 0
  }

  return element.scrollTop / maxScrollTop
}

function MissingDocumentIdState() {
  return (
    <Card className="mx-auto max-w-4xl">
      <CardHeader className="gap-4">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-[1.6rem] bg-destructive/12 text-destructive">
          <BookOpenText className="h-7 w-7" />
        </div>
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            Reading View
          </p>
          <CardTitle className="text-3xl">Missing reading id</CardTitle>
          <CardDescription className="text-base">
            Open a saved reading item from the library so Ranki can restore its
            local reader state.
          </CardDescription>
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

function ReadingDocumentWorkspace({ documentId }: { documentId: string }) {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const saveTimerRef = useRef<number | null>(null)
  const hasRestoredScrollRef = useRef(false)
  const latestDocumentIdRef = useRef<string | null>(null)
  const latestProgressRef = useRef(0)
  const [document, setDocument] = useState<ReadingDocument | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isMissing, setIsMissing] = useState(false)
  const [readerWidth, setReaderWidth] = useState<ReaderWidth>('focused')
  const paragraphs = useMemo(
    () => (document ? splitIntoParagraphs(document.bodyText) : []),
    [document],
  )

  useEffect(() => {
    let isMounted = true
    hasRestoredScrollRef.current = false

    void bootstrapAppDb()
      .then(async () => {
        const storedDocument = await getReadingDocument(documentId)

        if (!storedDocument) {
          return null
        }

        return markReadingDocumentOpened(documentId)
      })
      .then((nextDocument) => {
        if (!isMounted) {
          return
        }

        if (!nextDocument) {
          setIsMissing(true)
          setDocument(null)
          return
        }

        setDocument(nextDocument)
        latestDocumentIdRef.current = nextDocument.id
        latestProgressRef.current = nextDocument.lastReadProgress
        setLoadError(null)
        setActionError(null)
        setIsMissing(false)
      })
      .catch((nextError: unknown) => {
        if (isMounted) {
          setLoadError(
            nextError instanceof Error
              ? nextError.message
              : 'Failed to load the reading document.',
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

      const latestDocumentId = latestDocumentIdRef.current

      if (!latestDocumentId) {
        return
      }

      const nextProgress = scrollContainerRef.current
        ? getScrollProgress(scrollContainerRef.current)
        : latestProgressRef.current

      latestProgressRef.current = nextProgress

      void saveReadingDocumentProgress(latestDocumentId, nextProgress).catch(() => {
        // Best-effort flush on exit; the next visit can still use the last saved value.
      })
    }
  }, [documentId])

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current

    if (!document || !scrollContainer || hasRestoredScrollRef.current) {
      return
    }

    hasRestoredScrollRef.current = true

    let frameIdOne = 0
    let frameIdTwo = 0

    frameIdOne = window.requestAnimationFrame(() => {
      frameIdTwo = window.requestAnimationFrame(() => {
        const maxScrollTop =
          scrollContainer.scrollHeight - scrollContainer.clientHeight

        scrollContainer.scrollTop =
          maxScrollTop <= 0 ? 0 : maxScrollTop * document.lastReadProgress
      })
    })

    return () => {
      window.cancelAnimationFrame(frameIdOne)
      window.cancelAnimationFrame(frameIdTwo)
    }
  }, [document])

  const handleScroll = () => {
    const scrollContainer = scrollContainerRef.current

    if (!document || !scrollContainer) {
      return
    }

    const nextProgress = getScrollProgress(scrollContainer)
    latestProgressRef.current = nextProgress
    setDocument((currentDocument) =>
      currentDocument
        ? {
            ...currentDocument,
            lastReadProgress: nextProgress,
          }
        : currentDocument,
    )

    if (saveTimerRef.current !== null) {
      window.clearTimeout(saveTimerRef.current)
    }

    saveTimerRef.current = window.setTimeout(() => {
      void saveReadingDocumentProgress(document.id, nextProgress)
        .then((updatedDocument) => {
          latestDocumentIdRef.current = updatedDocument.id
          latestProgressRef.current = updatedDocument.lastReadProgress
          setDocument((currentDocument) =>
            currentDocument?.id === updatedDocument.id
              ? updatedDocument
              : currentDocument,
          )
          setActionError(null)
        })
        .catch((nextError: unknown) => {
          setActionError(
            nextError instanceof Error
              ? nextError.message
              : 'Failed to save the reading position.',
          )
        })
    }, 180)
  }

  if (isLoading) {
    return (
      <Card className="mx-auto max-w-4xl">
        <CardHeader>
          <CardTitle>Loading reading view</CardTitle>
          <CardDescription>
            Opening the saved reading document from IndexedDB.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <LoaderCircle className="h-4 w-4 motion-safe:animate-spin" />
            Restoring the latest local reader state.
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loadError) {
    return (
      <Card className="mx-auto max-w-4xl">
        <CardHeader className="gap-4">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-[1.6rem] bg-destructive/12 text-destructive">
            <BookOpenText className="h-7 w-7" />
          </div>
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              Reading View
            </p>
            <CardTitle className="text-3xl">Reading view unavailable</CardTitle>
            <CardDescription className="text-base">{loadError}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
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

  if (isMissing || !document) {
    return (
      <Card className="mx-auto max-w-4xl">
        <CardHeader className="gap-4">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-[1.6rem] bg-secondary text-secondary-foreground">
            <BookOpenText className="h-7 w-7" />
          </div>
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              Reading View
            </p>
            <CardTitle className="text-3xl">Reading document not found</CardTitle>
            <CardDescription className="text-base">
              This document is not stored on the current device anymore.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
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

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_18rem]">
      <Card className="overflow-hidden">
        <CardHeader className="gap-4 border-b border-border/50 bg-card/72">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="accent">Reading view</Badge>
            <Badge variant="outline">Pasted text</Badge>
            <Badge variant="outline">Saved on this device</Badge>
          </div>

          <div className="space-y-3">
            <CardTitle className="text-3xl sm:text-4xl">
              {document.title}
            </CardTitle>
            <CardDescription className="max-w-2xl text-base">
              Resume from the last saved local position and keep the layout calm
              enough for longer reading sessions on desktop or iPhone-sized
              screens.
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
                Word count
              </p>
              <p className="mt-2 text-3xl font-semibold">{document.wordCount}</p>
            </div>
            <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
              <p className="text-sm font-medium text-muted-foreground">
                Estimated read
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {estimateReadingMinutes(document.wordCount)} min
              </p>
            </div>
            <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
              <p className="text-sm font-medium text-muted-foreground">
                Resume point
              </p>
              <p className="mt-2 text-3xl font-semibold">
                {formatProgress(document.lastReadProgress)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button asChild variant="outline" size="lg">
              <Link to="/reading">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to reading library
              </Link>
            </Button>
          </div>

          <div className="rounded-[1.8rem] border border-border/70 bg-background/82 p-3 sm:p-4">
            <div
              ref={scrollContainerRef}
              onScroll={handleScroll}
              aria-label="Reading document content"
              className="max-h-[68dvh] overflow-y-auto rounded-[1.4rem] bg-card/72 px-4 py-6 sm:px-6"
            >
              <article
                className={cn(
                  'mx-auto w-full space-y-5 text-[1.02rem] leading-8 text-foreground sm:text-[1.06rem] sm:leading-8',
                  readerWidth === 'focused' ? 'max-w-3xl' : 'max-w-5xl',
                )}
              >
                {paragraphs.map((paragraph, index) => (
                  <p
                    key={`${document.id}-${index}`}
                    className="whitespace-pre-wrap break-words text-balance"
                  >
                    {paragraph}
                  </p>
                ))}
              </article>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle>Reader context</CardTitle>
          <CardDescription>
            A compact snapshot of the local reading state.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
            <p className="text-sm font-medium text-muted-foreground">
              Last opened
            </p>
            <p className="mt-2 text-base font-semibold">
              {formatTimestamp(document.lastOpenedAt)}
            </p>
          </div>

          <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
            <p className="text-sm font-medium text-muted-foreground">
              Created
            </p>
            <p className="mt-2 text-base font-semibold">
              {formatTimestamp(document.createdAt)}
            </p>
          </div>

          <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4">
            <p className="text-sm font-medium text-muted-foreground">
              Width control
            </p>
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

          <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4 text-sm leading-6 text-muted-foreground">
            <div className="flex items-start gap-3">
              <FileText className="mt-0.5 h-4 w-4 flex-none text-primary" />
              <p>
                The reader renders saved plain text only, without HTML
                interpretation, to keep the content safe and predictable.
              </p>
            </div>
          </div>

          <div className="rounded-[1.4rem] border border-border/70 bg-background/70 p-4 text-sm leading-6 text-muted-foreground">
            <div className="flex items-start gap-3">
              <Clock3 className="mt-0.5 h-4 w-4 flex-none text-primary" />
              <p>
                Scroll position is saved locally as a simple resume ratio while
                you read.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function ReadingDocumentPage() {
  const { documentId } = useParams()

  if (!documentId) {
    return <MissingDocumentIdState />
  }

  return <ReadingDocumentWorkspace key={documentId} documentId={documentId} />
}
