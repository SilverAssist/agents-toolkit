---
name: domain-driven-design
description: Guide for organizing code using Domain-Driven Design principles. Use this when creating new features, restructuring folders, or ensuring consistent project organization.
---

# Domain-Driven Design (DDD) Skill

This skill provides guidelines for organizing the `@silverassist/agents-toolkit` codebase following
Domain-Driven Design principles. The project is a **Node.js ESM CLI** with no React, TypeScript, or
build step — adapt all examples accordingly.

## Core Principles

1. **Group by Responsibility, Not by Type** — Organize files by what they do, not what kind of file they are
2. **Clear Boundaries** — Each module has well-defined inputs, outputs, and responsibilities
3. **Self-Documenting Structure** — Folder and file names communicate intent without needing comments
4. **Colocation** — Tests (`src/cli.test.js`) live next to the code they test

## Project Layout

```
agents-toolkit/
├── bin/
│   └── cli.js              # Single CLI entry point — all install logic lives here
├── src/
│   ├── index.js            # Public API — metadata exports only (VERSION, PROMPTS, …)
│   └── cli.test.js         # Full test suite (node:test + spawnSync)
├── templates/
│   ├── shared/             # Canonical source of truth for distributed content
│   │   ├── instructions/   # .instructions.md files
│   │   ├── prompts/        # .prompt.md files + _partials/
│   │   ├── skills/         # SKILL.md folders
│   │   └── hooks/          # .json hook definitions + scripts/
│   └── agents/             # Root agent files (AGENTS.md, CLAUDE.md, …)
├── .agents/skills/         # Canonical dev skills store (single source of truth)
├── .github/
│   ├── prompts/            # Dev workflow prompts for Copilot/Codex (real files)
│   ├── skills/             # Symlinks → .agents/skills/
│   └── instructions/       # (installed by consumers, not present in this repo)
└── .claude/
    ├── commands/           # Dev workflow commands for Claude Code (real files)
    └── skills/             # Symlinks → .agents/skills/
```

## Responsibility Boundaries

### `bin/cli.js` — The CLI

Single file responsible for all runtime behavior:
- Argument parsing (`--stack`, `--tracker`, `--force`, `--dry-run`, `--global`, `--copy`)
- Content filtering (`FILE_CATEGORIES` + `shouldIncludeFile()`)
- Install orchestration (`install`, `installClaude`, `installCodex`, `installGitBasedTarget`)
- File copy/symlink operations (`copyDir`, `installSkills`)
- Path resolution helpers (`getTargetDir`, `getClaudeTargetDir`, `getAgentsSkillsDir`)
- Console output helpers (`info`, `warn`, `success`, `error`)

**Rule:** Keep all install logic in `bin/cli.js`. Do not split into multiple files unless the file
grows past ~1000 lines. Reuse existing helpers — do not add new ones for one-time operations.

### `src/index.js` — Public Metadata

Only exports package metadata. No logic:

```js
export const VERSION = "2.4.0";
export const PROMPTS = { workflow: [...], utility: [...] };
export const INSTRUCTIONS = [...];
export const SKILLS = [...];
// ...
```

**Rule:** Every array must stay alphabetically sorted and in sync with the corresponding
`templates/shared/` directory. See `.github/instructions/index-exports.instructions.md`.

### `templates/shared/` — Distributed Content

The single source of truth for what gets installed into end-user projects. Changes here affect
what consumers receive on the next `npx @silverassist/agents-toolkit@latest install`.

**Rule:** Never reference project-specific paths (`bin/`, `src/`) inside templates. Templates
must be generic enough to work in any project matching the target stack/tracker.

### `src/cli.test.js` — Tests

Tests spawn the CLI as a child process against a temp directory and assert on the filesystem and
stdout/stderr. Tests are the spec — new behavior requires a test.

**Rule:** Use `spawnSync` against temp dirs. Never mock internal functions. See the
`testing-patterns` skill for patterns.

## Organizing New Features

### Adding a new CLI flag

1. Parse in the `parseArgs()` / options section at the top of `bin/cli.js`
2. Thread the value through `install*` functions that need it
3. Honor the flag in all install paths (`install`, `installClaude`, `installCodex`)
4. Add to the `help` command output
5. Add a test: `help shows --flag-name option`

### Adding a new template file

1. Create the file under the correct `templates/shared/` subdirectory
2. Add the name (without extension) to the appropriate `FILE_CATEGORIES` array in `bin/cli.js`
3. Add to the matching export array in `src/index.js`
4. Add `shouldIncludeFile()` logic if the file is stack- or tracker-specific
5. Add/update a test asserting the file appears (or doesn't) under the right `--stack`/`--tracker`

### Adding a new skill to `.agents/skills/`

1. Create `.agents/skills/<name>/SKILL.md`
2. Create symlinks: `.github/skills/<name>` → `../../.agents/skills/<name>` and
   `.claude/skills/<name>` → `../../.agents/skills/<name>`
3. The skill description must reflect **this repo** (Node.js CLI, ESM, `node:test`)

## Avoiding Common Mistakes

### ❌ Don't split `bin/cli.js` prematurely

```
# ❌ BAD: premature modularization
bin/
├── cli.js
├── install.js       # artificial split
├── filter.js        # one function = one file
└── helpers.js       # catch-all
```

```
# ✅ GOOD: keep related logic together until it genuinely warrants extraction
bin/
└── cli.js           # all install logic, clearly sectioned with comments
```

### ❌ Don't put logic in `src/index.js`

```js
// ❌ BAD
export function install(target) { ... }  // logic belongs in bin/cli.js

// ✅ GOOD
export const SKILLS = ['domain-driven-design', 'testing-patterns'];  // metadata only
```

### ❌ Don't add project-specific content to templates

```
# ❌ BAD: template references this repo's layout
templates/shared/prompts/review-code.prompt.md mentions bin/cli.js

# ✅ GOOD: template is generic
templates/shared/prompts/review-code.prompt.md describes general code review steps
```

## Checklist

Before adding new code:

- [ ] Is this logic (→ `bin/cli.js`) or metadata (→ `src/index.js`)?
- [ ] If it's a new template, is it in the right `templates/shared/` subdirectory?
- [ ] Is `FILE_CATEGORIES` updated in `bin/cli.js`?
- [ ] Is `src/index.js` export updated and alphabetically sorted?
- [ ] Is there a test for the new behavior?
- [ ] Does the template avoid project-specific references?
