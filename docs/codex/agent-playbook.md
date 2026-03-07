# Ranki Codex Agent Playbook

This repository is configured for Codex multi-agent work.

## Files Added For Agent Setup

- `C:\Users\micha\.codex\config.toml`
  - Enables the global `multi_agent` feature flag.
- `.codex/config.toml`
  - Declares Ranki-specific agent roles.
- `.codex/agents/*.toml`
  - Role-specific config layers for sub-agents.
- `AGENTS.md`
  - Project-wide rules and product constraints.
- `docs/product/PRD-Offline-Flashcards-2026-03-07.md`
  - Full source PRD inside the repository.
- `docs/product/ranki-mvp-brief.md`
  - In-repo working summary of the source PRD.

## Before Using In Codex App

1. Open `C:\Ranki-PRO` in Codex App.
2. Make sure the project is trusted. Project-scoped `.codex/config.toml` is skipped for untrusted projects.
3. Start a new thread after config changes so Codex reloads the config and instruction chain.
4. Expect sub-agent work to appear mostly as one consolidated result in Codex App. The OpenAI docs note that detailed multi-agent visibility is still catching up outside the CLI.
5. If standard repo tooling is missing, Codex should bootstrap it first instead of planning around the missing toolchain.
6. For browser-level verification, prefer the repo-local Playwright Chromium smoke flow before trying MCP browser installation.

## Recommended Roles

- `prd_analyst`
- `task_planner`
- `scheduler_designer`
- `architect`
- `ux_mapper`
- `docs_researcher`
- `explorer`
- `worker`
- `shipper`
- `reviewer`
- `monitor`

## Suggested Prompt Patterns

### Product planning

```text
Read docs/product/PRD-Offline-Flashcards-2026-03-07.md first.
Then read docs/product/ranki-mvp-brief.md.
Spawn prd_analyst, task_planner, scheduler_designer, architect, and ux_mapper.
Wait for all of them, then produce:
1. MVP epic breakdown
2. Open product decisions
3. Technical risks
4. Recommended milestone order
5. The first vertical slice to implement
```

### Atomic backlog creation

```text
Read docs/product/PRD-Offline-Flashcards-2026-03-07.md, then docs/product/ranki-mvp-brief.md, then AGENTS.md.
Use task_planner to break the current goal into atomic, dependency-ordered, commit-sized implementation tasks.
Each task should include:
- title
- why it exists
- likely files to change
- acceptance criteria
- checks/tests
- whether it is safe to commit independently

Then recommend the single best next slice to execute now.
```

### Initial scaffold

```text
Read docs/product/PRD-Offline-Flashcards-2026-03-07.md, then docs/product/ranki-mvp-brief.md, then AGENTS.md.
Spawn architect for the file layout and docs_researcher for any PWA or Dexie constraints.
Then use worker to scaffold the MVP foundation with React, TypeScript, Vite, Tailwind, shadcn/ui, vite-plugin-pwa, and Dexie.
If common repo tooling such as Node.js, npm, npx, corepack, pnpm, or GitHub CLI is missing, bootstrap it first using trusted Windows package sources, verify the install, and only then continue.
If browser-level PWA verification is needed, install the local Playwright Chromium browser and run `pnpm smoke:pwa`.
Keep it local-only and offline-first.
```

### Scheduler design

```text
Use scheduler_designer to define the Ranki queue rules, state transitions, daily limits, and edge-case tests.
Then summarize the result as a spec that worker can implement.
```

### Implementation slice

```text
Use explorer to inspect the current codebase, then use worker to implement only the next atomic slice.
After that, use reviewer to check correctness and missing tests.
If the checks pass, use shipper to create a fresh codex/<slice-name> branch for that slice, or a suffixed variant if the base name already exists.
Do not reuse an older codex/* branch unless the prompt explicitly says to continue it.
Stage only the files from that slice, make one commit, and push that branch.
Let GitHub automation open or update the PR into main and enable auto-merge.
Do not start another slice until commit and push succeed.
```

### Full slice loop

```text
Read docs/product/PRD-Offline-Flashcards-2026-03-07.md, then docs/product/ranki-mvp-brief.md, then AGENTS.md.
Use task_planner to choose the next smallest valuable slice.
Use explorer only if codebase discovery is needed.
Use worker to implement exactly one slice.
If common repo tooling is missing, install or enable it first instead of treating it as a blocker.
Run the relevant checks.
Use reviewer for a focused review.
If the slice is good, use shipper to create or switch to a codex/<slice-name> branch, then commit and push only that slice there.
After push succeeds, stop and summarize:
- what was shipped
- commit hash
- branch name
- exact run commands
- recommended next slice
```

### Hardening

```text
Use reviewer to inspect offline behavior, data loss risks, and scheduler edge cases.
Use monitor to run the relevant test or dev-server verification loop.
Summarize concrete findings only.
```

## Practical Notes

- Use sub-agents mainly for parallel reading, analysis, planning, review, and test monitoring.
- Avoid asking multiple write-capable agents to edit the same feature area at the same time.
- There is no declarative workflow graph in `.codex/config.toml`; sequencing such as `worker -> shipper -> next slice` is enforced through role instructions and the parent prompt.
- Keep prompts narrow. Multi-agent works best when each role has one clear job.
- Keep the full PRD as the source of truth and the brief as the fast reference.
- Feature branches should follow the `codex/<slice-name>` pattern.
- If that branch name already exists, create a fresh suffixed variant rather than reusing an old branch.
- GitHub automation creates or updates PRs for `codex/*` branches and should move approved work into `main`.
- After merge, return the local checkout to `main` and fast-forward it before ending the slice.
- If the product brief changes, update `docs/product/ranki-mvp-brief.md` before relying on it.
- For real browser smoke on this repo, prefer `pnpm smoke:pwa` and inspect artifacts in `output/playwright/pwa-smoke/`.
