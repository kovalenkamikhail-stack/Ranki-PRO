import { Outlet } from 'react-router-dom'
import { ShellFrame } from '@/app/shell/ShellFrame'

export function AppShell() {
  return <ShellFrame><Outlet /></ShellFrame>
}
