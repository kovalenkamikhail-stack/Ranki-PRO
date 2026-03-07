import type { ReactNode } from 'react'
import { AppHeader } from '@/app/shell/AppHeader'

interface ShellFrameProps {
  children: ReactNode
}

export function ShellFrame({ children }: ShellFrameProps) {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 left-1/2 h-80 w-80 -translate-x-1/2 rounded-full bg-primary/18 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-accent/35 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 pb-[calc(env(safe-area-inset-bottom)+2rem)] pt-[calc(env(safe-area-inset-top)+1rem)] sm:px-6 lg:px-8">
        <AppHeader />
        <main className="flex-1 py-8">{children}</main>
      </div>
    </div>
  )
}
