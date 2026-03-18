import type { ReactNode } from 'react'
import { DesktopShell } from '@/app/shell/DesktopShell'
import { MobileShell } from '@/app/shell/MobileShell'
import { useShellContext } from '@/app/shell/ShellContext'

interface ShellFrameProps {
  children: ReactNode
}

export function ShellFrame({ children }: ShellFrameProps) {
  const { chrome, mode } = useShellContext()

  if (mode === 'desktop') {
    return <DesktopShell chrome={chrome}>{children}</DesktopShell>
  }

  return <MobileShell chrome={chrome}>{children}</MobileShell>
}
