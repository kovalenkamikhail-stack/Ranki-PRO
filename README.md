# Ranki-PRO

Offline-first flashcards foundation for the next-generation Ranki MVP.

## Current Status

The repository now contains the first production-worthy application slice:

- React 19 + TypeScript + Vite
- Tailwind CSS v4
- shadcn/ui base setup
- `vite-plugin-pwa` manifest + service worker wiring
- Dexie schema/bootstrap for MVP entities
- mobile-first app shell with route placeholders for all required MVP screens

Deck CRUD, card CRUD, scheduling, review flow, and settings editing are intentionally deferred to later atomic slices.

## Run Locally

```bash
pnpm install
pnpm dev
```

## Checks

```bash
pnpm lint
pnpm test
pnpm build
```

## Product Sources

- `docs/product/PRD-Offline-Flashcards-2026-03-07.md`
- `docs/product/ranki-mvp-brief.md`

## Codex Workflow

Project instructions and multi-agent prompts live in:

- `AGENTS.md`
- `docs/codex/agent-playbook.md`
- `docs/codex/github-automation.md`
