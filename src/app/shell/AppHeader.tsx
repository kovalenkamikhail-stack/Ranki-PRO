import {
  BarChart3,
  BookOpenText,
  BookText,
  Cog,
  LibraryBig,
  Smartphone,
} from 'lucide-react'
import { Link, NavLink } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button-variants'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', label: 'Decks', icon: LibraryBig },
  { to: '/reading', label: 'Reading', icon: BookText },
  { to: '/statistics', label: 'Statistics', icon: BarChart3 },
  { to: '/settings', label: 'Settings', icon: Cog },
] as const

export function AppHeader() {
  return (
    <header className="rounded-[2rem] border border-border/60 bg-card/80 px-5 py-4 shadow-[0_1px_0_rgba(255,255,255,0.5)_inset,0_24px_80px_rgba(19,35,31,0.08)] backdrop-blur">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/20">
            <BookOpenText className="h-6 w-6" />
          </div>

          <div className="space-y-2">
            <Link to="/" className="inline-flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                Ranki
              </span>
              <Badge variant="accent">Local-first MVP</Badge>
            </Link>

            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Calm study, reading, and local insight that stay with you offline.
              </h1>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Decks, text-first cards, local reading documents, and study
                activity now persist on this device without sync or cloud
                dependencies.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <nav className="flex flex-wrap gap-2">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  cn(
                    buttonVariants({
                      variant: isActive ? 'default' : 'ghost',
                      size: 'sm',
                    }),
                    'rounded-full px-4',
                  )
                }
              >
                <Icon className="mr-2 h-4 w-4" />
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Smartphone className="h-4 w-4" />
            <span>Desktop browser + iPhone PWA</span>
          </div>
        </div>
      </div>
    </header>
  )
}
