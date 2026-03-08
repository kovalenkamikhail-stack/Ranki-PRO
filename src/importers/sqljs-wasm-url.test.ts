import { describe, expect, it, vi } from 'vitest'

vi.mock('sql.js/dist/sql-wasm-browser.wasm?url', () => ({
  default: '/assets/sql-wasm-browser.wasm',
}))

describe('sqljs wasm url helper', () => {
  it('returns the emitted browser wasm asset for wasm loader requests', async () => {
    const { locateSqlJsFile } = await import('@/importers/sqljs-wasm-url')

    expect(locateSqlJsFile('sql-wasm-browser.wasm')).toBe(
      '/assets/sql-wasm-browser.wasm',
    )
  })

  it('leaves non-wasm companion files untouched', async () => {
    const { locateSqlJsFile } = await import('@/importers/sqljs-wasm-url')

    expect(locateSqlJsFile('sql-wasm.js.mem')).toBe('sql-wasm.js.mem')
  })
})
