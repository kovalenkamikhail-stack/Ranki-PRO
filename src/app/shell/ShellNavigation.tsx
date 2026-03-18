import { NavLink } from 'react-router-dom'
import { shellNavItems } from '@/app/shell/route-chrome'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

function navLinkClassName({
  isActive,
  compact = false,
}: {
  isActive: boolean
  compact?: boolean
}) {
  return cn(
    'flex items-center gap-3 rounded-[1.35rem] border px-3 py-3 text-sm font-medium transition-all duration-200',
    compact ? 'flex-1 justify-center px-3 py-2.5 text-xs' : 'w-full justify-start',
    isActive
      ? 'border-primary/30 bg-primary text-primary-foreground shadow-[0_18px_40px_rgba(43,117,181,0.22)]'
      : 'border-transparent bg-transparent text-muted-foreground hover:border-border/70 hover:bg-card/75 hover:text-foreground',
  )
}

export function DesktopSectionsNav() {
  return (
    <nav aria-label="Desktop sections" className="space-y-2">
      {shellNavItems.map((item) => {
        const Icon = item.icon

        return (
          <NavLink
            key={item.key}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              navLinkClassName({
                isActive,
              })
            }
          >
            <Icon className="h-4 w-4" />
            <span>{item.label}</span>
            {item.kind === 'extra' ? (
              <Badge
                variant="outline"
                aria-hidden="true"
                className="ml-auto border-white/15 bg-white/8 text-current"
              >
                Extra
              </Badge>
            ) : null}
          </NavLink>
        )
      })}
    </nav>
  )
}

export function MobileSectionsNav() {
  return (
    <nav
      aria-label="Mobile sections"
      className="grid grid-cols-4 gap-2 rounded-[1.6rem] border border-border/70 bg-card/92 p-2 shadow-[0_24px_60px_rgba(15,23,42,0.2)] backdrop-blur-xl"
    >
      {shellNavItems.map((item) => {
        const Icon = item.icon

        return (
          <NavLink
            key={item.key}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              navLinkClassName({
                isActive,
                compact: true,
              })
            }
          >
            <Icon className="h-4 w-4" />
            <span>{item.label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}
