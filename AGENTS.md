# AGENTS.md

Instructions for AI coding agents (Codex, Cursor, and others that read the
[agents.md](https://agents.md) standard) working in this repository. Claude Code
reads the equivalent `CLAUDE.md`; keep both aligned when you change project guidance.

## What This Project Is

`@silverassist/agents-toolkit` is a **Node.js ESM CLI package** that installs reusable AI
agent content (instructions, prompts, skills, hooks) into a user's project for **GitHub
Copilot, Claude Code, and Codex**. It is a distribution/installer tool — not an application.
There is no React, Next.js, or build step here.

> ⚠️ This repo is the *source* of the toolkit. Do **not** run `install` inside this repo
> — it would overwrite the developer workflow files in `.github/prompts/`, `.claude/commands/`,
> `.github/skills/`, and `.claude/skills/` with the generic end-user templates. The CLI targets
> the current working directory and ignores positional arguments.

## Architecture

| Path | Purpose |
| --- | --- |
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
  **Exception — Claude Code subagent overrides** (`templates/shared/agents/*.md`): the filename stem **must match the target subagent's `name:` frontmatter exactly** (case-sensitive), because Claude Code loads `.claude/agents/<name>.md` and resolves overrides by filename stem. A mismatch registers a *new* subagent instead of overriding the built-in one, silently defeating the purpose — e.g. renaming `Explore.md` to `EXPLORE.md` or `explore.md` would leave Claude's built-in `Explore` running on its default (smart) tier and the shipped `haiku` pin would never take effect. This is a Claude Code protocol requirement, not a stylistic choice — platform naming wins over the repo convention. Any new subagent override added under `templates/shared/agents/` must follow the same rule.
- **JSDoc** on functions in `bin/cli.js`, written in English.
- Reuse existing helpers (`copyDir`, `getTargetDir`, `getClaudeTargetDir`, `getAgentsSkillsDir`, `info/warn/success/error`) instead of adding new ones.
- Keep installers honoring `force`, `dryRun`, and `global` consistently.

## Workflow

When adding a feature or fixing a bug:

1. **Make the change** in `bin/cli.js` / `templates/` / `src/`.
2. **Add or update tests** in `src/cli.test.js` (spawn CLI against a temp dir, assert filesystem + output).
3. **Run the suite**: `npm test` — must stay green.
4. **Update docs**: `README.md`, the relevant `templates/shared/*/README.md`, and `CHANGELOG.md`.
5. **Bump version** in both `package.json` and `src/index.js` (`VERSION`) following SemVer — see **Release Flow**.

## Release Flow

Releasing `@silverassist/agents-toolkit` (a Node/npm package published from GitHub):

1. **Bump the version in BOTH places — they MUST match** (⚠️ CRITICAL): `package.json` `"version"`
   **and** `src/index.js` `export const VERSION`. Run `npm version X.Y.Z --no-git-tag-version` to keep
   `package.json` + `package-lock.json` in sync, then set `src/index.js` `VERSION` to the same value.
   `bin/cli.js` stamps `VERSION` into the `agents-toolkit-lock.json` lockfile (`packageVersion`) and
   `restore`/`status` compare against it, so a mismatch writes the wrong version into users' lockfiles
   and triggers false drift warnings. (Enforced by check #6 in `.github/copilot-instructions.md`.)
2. **Promote the CHANGELOG** `[Unreleased]` section to `## [X.Y.Z] - YYYY-MM-DD`.
3. **Open a `release/vX.Y.Z` branch + PR** and merge it.
4. **Publish = a GitHub Release, not just a tag** (⚠️ CRITICAL): `.github/workflows/publish.yml`
   triggers on `on: release: [created]`, so pushing a bare tag does **not** publish to npm. After merge:

   ```bash
   git checkout main && git pull
   gh release create vX.Y.Z --generate-notes   # fires publish.yml → npm publish
   ```

   Tags are immutable — never reuse a tag; bump again if it already exists.

## Commands

```bash
npm run check                     # The full gate — CI and pre-push run this exact command
npm test                          # Run the test suite (node --test)
npm run lint:md                   # markdownlint over the repo (templates/ is the product)
npm run format                    # Prettier over .js/.json/.yml — never Markdown
npm run validate:prompts          # Frontmatter shape check for templates/shared/prompts
node bin/cli.js help              # Show CLI help
node bin/cli.js list              # List available prompts/skills/hooks
node bin/cli.js install --dry-run # Preview an install (run in a sandbox dir, not this repo)
```

## Quality Gate

`npm run check` is the single entry point: **format check → markdownlint → prompt frontmatter →
tests**. CI and the `pre-push` hook both invoke it, so the two cannot drift.

Git hooks are installed by `prepare` (husky) and are a local convenience — CI is the real gate:

| Hook | Does |
| --- | --- |
| `pre-commit` | Refuses direct commits to `main`/`master`, then runs `lint-staged` on staged files |
| `pre-push` | Runs `npm run check` |

Both exit early when `$CI` is set. Escape hatches: `git commit --no-verify`, `git push --no-verify`.

Three constraints worth knowing before changing this setup:

- **Prettier never touches Markdown.** It rewrites code spans and fenced content whose exact
  whitespace is the subject of the surrounding sentence, and `templates/` documents frontmatter
  and shell snippets character by character. Markdown is linted, not formatted.
- **`markdownlint --fix` is not run automatically**, for the same reason. Its fixers for `MD029`
  (ordered-list numbering) and `MD007` (list indentation) silently change meaning — renumbering
  broke prose in `nextjs-caching/SKILL.md` that cites items by number — so both rules are off.
- **`engines.node` stays `>=18`.** The dev tooling needs more (markdownlint-cli2 `>=22`,
  lint-staged `>=20.17`), which is why CI's `quality` job runs Node 22 while the `compat` matrix
  installs with `--omit=dev` and exercises the CLI on 18/20/22.

## Git Conventions

- Commit format: `type: Brief description` (`feat`, `fix`, `docs`, `refactor`, `test`, `chore`).
- Branches: `feature/<issue#>-brief-description`, `bugfix/...`, `hotfix/...`.
- One logical change per commit; keep the test suite green before pushing.
