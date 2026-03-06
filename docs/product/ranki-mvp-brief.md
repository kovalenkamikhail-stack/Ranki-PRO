# Ranki MVP Brief

Source PRD: `C:\Users\micha\Downloads\PRD-Offline-Flashcards-2026-03-07.md`  
Derived on: 2026-03-07

## Vision

Build a modern, pleasant, offline-first flashcards app for desktop browser and iPhone PWA use. The experience should preserve the daily-review value of Anki-like tools without inheriting their dated UX.

## MVP Goals

- Create and manage decks.
- Create, edit, and delete cards manually.
- Review cards with a simple spaced repetition model.
- Use the app offline on desktop and iPhone.
- Persist study progress locally with high user trust.

## Explicit Non-Goals

- Sync between devices
- User accounts or authentication
- Import from Anki
- Yomitan or browser integrations
- Analytics and statistics dashboards
- Tags and search
- Backup, export, or import
- Audio or TTS
- Bulk card creation
- Mixed multi-deck review
- Native desktop wrapper

## Core UX Principles

- Deck-first navigation
- Minimal friction
- Clear hierarchy and spacious UI
- Modern visual language
- Mobile-first touch targets
- Low cognitive load
- Visible offline trust

## Required MVP Screens

- Home / Decks
- Deck Details
- Study Session
- Add Card
- Edit Card
- Settings
- Create Deck / Edit Deck

## Study Rules

- Review is per deck.
- Queue is due-first.
- One card is shown at a time.
- The card front is shown first, followed by manual reveal.
- Ratings:
  - `hard` -> 2 minutes
  - `again` -> 10 minutes
  - `good` -> next long-term ladder step
  - `easy` -> jump two long-term ladder steps
- If a card becomes due again during the same session, it may reappear.

## Daily Limit Rules

- Global new cards per day
- Global max reviews per day
- Per-deck override toggle
- Per-deck new cards per day override
- Per-deck max reviews per day override
- New card order defaults to `oldest_first`

## Conceptual Data Model

### Deck

- `id`
- `name`
- `description`
- `useGlobalLimits`
- `newCardsPerDayOverride`
- `maxReviewsPerDayOverride`
- `newCardOrder`
- `createdAt`
- `updatedAt`

### Card

- `id`
- `deckId`
- `frontText`
- `backText`
- `backImageAssetId`
- `state`
- `ladderStepIndex`
- `dueAt`
- `lastReviewedAt`
- `createdAt`
- `updatedAt`

### MediaAsset

- `id`
- `cardId`
- `kind`
- `mimeType`
- `fileName`
- `sizeBytes`
- `blobRef`
- `width`
- `height`
- `createdAt`

### ReviewLog

- `id`
- `cardId`
- `deckId`
- `rating`
- `previousState`
- `newState`
- `previousLadderStepIndex`
- `newLadderStepIndex`
- `reviewedAt`
- `previousDueAt`
- `newDueAt`

### AppSettings

- `id`
- `globalNewCardsPerDay`
- `globalMaxReviewsPerDay`
- `createdAt`
- `updatedAt`

## Recommended MVP Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- Lucide
- `vite-plugin-pwa`
- IndexedDB via Dexie
- React Hook Form
- Zod when useful
- Static hosting only for MVP

## Important Technical Constraints

- Local-only and offline-first
- No backend needed for core flows
- Keep the data model sync-friendly for future post-MVP work
- Use stable UUIDs from day one
- Keep review history separate from card content
- Compress or constrain image uploads
- Verify iPhone PWA install and reopen behavior
- Keep scheduler deterministic and easy to test

## Milestone Order

1. Product setup and design direction
2. Foundation: shell, PWA, local DB, deck CRUD, card CRUD, image upload
3. Study engine: queue, reveal, 4 ratings, scheduling, due-first behavior
4. Settings and polish: limits, counters, validation, empty states, responsiveness
5. Hardening for personal daily use

## Use This Brief For

- Feature slicing
- Architecture decisions
- UX planning
- Scheduler design
- Review of scope creep

If the source PRD changes, update this summary before asking Codex to plan major work from it.
