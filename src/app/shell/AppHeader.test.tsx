import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AppHeader } from '@/app/shell/AppHeader'

function renderAppHeader() {
  return render(
    <MemoryRouter>
      <AppHeader />
    </MemoryRouter>,
  )
}

describe('AppHeader', () => {
  it('keeps deck-first routes primary while grouping extras separately', () => {
    renderAppHeader()

    expect(
      screen.getByText(
        'Deck-first flashcards for calm daily review that stay with you offline.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText(/Reading tools and statistics remain available as extras/i),
    ).toBeInTheDocument()

    const primaryNavigation = screen.getByRole('navigation', {
      name: 'Primary navigation',
    })
    const extrasNavigation = screen.getByRole('navigation', {
      name: 'Extras navigation',
    })

    expect(
      within(primaryNavigation).getByRole('link', { name: 'Decks' }),
    ).toHaveAttribute('href', '/')
    expect(
      within(primaryNavigation).getByRole('link', { name: 'Settings' }),
    ).toHaveAttribute('href', '/settings')
    expect(
      within(extrasNavigation).getByRole('link', { name: 'Reading' }),
    ).toHaveAttribute('href', '/reading')
    expect(
      within(extrasNavigation).getByRole('link', { name: 'Statistics' }),
    ).toHaveAttribute('href', '/statistics')
    expect(screen.getByText('Extras')).toBeInTheDocument()
  })
})
