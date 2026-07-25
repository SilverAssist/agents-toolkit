# Plan — Pre-review "core review" subagent flow (#35)

## Problem statement

These toolkit/CI/instruction repos are what we use to **guide agents**, so any doc↔code
inaccuracy propagates as an agent error. During recent work (agents-toolkit #32,
jsdoc-to-tsdoc #7) Copilot review **did not converge quickly**: each push triggered a fresh
full-file review that found **1–9 new, mostly valid** issues (rounds went 18 → 2 → 3 → 1 → 9
→ 3 → 1 → 1 …). The findings were real doc/code drift, not noise — but resolving them one
round at a time is slow and noisy.

We want a reusable **"core review"** flow that runs a thorough, **whole-repo** consistency
review at two points — **(1) before opening a PR** and **(2) before pushing fixes in response
to a reviewer** — to catch these classes of issues *before* they reach Copilot, drastically
reducing review loops.

## Current architecture (relevant pieces)

- `templates/shared/{instructions,prompts,skills}/` — single source of truth for content.
- `bin/cli.js` → `FILE_CATEGORIES` + `shouldIncludeFile()` drive `--stack` / `--tracker` filtering.
- `src/index.js` exports metadata arrays (`INSTRUCTIONS`, `SKILLS`, `PROMPTS`).
- READMEs (`README.md`, `templates/shared/prompts/README.md`, `templates/shared/skills/README.md`)
  and `CHANGELOG.md` index the assets. `templates/agents/AGENTS.md` shows a curated asset map.
- `src/cli.test.js` — native `node --test` suite spawning the CLI against temp dirs.
- Prior art: `resolve-github-reviews.prompt.md`, `finalize-github-pr.prompt.md`,
  `create-github-pr.prompt.md`, `templates/shared/skills/github-review-management/SKILL.md`,
  `review-code.prompt.md`.

## Design decision: skill + integration steps (no new standalone prompt)

The knowledge (what to look for, how to run it as a read-only subagent, the output contract)
lives in a **skill** — `core-review`. The **action** lives as short steps added to the three
existing GitHub PR prompts, each pointing at the skill. This mirrors the
`github-review-management` skill ↔ `resolve-github-reviews` prompt split and avoids a new
top-level command to register/test.

Categorization mirrors `github-review-management`: `skills.github` **+** `skills.universal`,
so `--tracker github` (and `--tracker all`) include it and `--tracker jira` excludes it — the
two integration points are all GitHub-tracker prompts.

## Proposed changes

### New file
- `templates/shared/skills/core-review/SKILL.md` — the reviewer's knowledge:
  - **When to use** (the two integration points).
  - **How to run it** as a read-only reviewer **subagent** scoped to the *whole repo* (with
    per-tool notes: Claude Code spawns a subagent; other tools run the checklist inline as a
    dedicated pass).
  - **Scope**: whole repo, not just the diff — with rationale (Copilot re-reviews whole files).
  - **The prioritized review checklist** (learnings from the iterations), each with a concrete
    ❌→✅ example: docs↔code consistency, code-example validity, links/references, markdown
    hygiene, inventories/tables completeness, shell/script robustness, repo health.
  - **Output contract**: a prioritized findings list — severity + `file:line` + problem +
    suggested fix.
  - **Acting on findings & convergence**: fix → re-run → loop until clean; when to stop; what
    *not* to flag (avoid false positives).

### Integration (existing prompts)
- `create-github-pr.prompt.md` — new **"Pre-PR core review"** step *before* Push Branch
  (renumber Push/Create/Comment steps accordingly).
- `resolve-github-reviews.prompt.md` — add item 3 to Step 3 ("Apply each fix and run checks"):
  re-review the *whole* repo before committing the batch; plus a one-line pointer in Step 4.
- `finalize-github-pr.prompt.md` — note in Step 2 ("Address Review Comments") to run the
  whole-repo core review before pushing additional commits.

Skill references use the canonical `.agents/skills/core-review/SKILL.md` path (present for all
tools via the `npx skills` store) rather than a tool-specific `.github`/`.claude` path.

### Registration (`bin/cli.js` `FILE_CATEGORIES.skills`)
- `github` += `core-review`.
- `universal` += `core-review` (so the universal-branch tracker filter excludes it under `--tracker jira`).

### Metadata + indexes
- `src/index.js`: `SKILLS` += `core-review` (alphabetical).
- `README.md`: Skills table row; bump the three "12 skills total" tree counts to **13**.
- `templates/shared/skills/README.md`: tree + Available Skills table.
- `templates/agents/AGENTS.md`: add `core-review/SKILL.md` to the curated Skills index.
- `CHANGELOG.md`: `## [Unreleased]` → Added (skill) + Changed (FILE_CATEGORIES, prompt integration, docs indexes).

### Tests (`src/cli.test.js`)
- `core-review` skill included for `--tracker github`, excluded for `--tracker jira`
  (mirrors the `github-review-management` test).

## Phase breakdown

1. **Skill** — author `core-review/SKILL.md`.
2. **Integration** — edit the three prompts.
3. **Registration + metadata** — `bin/cli.js`, `src/index.js`.
4. **Tests** — add coverage; `npm test` green.
5. **Docs** — README, skills README, AGENTS.md, CHANGELOG.

## Testing strategy

- `npm test` (native `node --test`) — existing suite stays green; new inclusion/exclusion
  assertion passes.
- Manual `node bin/cli.js install --dry-run --tracker github|jira` sanity check for the skill's
  presence/absence.

## Acceptance criteria (from #35)

- [ ] `core-review` skill added with the checklist and subagent-invocation guidance.
- [ ] `create-github-pr` and `resolve-github-reviews` / `finalize-github-pr` reference the
      pre-review step at the two integration points.
- [ ] Registered in `FILE_CATEGORIES` + `src/index.js`; installable and surfaced under the
      right `--stack` / `--tracker`.
- [ ] README indexes + `CHANGELOG.md` updated; `npm test` passes.
