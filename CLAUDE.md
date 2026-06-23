# CLAUDE.md

Project instructions for Claude Code working in this repository.

## What This Project Is

`@silverassist/agents-toolkit` is a **Node.js ESM CLI package** that installs reusable AI
agent content (instructions, prompts, skills, hooks) into a user's project for **GitHub
Copilot, Claude Code, and Codex**. It is a distribution/installer tool — not an application.

> ⚠️ This repo is the *source* of the toolkit. Do **not** run `install` inside this repo
> — it would overwrite the developer workflow files in `.github/prompts/`, `.claude/commands/`,
> `.github/skills/`, and `.claude/skills/` with the generic end-user templates. The CLI uses
> the current working directory as the target, ignoring positional arguments.

## Architecture

| Path | Purpose |
|------|---------|
| `bin/cli.js` | The CLI. All install logic: arg parsing, filtering, copy/symlink, target installers (`install`, `installClaude`, `installCodex`, `installGitBasedTarget`). |
| `src/index.js` | Package metadata exports (`VERSION`, `PROMPTS`, `INSTRUCTIONS`, `SKILLS`, `HOOKS`, `SKILLS_LAYOUT`, `CLAUDE_*`). |
| `src/cli.test.js` | Tests using the native Node test runner (`node --test`). Spawn the CLI against temp dirs and assert on output/filesystem. |
| `templates/shared/` | Single source of truth for content: `instructions/`, `prompts/` (+ `_partials/`), `skills/` (folders with `SKILL.md`), `hooks/`. |
| `templates/agents/` | Agent root files: `AGENTS.md`, `AGENTS.codex.md`, `CLAUDE.md`, `copilot-instructions.md`. |
| `.agents/skills/` | Canonical dev skills store — 4 skills adapted for this Node.js ESM CLI: `domain-driven-design` (project layout), `quality-checks`, `release-management`, `testing-patterns`. |
| `.github/prompts/` | Dev workflow prompts for Copilot/Codex — real files (not symlinks), tailored for this repo. |
| `.github/skills/` | Symlinks → `.agents/skills/` for Copilot/Codex skill resolution. |
| `.claude/commands/` | Dev workflow commands for Claude Code — real files matching `.github/prompts/`. |
| `.claude/skills/` | Symlinks → `.agents/skills/` for Claude Code skill resolution. |
| `.github/copilot-instructions.md` | Repo-wide Copilot code review checklist (template/export sync, test portability, ESM conventions). |
### Install targets (where content lands in the end-user project)

- **Copilot/Codex** → `.github/{prompts,instructions,skills,hooks}` + root `AGENTS.md`.
- **Claude Code** → `.claude/commands/` (prompts, renamed `.prompt.md`→`.md`, frontmatter stripped, paths adapted), `.claude/skills/`, `.github/instructions/`, root `CLAUDE.md`.
- **Skills** follow the [`npx skills`](https://github.com/vercel-labs/skills) standard: real files live once in canonical `.agents/skills/`; each agent's `skills/` dir holds per-skill symlinks to it (with `--copy` / auto-fallback to copies when symlinks are unsupported).

### Filtering

`FILE_CATEGORIES` + `shouldIncludeFile()` in `bin/cli.js` filter content by `--stack`
(`react`/`wordpress`/`all`) and `--tracker` (`jira`/`github`/`all`). Resolution order:
CLI flags → project `.agents-toolkit.json` → global `~/.agents-toolkit.json` → defaults.

## Conventions

- **ESM only** (`"type": "module"`); Node ≥ 18. Use `import`, `fileURLToPath` for `__dirname`.
- **File naming**: kebab-case. Templates use `.instructions.md`, `.prompt.md`, `SKILL.md`.
- **JSDoc** on functions in `bin/cli.js`, written in English.
- Reuse existing helpers (`copyDir`, `getTargetDir`, `getClaudeTargetDir`, `getAgentsSkillsDir`, `info/warn/success/error`) instead of adding new ones.
- Keep installers honoring `force`, `dryRun`, and `global` consistently.

## Workflow

When adding a feature or fixing a bug:

1. **Make the change** in `bin/cli.js` / `templates/` / `src/`.
2. **Add or update tests** in `src/cli.test.js` (spawn CLI against a temp dir, assert filesystem + output).
3. **Run the suite**: `npm test` — must stay green.
4. **Update docs**: `README.md`, the relevant `templates/shared/*/README.md`, and `CHANGELOG.md`.
5. **Bump version** in both `package.json` and `src/index.js` (`VERSION`) following SemVer.

## Commands

```bash
npm test                          # Run the full test suite (node --test)
node bin/cli.js help              # Show CLI help
node bin/cli.js list              # List available prompts/skills/hooks
node bin/cli.js install --dry-run # Preview an install (run in a sandbox dir, not this repo)
```

## Git Conventions

- Commit format: `type: Brief description` (`feat`, `fix`, `docs`, `refactor`, `test`, `chore`).
- Branches: `feature/<issue#>-brief-description`, `bugfix/...`, `hotfix/...`.
- One logical change per commit; keep the test suite green before pushing.
