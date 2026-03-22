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

## Repository Safety

- Treat `origin` as an internet-facing repository. Only commit code, docs, and assets that are intentionally safe to publish.
- Never commit or push secrets, API keys, tokens, SSH keys, cookies, credentials, local `.env` data, browser exports, or machine-specific auth material.
- Never commit local databases, caches, captured user content, personal screenshots, or logs that may contain private data, prompts, or identifiers.
- Keep orchestration or verification chat handoff notes outside the repository at `C:\Users\micha\.codex\handoffs\Ranki-PRO\chat-handoff.md`.
- If that local handoff needs to be updated, edit it there in place instead of recreating `docs/codex/chat-handoff.md` or any other private memory file under the repo.
- Never copy raw files from `Downloads`, `Desktop`, or local app storage into the repository unless they were explicitly sanitized for publication.
- Before every commit and push, inspect the staged diff for sensitive strings, personal data, internal-only notes, or accidental file additions.
- If there is any doubt about whether material is safe for a public remote, stop and report the risk instead of pushing.

## Tool Bootstrap Policy

- Missing standard development tooling is not a blocker by default.
- If a task requires common repo tooling and it is missing, first attempt to install or enable it, then verify the install, then continue the task.
- For this repository on Windows, treat the following as bootstrap-eligible tools:
  - `GitHub CLI`
  - `Node.js LTS`
  - `npm` / `npx`
  - `corepack`
  - `pnpm` when the repo or task needs it
- Prefer trusted package sources and built-in toolchain activation:
  - `winget` for `GitHub.cli` and `OpenJS.NodeJS.LTS`
  - `corepack enable` and `corepack prepare pnpm@latest --activate` when `pnpm` is needed after Node is installed
- After bootstrap, verify tool availability with version commands before continuing.
- Only treat missing tooling as a blocker after bootstrap fails or requires a manual step that cannot be completed automatically.
- Do not install heavy or unrelated system dependencies such as Docker Desktop, database servers, Android SDKs, or browser stacks unless the parent task explicitly requires them.
- For browser or PWA verification in this repository, prefer the local Playwright Chromium flow:
  - `pnpm playwright:install`
  - `pnpm smoke:pwa`
- Treat MCP browser automation as optional for interactive debugging, not as the only path for browser-level verification.

## Atomic Slice Workflow

- When asked to plan work, first break it into commit-sized tasks before implementation starts.
- One implementation slice should usually be completable in one focused pass and safe to commit independently.
- Do not work on multiple implementation slices in parallel.
- Preferred loop: `task_planner` -> `worker` -> `reviewer` -> `shipper` -> `monitor`.
- Default completion rule for a code-change slice is:
  - make the change locally
  - run the relevant checks and review
  - commit it on a `codex/*` branch
  - push that branch to `origin` on GitHub
  - wait for the PR path to land in `origin/main`
  - sync the local `main` checkout back to `origin/main`
- Do not treat local edits or a local commit as completion by themselves.
- Do not stop after pushing the feature branch; the slice remains open until the local `main` checkout has been reconciled after merge.
- After a slice is implemented, run the relevant checks, review it, create or switch to a `codex/<slice-name>` branch, stage only that slice, commit it, push the branch, and only then move to the next slice.
- `shipper` is responsible only for branch/commit/push.
- `monitor` or the parent agent is responsible for waiting on PR creation, status checks, auto-merge, merge completion, and returning the local checkout to `main`.
- A slice is not fully closed after merge until the local checkout has been reconciled too:
  - switch to `main`
  - `git fetch origin`
  - fast-forward local `main` to `origin/main`
  - verify `git status --short --branch`
  - verify recent first-parent `main` history
- If local changes block that post-merge sync, stop and report the exact blocker instead of silently continuing on a stale checkout.
- If commit or push fails, stop and report the blocker instead of starting the next slice.
- Because this repository may have unrelated changes, never use broad staging commands that can capture the whole worktree by accident.

## Git Branch Policy

- Product and feature work must not be pushed directly to `main`.
- If the current branch is `main` or a detached HEAD, create a fresh feature branch using the `codex/<slice-name>` pattern before committing.
- Never reuse an existing `codex/*` branch for a new slice unless the parent explicitly says to continue that exact branch.
- Once a `codex/*` branch has already been merged into `main`, treat it as closed forever. Any follow-up fix must start on a new branch, even if the fix is tiny.
- If the preferred `codex/<slice-name>` branch already exists locally or on `origin`, create a new unique branch by appending a short suffix instead of reusing the old branch.
- Before pushing, compare the branch against `origin/main`; if files outside the current slice appear in the diff, stop and fix the branch hygiene before shipping.
- Push feature branches to `origin`; GitHub automation will create or update the PR into `main`.
- Synchronize the local `main` checkout only after the feature branch has landed in `origin/main`; do not treat a pushed but unmerged feature branch as a reason to rewrite local `main`.
- `main` should move through GitHub PR auto-merge after checks, not through direct feature pushes.
- Direct pushes to `main` are reserved for repository administration tasks only and require explicit parent instruction.
- After a feature PR merges, the parent or `monitor` should return the local checkout to `main` and fast-forward it to `origin/main`.
- Do not treat “merged on GitHub” as sufficient closure by itself; post-merge local sync is part of the expected workflow.

## External PR Policy

- Automation and agents must only create or operate on PRs sourced from local `codex/*` branches in this repository.
- Do not approve, merge, or auto-merge PRs from forks, unknown contributors, or non-`codex/*` branches unless the parent explicitly asks for a manual review flow.
- If external PRs or unsolicited changes appear, leave them untouched and report them to the repository owner.
