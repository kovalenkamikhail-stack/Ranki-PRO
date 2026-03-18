import type { LucideIcon } from 'lucide-react'

export type ShellMode = 'mobile' | 'desktop'

export type SurfaceTone = 'canvas' | 'panel' | 'soft' | 'accent'

export type PaneLayout = 'single' | 'split' | 'detail' | 'focus'

export type ShellNavKey = 'decks' | 'reading' | 'statistics' | 'settings'

export type ShellSection =
  | ShellNavKey
  | 'study'
  | 'editor'
  | 'capture'
  | 'reader'
  | 'books'

export interface NavItem {
  key: ShellNavKey
  label: string
  to: string
  icon: LucideIcon
  kind: 'primary' | 'extra'
}

export interface RouteChromeConfig {
  section: ShellSection
  navKey: ShellNavKey
  eyebrow: string
  title: string
  description: string
  paneLayout: PaneLayout
  surfaceTone: SurfaceTone
  showBottomNav: boolean
}
