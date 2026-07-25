# Plan — TSDoc Standards + GitHub Review Management (#31)

## Problem statement

Two reusable AI-workflow assets are missing from `templates/shared/` and must be
centralized so any repo can install them via `agents-toolkit`:

1. **TSDoc Standards** — an `applyTo`-scoped instructions file (+ supporting skill) so
   agents write/enforce **TSDoc** (not JSDoc) in TypeScript. A canonical ruleset already
   exists in the Next.js repos (`homecare-nextjs/.github/instructions/tsdoc-standards.instructions.md`);
   this toolkit is the right home for it.
2. **GitHub Review Management** — a prompt (`/resolve-github-reviews`) + supporting skill that
   teach agents to **fetch → reply → resolve → close** GitHub PR review threads (Copilot or human),
   including the GraphQL `resolveReviewThread` mutation (REST cannot resolve threads).

## Current architecture (relevant pieces)

- `templates/shared/{instructions,prompts,skills}/` — single source of truth for content.
- `bin/cli.js` → `FILE_CATEGORIES` + `shouldIncludeFile()` drive `--stack` / `--tracker` filtering.
- `src/index.js` exports metadata arrays (`INSTRUCTIONS`, `SKILLS`, `PROMPTS`).
- READMEs (`README.md`, `templates/shared/prompts/README.md`, `templates/shared/skills/README.md`)
  and `CHANGELOG.md` index the assets. `templates/agents/AGENTS.md` shows a curated asset map.
- `src/cli.test.js` — native `node --test` suite spawning the CLI against temp dirs.

## Proposed changes

### New files
- `templates/shared/instructions/tsdoc-standards.instructions.md` — ported from the reference
  file; frontmatter adds `description` + `name` alongside `applyTo: "**/*.{ts,tsx}"`.
- `templates/shared/skills/tsdoc-standards/SKILL.md` — richer on-demand reference.
- `templates/shared/prompts/resolve-github-reviews.prompt.md` — `agent: agent`, exact `gh`/GraphQL commands.
- `templates/shared/skills/github-review-management/SKILL.md` — reference knowledge backing the prompt.

### Registration (`bin/cli.js` `FILE_CATEGORIES`)
- `instructions.react` += `tsdoc-standards` (next to `typescript`).
- `prompts.universal` += `resolve-github-reviews`; `prompts.github` += `resolve-github-reviews`.
- `skills.react` += `tsdoc-standards` (TS-only → react, parity with the instruction).
- `skills.github` = `['github-review-management']` (new key) + add to `skills.universal`
  so the universal-branch tracker filter excludes it under `--tracker jira`.

### Metadata + indexes
- `src/index.js`: `INSTRUCTIONS` += `tsdoc-standards`; `SKILLS` += `github-review-management`,
  `tsdoc-standards`; `PROMPTS.utility` += `resolve-github-reviews`.
- `README.md`: instructions table (tsdoc), skills table (both), utility prompts table (resolve-github-reviews).
- `templates/shared/prompts/README.md`, `templates/shared/skills/README.md`: add entries.
- `templates/agents/AGENTS.md`: add tsdoc instruction + both skills to the curated index.
- `CHANGELOG.md`: new `## [Unreleased]` → Added section.

### Tests (`src/cli.test.js`)
- `--stack react` includes `tsdoc-standards.instructions.md`; `--stack wordpress` excludes it.
- `--tracker github` includes `resolve-github-reviews.prompt.md`; `--tracker jira` excludes it.
- Skills filtering for the two new skills under the relevant stack/tracker.

## Open questions → resolutions (from the issue)
- TSDoc instructions only or + skill? → **Both** (instructions primary, skill for depth).
- Review management GitHub-only for v1? → **Yes** (Bitbucket/GitLab out of scope).
- Categorize `tsdoc-standards` instruction under `react` or `universal`? → **`react`** (next to `typescript`).

## Risk assessment
- **Low.** Additive content + one new `FILE_CATEGORIES.skills.github` key (handled generically by
  `shouldIncludeFile`). No changes to install/copy/symlink logic. Version bump is deferred to the
  Release Flow; changes accumulate under CHANGELOG `[Unreleased]`.

## Acceptance criteria (from #31)
- [ ] `tsdoc-standards.instructions.md` added with `applyTo: "**/*.{ts,tsx}"`, ported from the reference.
- [ ] `resolve-github-reviews.prompt.md` added with working `gh`/GraphQL commands and `_partials` references.
- [ ] `github-review-management` skill added (and optional `tsdoc-standards` skill).
- [ ] New assets registered in `FILE_CATEGORIES` and installable (verify `--stack react` / `--tracker github`).
- [ ] README indexes + `CHANGELOG.md` updated; `npm test` passes.
