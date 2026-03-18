import {
  BookOpenText,
  BookText,
  Cog,
  LibraryBig,
  type LucideIcon,
  SquareChartGantt,
} from 'lucide-react'
import { matchPath } from 'react-router-dom'
import type {
  NavItem,
  RouteChromeConfig,
  ShellNavKey,
} from '@/app/shell/shell-contracts'

export interface RouteChromeMatcher {
  path: string
  config: RouteChromeConfig
}

export const shellNavItems: NavItem[] = [
  {
    key: 'decks',
    label: 'Decks',
    to: '/',
    icon: LibraryBig,
    kind: 'primary',
  },
  {
    key: 'reading',
    label: 'Reading',
    to: '/reading',
    icon: BookText,
    kind: 'extra',
  },
  {
    key: 'statistics',
    label: 'Statistics',
    to: '/statistics',
    icon: SquareChartGantt,
    kind: 'extra',
  },
  {
    key: 'settings',
    label: 'Settings',
    to: '/settings',
    icon: Cog,
    kind: 'primary',
  },
]

function createChrome(
  overrides: Partial<RouteChromeConfig> & Pick<RouteChromeConfig, 'navKey' | 'title'>,
): RouteChromeConfig {
  return {
    section: overrides.navKey,
    eyebrow: shellNavItems.find((item) => item.key === overrides.navKey)?.label ?? 'Ranki',
    description: 'Device-local flashcards, calm daily review, and one deck at a time.',
    paneLayout: 'split',
    surfaceTone: 'panel',
    showBottomNav: true,
    ...overrides,
  }
}

const routeChromeMatchers: RouteChromeMatcher[] = [
  {
    path: '/decks/:deckId/study',
    config: createChrome({
      navKey: 'decks',
      section: 'study',
      eyebrow: 'Study',
      title: 'Study session',
      description:
        'Review one deck at a time with a focused answer reveal and rating flow.',
      paneLayout: 'focus',
      surfaceTone: 'accent',
      showBottomNav: false,
    }),
  },
  {
    path: '/capture/card',
    config: createChrome({
      navKey: 'decks',
      section: 'capture',
      eyebrow: 'Capture',
      title: 'Quick capture',
      description:
        'Turn a captured prompt into a local card draft without leaving the deck-first flow.',
      paneLayout: 'detail',
      showBottomNav: false,
    }),
  },
  {
    path: '/decks/:deckId/cards/new',
    config: createChrome({
      navKey: 'decks',
      section: 'editor',
      eyebrow: 'Cards',
      title: 'Card editor',
      description:
        'Create a local card with front and back text plus one optional back image.',
      paneLayout: 'detail',
      showBottomNav: false,
    }),
  },
  {
    path: '/decks/:deckId/cards/:cardId/edit',
    config: createChrome({
      navKey: 'decks',
      section: 'editor',
      eyebrow: 'Cards',
      title: 'Card editor',
      description:
        'Update saved card copy and the optional back image without leaving the selected deck.',
      paneLayout: 'detail',
      showBottomNav: false,
    }),
  },
  {
    path: '/decks/new',
    config: createChrome({
      navKey: 'decks',
      section: 'editor',
      eyebrow: 'Decks',
      title: 'Deck editor',
      description:
        'Create a new deck, choose the saved new-card order, and keep limits explicit from day one.',
      paneLayout: 'detail',
      showBottomNav: false,
    }),
  },
  {
    path: '/decks/:deckId/edit',
    config: createChrome({
      navKey: 'decks',
      section: 'editor',
      eyebrow: 'Decks',
      title: 'Deck editor',
      description:
        'Update deck details and local study-limit behavior without touching cards or review history.',
      paneLayout: 'detail',
      showBottomNav: false,
    }),
  },
  {
    path: '/decks/:deckId',
    config: createChrome({
      navKey: 'decks',
      title: 'Deck workspace',
      description:
        'Open one deck, inspect its cards, and jump into the next focused study session.',
      paneLayout: 'split',
    }),
  },
  {
    path: '/reading/books/:bookId',
    config: createChrome({
      navKey: 'reading',
      section: 'reader',
      eyebrow: 'Books',
      title: 'Book reader',
      description:
        'Continue a locally imported book in a calmer reading workspace with saved progress.',
      paneLayout: 'focus',
      showBottomNav: false,
    }),
  },
  {
    path: '/reading/books',
    config: createChrome({
      navKey: 'reading',
      section: 'books',
      eyebrow: 'Books',
      title: 'Book library',
      description:
        'Import EPUB, FB2, and MOBI files into a separate local library that stays beside the core deck workflow.',
      paneLayout: 'split',
    }),
  },
  {
    path: '/reading/:documentId/edit',
    config: createChrome({
      navKey: 'reading',
      section: 'editor',
      eyebrow: 'Reading',
      title: 'Reading editor',
      description:
        'Refine a saved reading note without changing its separate, local-only library model.',
      paneLayout: 'detail',
      showBottomNav: false,
    }),
  },
  {
    path: '/reading/:documentId',
    config: createChrome({
      navKey: 'reading',
      section: 'reader',
      eyebrow: 'Reading',
      title: 'Reading reader',
      description:
        'Resume a saved reading note from the last local position with minimal chrome.',
      paneLayout: 'focus',
      showBottomNav: false,
    }),
  },
  {
    path: '/reading',
    config: createChrome({
      navKey: 'reading',
      title: 'Reading library',
      description:
        'Optional extras live in their own workspace while decks and study stay primary.',
      paneLayout: 'split',
    }),
  },
  {
    path: '/statistics',
    config: createChrome({
      navKey: 'statistics',
      title: 'Statistics',
      description:
        'Optional extras live in their own workspace while deck review remains the core loop.',
      paneLayout: 'split',
    }),
  },
  {
    path: '/settings',
    config: createChrome({
      navKey: 'settings',
      title: 'Settings',
      description:
        'Adjust device-local study defaults, storage expectations, and import helpers without leaving the app shell.',
      paneLayout: 'detail',
    }),
  },
]

const defaultChrome = createChrome({
  navKey: 'decks',
  title: 'Decks',
  description: 'Device-local flashcards, calm daily review, and one deck at a time.',
  paneLayout: 'split',
})

export function getRouteChrome(pathname: string): RouteChromeConfig {
  return (
    routeChromeMatchers.find((routeMatcher) =>
      matchPath(routeMatcher.path, pathname),
    )?.config ?? defaultChrome
  )
}

export function getShellNavItemIcon(navKey: ShellNavKey): LucideIcon {
  return (
    shellNavItems.find((navItem) => navItem.key === navKey)?.icon ?? BookOpenText
  )
}
