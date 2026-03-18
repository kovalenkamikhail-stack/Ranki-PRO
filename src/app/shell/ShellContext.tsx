/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, type ReactNode } from 'react'
import type { RouteChromeConfig, ShellMode } from '@/app/shell/shell-contracts'

export interface ShellContextValue {
  mode: ShellMode
  isDesktop: boolean
  chrome: RouteChromeConfig
}

const defaultChrome: RouteChromeConfig = {
  section: 'decks',
  navKey: 'decks',
  eyebrow: 'Decks',
  title: 'Decks',
  description: 'Device-local flashcards, calm daily review, and one deck at a time.',
  paneLayout: 'split',
  surfaceTone: 'panel',
  showBottomNav: true,
}

const defaultShellContextValue: ShellContextValue = {
  mode: 'mobile',
  isDesktop: false,
  chrome: defaultChrome,
}

const ShellContext = createContext<ShellContextValue>(defaultShellContextValue)

export function ShellProvider({
  children,
  value,
}: {
  children: ReactNode
  value: ShellContextValue
}) {
  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>
}

export function useShellContext() {
  return useContext(ShellContext)
}
