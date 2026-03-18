import { render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppShell } from '@/app/shell/AppShell'

function mockMatchMedia(matches: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  )
}

function renderAppShell(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route index element={<div>Deck content</div>} />
          <Route path="reading" element={<div>Reading content</div>} />
          <Route path="statistics" element={<div>Statistics content</div>} />
          <Route path="settings" element={<div>Settings content</div>} />
          <Route
            path="decks/:deckId/study"
            element={<div>Study content</div>}
          />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('AppShell', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
  })

  it('renders a mobile top bar with bottom sections on narrow screens', () => {
    mockMatchMedia(false)

    renderAppShell('/')

    expect(screen.getByRole('heading', { name: 'Decks' })).toBeInTheDocument()
    expect(screen.getByText(/device-local flashcards/i)).toBeInTheDocument()

    const mobileSections = screen.getByRole('navigation', {
      name: 'Mobile sections',
    })

    expect(
      within(mobileSections).getByRole('link', { name: 'Decks' }),
    ).toHaveAttribute('aria-current', 'page')
    expect(
      within(mobileSections).getByRole('link', { name: 'Reading' }),
    ).toHaveAttribute('href', '/reading')
    expect(
      within(mobileSections).getByRole('link', { name: 'Statistics' }),
    ).toHaveAttribute('href', '/statistics')
    expect(
      within(mobileSections).getByRole('link', { name: 'Settings' }),
    ).toHaveAttribute('href', '/settings')
  })

  it('renders a desktop rail and workspace chrome on wide screens', () => {
    mockMatchMedia(true)

    renderAppShell('/reading')

    expect(
      screen.getByRole('heading', { name: 'Reading library' }),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/optional extras live in their own workspace/i),
    ).toBeInTheDocument()

    const desktopSections = screen.getByRole('navigation', {
      name: 'Desktop sections',
    })

    expect(
      within(desktopSections).getByRole('link', { name: 'Reading' }),
    ).toHaveAttribute('aria-current', 'page')
    expect(
      within(desktopSections).getByRole('link', { name: 'Decks' }),
    ).toHaveAttribute('href', '/')
    expect(
      within(desktopSections).getByRole('link', { name: 'Settings' }),
    ).toHaveAttribute('href', '/settings')
    expect(
      screen.queryByRole('navigation', { name: 'Mobile sections' }),
    ).not.toBeInTheDocument()
  })
})
