import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PageScaffold } from '@/app/shell/PageScaffold'
import { ShellProvider } from '@/app/shell/ShellContext'
import type { RouteChromeConfig, ShellMode } from '@/app/shell/shell-contracts'

const chrome: RouteChromeConfig = {
  section: 'decks',
  navKey: 'decks',
  eyebrow: 'Decks',
  title: 'Decks',
  description: 'Device-local flashcards, calm daily review, and one deck at a time.',
  paneLayout: 'split',
  surfaceTone: 'panel',
  showBottomNav: true,
}

function renderScaffold(mode: ShellMode) {
  return render(
    <ShellProvider
      value={{
        mode,
        isDesktop: mode === 'desktop',
        chrome,
      }}
    >
      <PageScaffold
        header={<div>Header slot</div>}
        actions={<button type="button">Create</button>}
        list={<div>List slot</div>}
        detail={<div>Detail slot</div>}
        aside={<div>Aside slot</div>}
        layout="split"
      />
    </ShellProvider>,
  )
}

describe('PageScaffold', () => {
  it('stacks split content on mobile shells', () => {
    renderScaffold('mobile')

    expect(screen.getByTestId('page-scaffold')).toHaveAttribute(
      'data-shell-mode',
      'mobile',
    )
    expect(screen.getByTestId('page-scaffold-body')).toHaveAttribute(
      'data-pane-presentation',
      'stacked',
    )
    expect(screen.getByRole('region', { name: 'Page list' })).toHaveTextContent(
      'List slot',
    )
    expect(
      screen.getByRole('region', { name: 'Page detail' }),
    ).toHaveTextContent('Detail slot')
  })

  it('keeps split panes side by side on desktop shells', () => {
    renderScaffold('desktop')

    expect(screen.getByTestId('page-scaffold')).toHaveAttribute(
      'data-shell-mode',
      'desktop',
    )
    expect(screen.getByTestId('page-scaffold-body')).toHaveAttribute(
      'data-pane-presentation',
      'split',
    )
    expect(screen.getByRole('region', { name: 'Page aside' })).toHaveTextContent(
      'Aside slot',
    )
  })
})
