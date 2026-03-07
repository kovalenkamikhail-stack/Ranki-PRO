import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from '@/app/router'
import { bootstrapAppDb } from '@/db/bootstrap'
import { registerPWA } from '@/lib/pwa'
import { ensureStoragePersistence } from '@/lib/storage-persistence'
import '@/styles/globals.css'

void bootstrapAppDb().catch((error: unknown) => {
  console.error('Failed to bootstrap Ranki local database.', error)
})

void ensureStoragePersistence().catch((error: unknown) => {
  console.error('Failed to request persistent storage.', error)
})

registerPWA()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
