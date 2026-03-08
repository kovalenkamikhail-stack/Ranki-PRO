import 'fake-indexeddb/auto'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { afterAll, afterEach, beforeAll, vi } from 'vitest'

const originalCreateObjectURL = URL.createObjectURL
const originalRevokeObjectURL = URL.revokeObjectURL
const createObjectUrlMock = vi.fn(() => `blob:test-${crypto.randomUUID()}`)
const revokeObjectUrlMock = vi.fn()

beforeAll(() => {
  URL.createObjectURL = createObjectUrlMock
  URL.revokeObjectURL = revokeObjectUrlMock
})

afterEach(() => {
  cleanup()
  createObjectUrlMock.mockClear()
  revokeObjectUrlMock.mockClear()
})

afterAll(() => {
  URL.createObjectURL = originalCreateObjectURL
  URL.revokeObjectURL = originalRevokeObjectURL
})
