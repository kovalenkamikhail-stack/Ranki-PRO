import { Outlet, useLocation } from 'react-router-dom'
import { getRouteChrome } from '@/app/shell/route-chrome'
import { ShellProvider } from '@/app/shell/ShellContext'
import { ShellFrame } from '@/app/shell/ShellFrame'
import { useShellMode } from '@/app/shell/use-shell-mode'

export function AppShell() {
  const location = useLocation()
  const mode = useShellMode()
  const chrome = getRouteChrome(location.pathname)

  return (
    <ShellProvider
      value={{
        mode,
        isDesktop: mode === 'desktop',
        chrome,
      }}
    >
      <ShellFrame>
        <Outlet />
      </ShellFrame>
    </ShellProvider>
  )
}
