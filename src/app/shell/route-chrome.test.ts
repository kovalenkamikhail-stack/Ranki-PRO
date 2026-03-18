import { describe, expect, it } from 'vitest'
import { getRouteChrome } from '@/app/shell/route-chrome'

describe('getRouteChrome', () => {
  it('maps the root decks route to the shared deck chrome', () => {
    expect(getRouteChrome('/')).toMatchObject({
      navKey: 'decks',
      title: 'Decks',
      showBottomNav: true,
      paneLayout: 'split',
    })
  })

  it('maps study routes to an immersive deck-scoped chrome', () => {
    expect(getRouteChrome('/decks/deck-1/study')).toMatchObject({
      navKey: 'decks',
      section: 'study',
      title: 'Study session',
      showBottomNav: false,
      paneLayout: 'focus',
    })
  })

  it('maps reading routes into the optional-extras workspace', () => {
    expect(getRouteChrome('/reading')).toMatchObject({
      navKey: 'reading',
      title: 'Reading library',
      paneLayout: 'split',
    })
  })
})
