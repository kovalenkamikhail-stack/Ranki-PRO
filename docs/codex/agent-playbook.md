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
- `docs/product/ranki-mvp-brief.md`
  - In-repo summary of the source PRD.

## Before Using In Codex App

1. Open `C:\Ranki-PRO` in Codex App.
2. Make sure the project is trusted. Project-scoped `.codex/config.toml` is skipped for untrusted projects.
3. Start a new thread after config changes so Codex reloads the config and instruction chain.
4. Expect sub-agent work to appear mostly as one consolidated result in Codex App. The OpenAI docs note that detailed multi-agent visibility is still catching up outside the CLI.

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
Read docs/product/ranki-mvp-brief.md.
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
Read docs/product/ranki-mvp-brief.md and AGENTS.md.
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
Read docs/product/ranki-mvp-brief.md and AGENTS.md.
Spawn architect for the file layout and docs_researcher for any PWA or Dexie constraints.
Then use worker to scaffold the MVP foundation with React, TypeScript, Vite, Tailwind, shadcn/ui, vite-plugin-pwa, and Dexie.
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
If the checks pass, use shipper to stage only the files from that slice, make one commit, and push the current branch.
Do not start another slice until commit and push succeed.
```

### Full slice loop

```text
Read docs/product/ranki-mvp-brief.md and AGENTS.md.
Use task_planner to choose the next smallest valuable slice.
Use explorer only if codebase discovery is needed.
Use worker to implement exactly one slice.
Run the relevant checks.
Use reviewer for a focused review.
If the slice is good, use shipper to commit and push only that slice.
After push succeeds, stop and summarize:
- what was shipped
- commit hash
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
- If the product brief changes, update `docs/product/ranki-mvp-brief.md` before relying on it.
