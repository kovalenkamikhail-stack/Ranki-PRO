# Ranki-PRO

Offline-first flashcards PWA for calm daily study in a desktop browser or iPhone home-screen install.

The product source of truth is still the in-repo PRD at `docs/product/PRD-Offline-Flashcards-2026-03-07.md`, but the repository is no longer just a shell scaffold. `origin/main` already contains working flashcard flows plus a few expanded local-only surfaces around reading, statistics, and import.

## Current Repo Scope

- Local-first React 19 + TypeScript + Vite app with Tailwind CSS v4, shadcn/ui, Dexie, and `vite-plugin-pwa`
- No backend, auth, accounts, or sync for core use
- IndexedDB schema now stores decks, cards, media assets/blobs, review logs, app settings, reading documents, books, and book chapters
- Core flashcard MVP behavior is implemented around deck-scoped study, not mixed multi-deck review

## Implemented App Surfaces

- `/`
  Decks home with deck list, create/edit/delete actions, local study summaries, and recent review activity
- `/decks/new`, `/decks/:deckId/edit`
  Create/edit deck flow with deck metadata, new-card order, and deck-level study-limit overrides
- `/decks/:deckId`
  Deck workspace with card list, optional back-image preview, delete actions, and deck study context
- `/decks/:deckId/cards/new`, `/decks/:deckId/cards/:cardId/edit`
  Card CRUD with required front/back text and one optional back image
- `/decks/:deckId/study`
  Due-first deck-scoped study session with persisted review logs and the documented four ratings:
  `hard` = 2 minutes, `again` = 10 minutes, `good` = next ladder step, `easy` = jump two steps
- `/settings`
  Global study limits, storage persistence status, PWA install/offline guidance, and local `.apkg` import

## Expanded Surfaces Already In Repo

These go beyond the narrow MVP shell and should not be mistaken for future-only plans:

- `/statistics`
  Local review-log statistics for today and the last 7 local days
- `/capture/card`
  Manual quick-capture URL handoff into the normal card-creation flow
- `/reading`, `/reading/:documentId`, `/reading/:documentId/edit`
  Pasted-text reading library, reader, resume position, and edit/delete flow
- `/reading/books`, `/reading/books/:bookId`
  Local EPUB import plus a text-first book reader with saved chapter/progress state

## Still Intentionally Missing

- Accounts, sync, or any backend dependency for core workflows
- Backup/export flows
- Audio playback or TTS
- Tags/search
- Mixed multi-deck study sessions
- Advanced reader/import parity such as annotations, highlights, PDF/MOBI/FB2, or Anki scheduling parity

## Local Development

Use Node.js LTS with Corepack-managed pnpm.

```bash
corepack pnpm install
corepack pnpm dev
```

## Quality Gate

```bash
corepack pnpm lint
corepack pnpm test
corepack pnpm build
```

Vitest coverage in the repo already includes scheduler logic, study queue/session behavior, Dexie persistence modules, major route pages, and importer helpers.

## Browser Smoke Helpers

Install Chromium for Playwright once:

```bash
corepack pnpm playwright:install
```

Primary repo smoke:

```bash
corepack pnpm smoke:pwa
```

This builds the app, launches a local preview, verifies the core deck/card/study flashcards flow plus offline PWA behavior, and writes artifacts to `output/playwright/pwa-smoke/`.

Additional repo helpers that exist today:

```bash
corepack pnpm build
corepack pnpm smoke:reading
corepack pnpm smoke:statistics
```

These scripts exercise the reading and statistics surfaces against a local preview and store artifacts under `output/playwright/reading-smoke/` and `output/playwright/statistics-smoke/`.

## Product Sources

- `docs/product/PRD-Offline-Flashcards-2026-03-07.md`
- `docs/product/ranki-mvp-brief.md`

## Codex Workflow

Project instructions and automation docs live in:

- `AGENTS.md`
- `docs/codex/agent-playbook.md`
- `docs/codex/github-automation.md`

Merged `codex/*` pull requests into `main` are expected to produce Telegram notifications for repository updates.
