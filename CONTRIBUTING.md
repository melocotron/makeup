# Contributing

## Git workflow

This project uses **Gitflow** with **Conventional Commits**. Read
[`AGENTS.md`](./AGENTS.md) for the full agent-oriented version of these
rules.

### TL;DR for humans

1. **Never** commit directly to `main` or `develop`.
2. Create a feature branch from `develop`: `git switch -c feature/<scope>/<kebab>`.
3. Commit with Conventional Commits format: `feat(admin): short description`.
4. Open a merge back to `develop` (locally: `git merge --no-ff feature/...`).
5. Releases merge `develop` → `main` with a tag.

### Conventional Commits cheatsheet

```
feat:     new feature
fix:      bug fix
chore:    tooling, deps, housekeeping (no production code change)
docs:     documentation only
perf:     performance improvement
refactor: code change that neither fixes a bug nor adds a feature
test:     adding or fixing tests
build:    build system or external dependencies
ci:       CI configuration
revert:   revert a previous commit
style:    formatting, missing semicolons, etc. (no code change)
```

Subject: imperative, lowercase, no period, ≤72 chars.

Example:

```
feat(admin): clients CRUD with history view

Adds a list, create, edit, delete and detail-with-history flow for the
Client model. The detail view shows all appointments, total spent and
loyalty points (still WIP, no UI for loyalty yet).

Areas: src/app/[locale]/(admin)/admin/clients/, src/server/clients/,
src/components/admin/client-*.

Verified: tsc --noEmit clean, manual e2e through Playwright.
```

## OpenSpec changes

Big features start with a change proposal under
`openspec/changes/<kebab-name>/`:

- `proposal.md` — why, what, impact, out of scope, verification
- `tasks.md` — checklist of work items

When the change is done, archive it with the CLI:

```bash
openspec archive <change-name> --yes --skip-specs
```

The CLI moves the folder under `openspec/changes/archive/<date>-<name>/`
and renames the branch ref to track the work.

## Questions?

Open a GitHub issue or ask in the team channel. For AI agent
guidance, see `AGENTS.md`.
