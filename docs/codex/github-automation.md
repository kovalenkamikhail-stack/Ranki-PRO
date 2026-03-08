# Ranki-PRO GitHub Automation

This repository uses a branch-first workflow for product work.

## Intended Flow

1. Codex works on a local feature branch named `codex/<slice-name>`.
2. Codex commits and pushes that branch to `origin`.
3. GitHub Actions creates or updates a pull request from `codex/<slice-name>` into `main`.
4. GitHub Actions attempts to enable auto-merge on that PR.
5. GitHub merges into `main` after the required checks pass.

## Public Repository Safety

- Treat the remote repository as public by default.
- Only publish code, docs, and assets that are intentionally safe to expose.
- Never push secrets, credentials, `.env` data, browser exports, local databases, captured user content, or personal screenshots/logs.
- Keep orchestration and verification chat memory in `C:\Users\micha\.codex\handoffs\Ranki-PRO\chat-handoff.md`, not anywhere inside `C:\Ranki-PRO`.
- If a task needs private reference material, sanitize or summarize it first instead of committing the raw file.

## Workflows

- `.github/workflows/codex-auto-pr.yml`
  - creates or updates PRs for `codex/*` branches
  - attempts to enable auto-merge
- `.github/workflows/repository-checks.yml`
  - provides a lightweight required check for the repository baseline
- `.github/workflows/telegram-commits.yml`
  - sends Telegram notifications for pushes to `main`

## External Contribution Policy

- Auto-PR and auto-merge only apply to `codex/*` branches pushed to this repository by the owner workflow.
- PRs from forks or unknown branches are outside the automation path and must stay manual by default.
- If you want to reduce outside noise on a public repository, set `Features -> Pull requests` to `Collaborators only` or disable pull requests entirely in the GitHub repository settings.
- Consider disabling Issues or Discussions as well if you do not want unsolicited public input.

## Required GitHub Repository Settings

These settings must be enabled in the GitHub UI.

### 1. Workflow permissions

Path:
- `Settings -> Actions -> General -> Workflow permissions`

Set:
- `Read and write permissions`
- enable `Allow GitHub Actions to create and approve pull requests`

### 2. Allow auto-merge

Path:
- `Settings -> General -> Pull Requests`

Enable:
- `Allow auto-merge`

### 3. Protect main

Path:
- `Settings -> Branches -> Add branch protection rule`

Recommended rule for `main`:
- require a pull request before merging
- require status checks to pass before merging
- include the check `Repository Checks / repo-checks`
- optionally require branches to be up to date before merging
- optionally disallow direct pushes to `main`

### 4. Optional cleanup

Path:
- `Settings -> General -> Pull Requests`

Optional:
- enable automatic deletion of head branches after merge

## Notes

- Auto-merge can only complete if the repository setting is enabled.
- If GitHub Actions cannot create PRs, the usual cause is missing workflow permissions in repository settings.
- If auto-merge is not enabled by the workflow, check repository settings first, then review the workflow logs.
- If the ruleset UI does not list checks, use classic branch protection or the GitHub API instead of relying on the empty picker.
