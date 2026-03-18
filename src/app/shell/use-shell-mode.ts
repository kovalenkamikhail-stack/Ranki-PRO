import { useEffect, useState } from 'react'
import type { ShellMode } from '@/app/shell/shell-contracts'

export const DESKTOP_SHELL_MEDIA_QUERY = '(min-width: 1100px)'

function getShellMode(): ShellMode {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'mobile'
  }

  return window.matchMedia(DESKTOP_SHELL_MEDIA_QUERY).matches
    ? 'desktop'
    : 'mobile'
}

export function useShellMode() {
  const [mode, setMode] = useState<ShellMode>(() => getShellMode())

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined
    }

    const mediaQuery = window.matchMedia(DESKTOP_SHELL_MEDIA_QUERY)
    const handleChange = () => {
      setMode(mediaQuery.matches ? 'desktop' : 'mobile')
    }

    handleChange()

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange)

      return () => mediaQuery.removeEventListener('change', handleChange)
    }

    mediaQuery.addListener(handleChange)

    return () => mediaQuery.removeListener(handleChange)
  }, [])

  return mode
}
