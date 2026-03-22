import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { MobileSectionsNav } from '@/app/shell/ShellNavigation'
import type { RouteChromeConfig } from '@/app/shell/shell-contracts'
import { Badge } from '@/components/ui/badge'

export function MobileShell({
  children,
  chrome,
}: {
  children: ReactNode
  chrome: RouteChromeConfig
}) {
  return (
    <div className="ranki-shell-mobile relative min-h-dvh overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-20 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/18 blur-3xl" />
        <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-accent/26 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-3 pb-[calc(env(safe-area-inset-bottom)+6rem)] pt-[calc(env(safe-area-inset-top)+0.9rem)] sm:px-4">
        <header className="sticky top-[calc(env(safe-area-inset-top)+0.6rem)] z-20 rounded-[1.8rem] border border-border/70 bg-card/88 px-4 py-4 shadow-[0_20px_60px_rgba(15,23,42,0.12)] backdrop-blur-xl">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to="/"
                  className="text-[0.7rem] font-semibold uppercase tracking-[0.34em] text-muted-foreground"
                >
                  Ranki
                </Link>
                <Badge variant="accent">Local-only</Badge>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                  {chrome.eyebrow}
                </p>
                <h1 className="text-2xl font-semibold tracking-tight">{chrome.title}</h1>
                <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                  {chrome.description}
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 py-4">{children}</main>
      </div>

      {chrome.showBottomNav ? (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-3 pb-[calc(env(safe-area-inset-bottom)+0.9rem)] sm:px-4">
          <div className="pointer-events-auto mx-auto max-w-3xl">
            <MobileSectionsNav />
          </div>
        </div>
      ) : null}
    </div>
  )
}
