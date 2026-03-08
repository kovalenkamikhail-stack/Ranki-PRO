import { createBrowserRouter } from 'react-router-dom'
import { ShellErrorBoundary } from '@/app/shell/ShellErrorBoundary'
import { AppShell } from '@/app/shell/AppShell'
import { EditCardPage } from '@/pages/cards/EditCardPage'
import { DeckDetailsPage } from '@/pages/decks/DeckDetailsPage'
import { EditDeckPage } from '@/pages/decks/EditDeckPage'
import { HomePage } from '@/pages/decks/HomePage'
import { ReadingDocumentPage } from '@/pages/reading/ReadingDocumentPage'
import { ReadingLibraryPage } from '@/pages/reading/ReadingLibraryPage'
import { NotFoundPage } from '@/pages/shared/NotFoundPage'
import { SettingsPage } from '@/pages/settings/SettingsPage'
import { StatisticsPage } from '@/pages/statistics/StatisticsPage'
import { StudySessionPage } from '@/pages/study/StudySessionPage'

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    errorElement: <ShellErrorBoundary />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'decks/new',
        element: <EditDeckPage mode="create" />,
      },
      {
        path: 'decks/:deckId',
        element: <DeckDetailsPage />,
      },
      {
        path: 'decks/:deckId/edit',
        element: <EditDeckPage mode="edit" />,
      },
      {
        path: 'decks/:deckId/cards/new',
        element: <EditCardPage mode="create" />,
      },
      {
        path: 'decks/:deckId/cards/:cardId/edit',
        element: <EditCardPage mode="edit" />,
      },
      {
        path: 'decks/:deckId/study',
        element: <StudySessionPage />,
      },
      {
        path: 'settings',
        element: <SettingsPage />,
      },
      {
        path: 'reading',
        element: <ReadingLibraryPage />,
      },
      {
        path: 'reading/:documentId',
        element: <ReadingDocumentPage />,
      },
      {
        path: 'statistics',
        element: <StatisticsPage />,
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
])
