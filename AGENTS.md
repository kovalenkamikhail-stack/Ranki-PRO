# Ranki Project Instructions

## Product

- Ranki is an offline-first flashcards PWA for desktop browser and iPhone PWA use.
- The product should feel calmer, cleaner, and more modern than classic Anki-like tools while preserving fast daily review workflows.
- The full in-repo source PRD lives at `docs/product/PRD-Offline-Flashcards-2026-03-07.md`.
- The in-repo product brief lives at `docs/product/ranki-mvp-brief.md`.
- Use the full PRD as the source of truth and the brief as a working summary.
- If a task conflicts with the brief, the full PRD wins unless the parent prompt explicitly overrides it.

## MVP Boundaries

- Local-only and offline-first. No accounts, sync, or backend dependency for core flows.
- Required MVP screens: Home/Decks, Deck Details, Study Session, Add Card, Edit Card, Settings, and Create/Edit Deck.
- Required MVP entities: Deck, Card, MediaAsset, ReviewLog, and AppSettings.
- One optional image on the card back is allowed in MVP.
- Review is deck-scoped. Do not introduce mixed multi-deck review in MVP.

## Out Of Scope

- Device sync
- Authentication
- Anki import
- Yomitan or browser capture integrations
- Analytics dashboards
- Tags and search
- Backup, export, or import
- Audio playback or TTS
- Bulk card creation
- Desktop native wrapper

## Preferred Stack

- React
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui
- `vite-plugin-pwa`
- IndexedDB via Dexie
- React Hook Form for forms
- Zod where validation schemas help

Avoid introducing Next.js, server rendering, or backend services in MVP unless the parent task explicitly asks for a post-MVP path.

## Architecture Rules

- Preserve an offline-first architecture and treat local persistence as a first-class feature.
- Use stable UUIDs from day one for sync readiness.
- Keep content entities, settings, and review events clearly separated.
- Keep scheduling deterministic, explicit, and easy to test.
- Preserve `createdAt` and `updatedAt` style timestamps where domain records need future sync compatibility.
- Prefer append-only review history over destructive mutation of study history.

## Study Engine Rules

- Use due-first review ordering within a selected deck.
- The four rating actions are fixed for MVP:
  - `hard` -> 2 minutes
  - `again` -> 10 minutes
  - `good` -> next long-term ladder step
  - `easy` -> jump two long-term ladder steps
- Card states are `new`, `learning`, and `review`.
- If a card becomes due again during the same session, it may reappear in that session.
- Respect global daily limits and per-deck overrides.
- Do not add hidden scheduler magic that is not documented.

## UX Direction

- Mobile-first touch targets and responsive layout are required.
- The interface should feel modern, calm, spacious, and high-contrast.
- Favor cards, panels, clear typography, and obvious primary actions over dense tables.
- Destructive actions need confirmation.
- Empty and loading states should feel intentional, not placeholder-like.

## Working Style

- Start from the smallest coherent vertical slice.
- Keep changes scoped to the requested milestone or feature slice.
- Prefer boring, explicit solutions over clever abstractions.
- Write tests for scheduler logic and other correctness-critical behavior.
- When the repository is still being scaffolded, preserve the chosen stack and directory layout instead of experimenting with multiple frameworks.

## Atomic Slice Workflow

- When asked to plan work, first break it into commit-sized tasks before implementation starts.
- One implementation slice should usually be completable in one focused pass and safe to commit independently.
- Do not work on multiple implementation slices in parallel.
- Preferred loop: `task_planner` -> `worker` -> `reviewer` -> `shipper`.
- After a slice is implemented, run the relevant checks, review it, stage only that slice, commit it, push it, and only then move to the next slice.
- If commit or push fails, stop and report the blocker instead of starting the next slice.
- Because this repository may have unrelated changes, never use broad staging commands that can capture the whole worktree by accident.
- Do not open a pull request unless the parent prompt explicitly asks for it.
