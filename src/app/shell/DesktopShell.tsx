import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { DesktopSectionsNav } from '@/app/shell/ShellNavigation'
import type { RouteChromeConfig } from '@/app/shell/shell-contracts'
import { Badge } from '@/components/ui/badge'

export function DesktopShell({
  children,
  chrome,
}: {
  children: ReactNode
  chrome: RouteChromeConfig
}) {
  return (
    <div className="ranki-shell-desktop relative min-h-dvh overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-0 top-0 h-[30rem] w-[30rem] rounded-full bg-primary/12 blur-[160px]" />
        <div className="absolute bottom-0 right-0 h-[32rem] w-[32rem] rounded-full bg-accent/16 blur-[180px]" />
      </div>

      <div className="relative mx-auto grid min-h-dvh w-full max-w-[1440px] grid-cols-[18.5rem_minmax(0,1fr)] gap-4 px-4 py-4">
        <aside className="flex min-h-[calc(100dvh-2rem)] flex-col rounded-[2rem] border border-border/70 bg-card/86 p-4 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl">
          <div className="rounded-[1.6rem] border border-white/10 bg-primary px-4 py-4 text-primary-foreground shadow-[0_24px_48px_rgba(43,117,181,0.28)]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Link
                  to="/"
                  className="text-[0.72rem] font-semibold uppercase tracking-[0.34em] text-primary-foreground/70"
                >
                  Ranki
                </Link>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight">
                  Deep study workspace
                </h1>
              </div>
              <Badge
                variant="outline"
                className="border-white/18 bg-white/10 text-primary-foreground"
              >
                Local
              </Badge>
            </div>
            <p className="mt-3 text-sm leading-6 text-primary-foreground/82">
              Deck-first flashcards, local reading tools, and honest offline
              settings in one calm desktop shell.
            </p>
          </div>

          <div className="mt-5 flex-1 space-y-3">
            <p className="px-2 text-xs font-semibold uppercase tracking-[0.26em] text-muted-foreground">
              Desktop sections
            </p>
            <DesktopSectionsNav />
          </div>

          <div className="rounded-[1.6rem] border border-border/70 bg-background/70 p-4 text-sm leading-6 text-muted-foreground">
            The shell changes between mobile and desktop, but routes, Dexie
            state, study logic, and offline persistence stay shared.
          </div>
        </aside>

        <div className="flex min-h-[calc(100dvh-2rem)] min-w-0 flex-col">
          <header className="rounded-[2rem] border border-border/70 bg-card/86 px-6 py-5 shadow-[0_24px_80px_rgba(15,23,42,0.1)] backdrop-blur-xl">
            <div className="flex items-start justify-between gap-6">
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">
                    {chrome.eyebrow}
                  </p>
                  <Badge variant="outline">Desktop workspace</Badge>
                </div>
                <div className="space-y-2">
                  <h2 className="text-3xl font-semibold tracking-tight">{chrome.title}</h2>
                  <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                    {chrome.description}
                  </p>
                </div>
              </div>
            </div>
          </header>

          <main className="min-h-0 flex-1 py-4">{children}</main>
        </div>
      </div>
    </div>
  )
}
