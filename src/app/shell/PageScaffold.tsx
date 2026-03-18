import type { ReactNode } from 'react'
import { useShellContext } from '@/app/shell/ShellContext'
import type { PaneLayout, SurfaceTone } from '@/app/shell/shell-contracts'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface PageScaffoldProps {
  header?: ReactNode
  actions?: ReactNode
  list?: ReactNode
  detail?: ReactNode
  aside?: ReactNode
  children?: ReactNode
  layout?: PaneLayout
  tone?: SurfaceTone
  className?: string
}

export interface PageIntroProps {
  eyebrow?: ReactNode
  title: ReactNode
  description?: ReactNode
  badges?: ReactNode
  meta?: ReactNode
  className?: string
}

type PanePresentation = 'stacked' | 'single' | 'split' | 'detail' | 'focus'

function getPanePresentation(
  layout: PaneLayout,
  isDesktop: boolean,
): PanePresentation {
  if (!isDesktop) {
    return 'stacked'
  }

  if (layout === 'split') {
    return 'split'
  }

  if (layout === 'detail') {
    return 'detail'
  }

  if (layout === 'focus') {
    return 'focus'
  }

  return 'single'
}

function getBodyClassName(presentation: PanePresentation) {
  if (presentation === 'split') {
    return 'grid gap-4 xl:grid-cols-[minmax(0,1.08fr)_minmax(18rem,0.92fr)]'
  }

  if (presentation === 'detail') {
    return 'grid gap-4 xl:grid-cols-[minmax(0,1.18fr)_20rem]'
  }

  if (presentation === 'focus') {
    return 'grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_22rem]'
  }

  return 'grid gap-4'
}

function getSurfaceToneClassName(tone: SurfaceTone) {
  if (tone === 'accent') {
    return 'border-primary/18 bg-primary/[0.05]'
  }

  if (tone === 'soft') {
    return 'border-border/60 bg-muted/26'
  }

  if (tone === 'canvas') {
    return 'border-border/50 bg-background/70'
  }

  return 'border-border/70 bg-card/88'
}

function SlotSurface({
  ariaLabel,
  children,
  className,
  tone = 'panel',
}: {
  ariaLabel: string
  children: ReactNode
  className?: string
  tone?: SurfaceTone
}) {
  return (
    <section
      role="region"
      aria-label={ariaLabel}
      className={cn(
        'rounded-[1.85rem] border p-4 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-5',
        getSurfaceToneClassName(tone),
        className,
      )}
    >
      {children}
    </section>
  )
}

export function PageIntro({
  eyebrow,
  title,
  description,
  badges,
  meta,
  className,
}: PageIntroProps) {
  return (
    <div
      className={cn(
        'rounded-[1.85rem] border border-border/70 bg-card/88 p-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-6',
        className,
      )}
    >
      {(eyebrow || badges || meta) && (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            {eyebrow ? (
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                {eyebrow}
              </p>
            ) : null}
            {badges ? <div className="flex flex-wrap items-center gap-2">{badges}</div> : null}
          </div>
          {meta ? <div>{meta}</div> : null}
        </div>
      )}

      <div className="mt-3 space-y-2">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-[2.25rem]">
          {title}
        </h2>
        {description ? (
          <p className="max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
            {description}
          </p>
        ) : null}
      </div>
    </div>
  )
}

export function PageScaffold({
  header,
  actions,
  list,
  detail,
  aside,
  children,
  layout = 'single',
  tone = 'panel',
  className,
}: PageScaffoldProps) {
  const { isDesktop, mode } = useShellContext()
  const presentation = getPanePresentation(layout, isDesktop)
  const hasScaffoldSlots = Boolean(list || detail || aside || children)

  return (
    <div
      data-testid="page-scaffold"
      data-shell-mode={mode}
      className={cn('space-y-4 sm:space-y-5', className)}
    >
      {header ? (
        <SlotSurface ariaLabel="Page header" tone={tone}>
          {header}
        </SlotSurface>
      ) : null}

      {actions ? (
        <SlotSurface ariaLabel="Page actions" tone="canvas">
          <div className="flex flex-wrap gap-3">{actions}</div>
        </SlotSurface>
      ) : null}

      {hasScaffoldSlots ? (
        <div
          data-testid="page-scaffold-body"
          data-pane-presentation={presentation}
          className={getBodyClassName(presentation)}
        >
          {list ? (
            <SlotSurface ariaLabel="Page list" tone={tone} className="space-y-4">
              {list}
            </SlotSurface>
          ) : null}

          {detail || children ? (
            <SlotSurface
              ariaLabel="Page detail"
              tone={tone}
              className="space-y-4"
            >
              {detail}
              {children}
            </SlotSurface>
          ) : null}

          {aside ? (
            <SlotSurface
              ariaLabel="Page aside"
              tone="canvas"
              className="space-y-4"
            >
              {aside}
            </SlotSurface>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export function ShellBadgeRow({
  eyebrow,
  badges,
}: {
  eyebrow?: ReactNode
  badges?: ReactNode
}) {
  if (!eyebrow && !badges) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {eyebrow ? (
        <Badge variant="outline" className="border-border/70 bg-background/75">
          {eyebrow}
        </Badge>
      ) : null}
      {badges}
    </div>
  )
}
