---
name: domain-driven-design
description: Guide for organizing code using Domain-Driven Design principles. Use this when creating new features, restructuring folders, or ensuring consistent project organization.
---

# Domain-Driven Design (DDD) Skill

This skill provides guidelines for organizing the `@silverassist/agents-toolkit`
codebase following Domain-Driven Design principles. The project is a **Node.js ESM CLI
with TypeScript** compiled to `dist/` via `unbuild` — adapt all examples accordingly.

## Core Principles

1. **Group by Responsibility, Not by Type** — Organize files by what they do, not what kind of file they are
2. **Clear Boundaries** — Each domain module has well-defined inputs, outputs, and responsibilities
3. **Self-Documenting Structure** — Folder and file names communicate intent without needing comments
4. **Colocation** — Tests (`src/cli.test.js`) live next to the code they test

## Project Layout

```text
agents-toolkit/
├── src/
│   ├── cli.ts              # Entry point — shebang + main() dispatcher (~40 lines)
│   ├── index.ts            # Public API — metadata exports only (VERSION, PROMPTS, …)
│   ├── types.ts            # Shared interfaces (Lockfile, InstallOptions, …)
│   ├── constants.ts        # TEMPLATES_DIR (import.meta.url based)
│   ├── logger.ts           # ColorKey union + log helpers
│   ├── paths.ts            # Install-path helpers
│   ├── filter/             # FILE_CATEGORIES + shouldIncludeFile
│   ├── config/             # AgentToolkitConfig loading + resolveFilters
│   ├── lockfile/           # computeSkillHash + readLockfile + writeLockfile
│   ├── transforms/         # Copilot→Claude frontmatter transforms
│   ├── copy/               # copyDir + linkSkill + installSkillsStandard
│   ├── installers/         # hooks, instructions, agents, git-based orchestrator
│   ├── commands/           # install, restore, status, list, help
│   └── cli.test.js         # Spawn-based tests (node:test + spawnSync against dist/)
├── dist/               # Compiled output (gitignored; built by unbuild)
├── templates/
│   ├── shared/             # Canonical source of truth for distributed content
│   └── agents/             # Root agent files (AGENTS.md, CLAUDE.md, …)
├── .agents/skills/     # Canonical dev skills store (single source of truth)
├── .github/
│   ├── prompts/            # Dev workflow prompts for Copilot/Codex (real files)
│   ├── skills/             # Symlinks → .agents/skills/
│   └── instructions/       # Path-scoped Copilot review rules
└── .claude/
    ├── commands/           # Dev workflow commands for Claude Code (real files)
    └── skills/             # Symlinks → .agents/skills/
```

## Responsibility Boundaries

### `src/cli.ts` — Entry Point

Thin dispatcher only — imports commands, parses args, calls the right function. ~40 lines.

**Rule:** No install logic in `src/cli.ts`. If you're adding behavior, it belongs in a domain module.

### `src/commands/` — Top-Level Commands

One file per command verb: `install.ts`, `restore.ts`, `status.ts`, `help.ts`. Each imports
from domain modules and orchestrates them into user-facing behavior.

**Rule:** Commands are thin orchestrators. Business logic lives in domain modules.

### `src/installers/` — Install Orchestration

`git-based.ts` is the main orchestrator for Copilot/Codex installs. `hooks.ts`, `instructions.ts`,
`agents.ts` each handle one install concern.

### `src/filter/` `src/config/` `src/lockfile/` `src/transforms/` `src/copy/` — Domain Modules

Pure-ish modules: each owns one domain, exports through `index.ts` barrel only.

**Rule:** Import from a domain's `index.ts`, never from an internal file.

### `src/index.ts` — Public Metadata

Only exports package metadata. No logic:

```ts
export const VERSION = '2.4.0';
export const PROMPTS = { workflow: [...], utility: [...] };
export const SKILLS = [...];
// ...
```

**Rule:** Every array must stay alphabetically sorted and in sync with the corresponding
`templates/shared/` directory. See `.github/instructions/index-exports.instructions.md`.

### `templates/shared/` — Distributed Content

The single source of truth for what gets installed into end-user projects.

**Rule:** Never reference project-specific paths (`src/`, `dist/`) inside templates.
Templates must be generic enough to work in any project matching the target stack/tracker.

### `src/cli.test.js` — Tests

Tests spawn `dist/cli.mjs` as a child process against a temp directory and assert on
the filesystem and stdout/stderr. `pretest` builds `dist/` automatically.

**Rule:** Use `spawnSync` against temp dirs. Never mock internal functions. See the
`testing-patterns` skill for patterns.

## Organizing New Features

### Adding a new CLI flag

1. Add the flag to `parseArgs()` in `src/commands/help.ts` and to `InstallOptions` in `src/types.ts`
2. Thread the value through the relevant install functions
3. Honor the flag in all install paths (`install`, `installClaude`, `installCodex`)
4. Add to the `showHelp()` output in `src/commands/help.ts`
5. Add a test: `help shows --flag-name option`

### Adding a new template file

1. Create the file under the correct `templates/shared/` subdirectory
2. Add the name (without extension) to the appropriate `FILE_CATEGORIES` array in `src/filter/index.ts`
3. Add to the matching export array in `src/index.ts`
4. Add `shouldIncludeFile()` logic if the file is stack- or tracker-specific
5. Add/update a test asserting the file appears (or doesn't) under the right `--stack`/`--tracker`

### Adding a new skill to `.agents/skills/`

1. Create `.agents/skills/<name>/SKILL.md`
2. Create symlinks: `.github/skills/<name>` → `../../.agents/skills/<name>` and
   `.claude/skills/<name>` → `../../.agents/skills/<name>`
3. The skill description must reflect **this repo** (Node.js ESM CLI, TypeScript, `node:test`)

## Avoiding Common Mistakes

### ❌ Don't put logic in `src/cli.ts`

```ts
// ❌ BAD: logic in the entry point
export function main() {
  // ...200 lines of install logic...
}

// ✅ GOOD: delegate to a command module
export function main() {
  const { command, options } = parseArgs();
  if (command === 'install') install(options);
}
```

### ❌ Don't put logic in `src/index.ts`

```ts
// ❌ BAD
export function install(target: string) { ... }  // logic belongs in src/commands/

// ✅ GOOD
export const SKILLS = ['domain-driven-design', 'testing-patterns'];  // metadata only
```

### ❌ Don't import from a domain's internal files

```ts
// ❌ BAD
import { readLockfile } from '../lockfile/lockfile.js';

// ✅ GOOD
import { readLockfile } from '../lockfile/index.js';
```

### ❌ Don't add project-specific content to templates

```text
# ❌ BAD: template references this repo's layout
templates/shared/prompts/review-code.prompt.md mentions src/commands/install.ts

# ✅ GOOD: template is generic
templates/shared/prompts/review-code.prompt.md describes general code review steps
```

## Checklist

Before adding new code:

- [ ] Is this logic (→ a domain module in `src/`) or metadata (→ `src/index.ts`)?
- [ ] If it's a new template, is it in the right `templates/shared/` subdirectory?
- [ ] Is `FILE_CATEGORIES` updated in `src/filter/index.ts`?
- [ ] Is `src/index.ts` export updated and alphabetically sorted?
- [ ] Is there a test for the new behavior?
- [ ] Does the template avoid project-specific references?
