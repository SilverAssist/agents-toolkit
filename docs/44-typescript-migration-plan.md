# TypeScript Migration Plan — Issue #44

## Problem Statement

`bin/cli.js` (1,690 lines), `src/index.js` (115 lines) and `src/cli.test.js` (1,100 lines)
are plain ESM with JSDoc annotations and no type checking. The code has outgrown this setup:

- String-surgery functions (`extractClaudeAlias`, `transformFrontmatterForClaude`) take and
  return `string` with structure enforced only by convention — the class of bug that strict
  typing catches before review.
- The toolkit prescribes TSDoc to every consumer project via `tsdoc-standards` while its own
  source remains untyped JSDoc.
- Export arrays in `src/index.js` are hand-synced with the filesystem; the check is a
  documented manual step backed only by tests.

---

## Current Architecture

Everything lives in two flat files:

```text
bin/cli.js       — 1,690 lines; 40 functions; no module boundaries
src/index.js     — 115 lines; VERSION + export arrays
src/cli.test.js  — 1,100 lines; 85 tests; spawn-based integration tests
```

No `tsconfig.json`, no build step, no TypeScript devDependency.

---

## Proposed Architecture (DDD + SRP + Barrel Exports)

Each folder is a domain with a single responsibility; the `index.ts` barrel exposes only
the public surface. Flat files (`logger.ts`, `paths.ts`, `types.ts`) are used for
single-responsibility modules that will not gain internal sub-files.

```text
src/
├── cli.ts                      — entry point: shebang + main() dispatcher (~40 lines)
├── index.ts                    — library surface: VERSION, PROMPTS, SKILLS, …
├── types.ts                    — all shared interfaces (Lockfile, InstallOptions, …)
├── logger.ts                   — log / success / warn / error / info
├── paths.ts                    — getHomeDir, getTargetDir, getClaudeTargetDir, getAgentsSkillsDir
│
├── filter/
│   └── index.ts                — FILE_CATEGORIES, shouldIncludeFile
│
├── config/
│   └── index.ts                — DEFAULT_CONFIG, AgentToolkitConfig, resolveFilters,
│                                  getInstallScope, getChangeCount
│
├── lockfile/
│   └── index.ts                — LOCKFILE_NAME, computeSkillHash, readLockfile, writeLockfile
│
├── transforms/
│   └── index.ts                — extractClaudeAlias, transformFrontmatterForClaude,
│                                  adaptPathsForClaude
│
├── copy/
│   └── index.ts                — copyDir, appendSkillsToGitignore,
│                                  linkSkill, installSkillsStandard
│
├── installers/
│   ├── index.ts                — barrel re-export
│   ├── hooks.ts                — finalizeHookConfigs, installHooks
│   ├── instructions.ts         — installCopilotInstructions
│   ├── agents.ts               — getAgentsTemplateBody, installAgentsFile
│   └── git-based.ts            — installGitBasedTarget (main install orchestrator)
│
└── commands/
    ├── index.ts                — barrel re-export
    ├── install.ts              — install, installClaude, installCodex
    ├── restore.ts              — restore
    ├── status.ts               — status, list
    └── help.ts                 — showHelp, parseArgs, resolveInstallTarget
```

### Barrel export convention

Every domain folder exports a single `index.ts`:

```typescript
// src/lockfile/index.ts — only public symbols cross the boundary
export { computeSkillHash, readLockfile, writeLockfile } from './lockfile.js';
// or inline if the domain is one file:
export const LOCKFILE_NAME = '...';
export function readLockfile(...) { ... }
```

Consumers import from the barrel, never from internal files:

```typescript
import { readLockfile, writeLockfile } from '../lockfile/index.js';
```

---

## Concrete Types to Define (`src/types.ts`)

```typescript
/** Single skill entry in the lockfile. */
export interface LockfileEntry {
  source: string;
  packageVersion: string;
  computedHash: string | null;
  agents: string[];
}

/** Shape of agents-toolkit-lock.json. */
export interface Lockfile {
  version: 1;
  packageVersion: string;
  config: { stack: string; tracker: string };
  skills: Record<string, LockfileEntry>;
}

/** Parsed CLI flags passed throughout the install pipeline. */
export interface InstallOptions {
  force: boolean;
  global: boolean;
  dryRun: boolean;
  copy: boolean;
  promptsOnly: boolean;
  partialsOnly: boolean;
  skillsOnly: boolean;
  instructionsOnly: boolean;
  hooksOnly: boolean;
  claude: boolean;
  codex: boolean;
  append: boolean;
  noAgentOverrides: boolean;
  target: string | null;
  stack: string | null;
  tracker: string | null;
}

/** Shape of .agents-toolkit.json (project or global). */
export interface AgentToolkitConfig {
  stack?: 'react' | 'wordpress' | 'all';
  tracker?: 'jira' | 'github' | 'all';
  jira?: { projectKey: string; baseUrl: string };
  git?: { defaultBranch: string; branchPrefix: Record<string, string> };
  pr?: { targetBranch: string; template: string };
}

/** Options accepted by copyDir. */
export interface CopyOptions {
  force?: boolean;
  dryRun?: boolean;
  filterFile?: (name: string) => boolean;
  renameFile?: (name: string) => string;
  transformContent?: (content: string, filename: string) => string;
}

/** Resolved stack/tracker values used by shouldIncludeFile. */
export interface InstallFilters {
  stack: string;
  tracker: string;
}

/** Return value of extractClaudeAlias. */
export type ClaudeAlias = 'haiku' | 'sonnet' | 'opus' | 'fable' | null;
```

---

## Build Infrastructure

Mirrors `jsdoc-to-tsdoc` exactly (same team, same constraints):

**`tsconfig.json`** — strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`,
`noEmit: true` (unbuild drives actual emit via esbuild).

**`build.config.ts`** — unbuild, two entries:

- `src/cli` → `dist/cli.mjs` (shebang preserved)
- `src/index` → `dist/index.mjs`

**`package.json` changes**:

- `"bin"`: `"dist/cli.mjs"` (currently `bin/cli.js`)
- `"main"`: `"dist/index.mjs"` (currently `src/index.js`)
- `"files"`: add `"dist"`, keep `"bin"` until bin/cli.js is deleted in PR D
- new scripts: `"typecheck": "tsc --noEmit"`, `"build": "unbuild"`
- update `"check"` to prepend `npm run typecheck && npm run build &&`
- devDeps: `typescript`, `unbuild`, `@types/node`

**CI** — add `typecheck` + `build` steps before `npm test` in the quality workflow.

---

## Phase Breakdown (4 PRs — Strangler-Fig Pattern)

PRs A–C add new `src/` modules alongside the untouched `bin/cli.js`. PR D wires
everything together, cuts over, and deletes `bin/cli.js`. At every stage the full
test suite (85 tests) stays green.

### PR A — Build foundation + `src/index.ts` + flat utilities

**Goal:** Prove the build chain works end-to-end with no functional change.

- Add `typescript`, `unbuild`, `@types/node` to devDependencies
- `tsconfig.json` (strict, noUncheckedIndexedAccess, exactOptionalPropertyTypes)
- `build.config.ts` (entries: src/cli, src/index; externals: none)
- `package.json`: add typecheck/build scripts; add `dist/` to `"files"` (keep `bin/`)
- `src/types.ts` — all shared interfaces
- `src/index.js` → `src/index.ts` (add `as const` to literal arrays; no logic change)
- `src/logger.ts` — extracted from bin/cli.js (log, success, warn, error, info)
- `src/paths.ts` — extracted (getHomeDir, getTargetDir, getClaudeTargetDir, getAgentsSkillsDir)
- CI: prepend `typecheck` + `build` to quality workflow

`bin/cli.js` untouched. `CLI_PATH` in tests still points to `bin/cli.js`.
`npm run typecheck` passes, `npm run build` produces `dist/`.
All 85 tests still green.

### PR B — Pure domain modules (filter, config, lockfile, transforms)

**Goal:** Typed, single-responsibility modules for the four domain clusters that carry
the most structural risk (filtering logic, config loading, lockfile I/O, YAML surgery).

- `src/filter/index.ts` — FILE_CATEGORIES, shouldIncludeFile
- `src/config/index.ts` — DEFAULT_CONFIG, AgentToolkitConfig loader, resolveFilters,
  getInstallScope, getChangeCount, ensureConfigFile
- `src/lockfile/index.ts` — LOCKFILE_NAME, computeSkillHash, readLockfile, writeLockfile
- `src/transforms/index.ts` — `ClaudeAlias` literal union, extractClaudeAlias (return type
  `ClaudeAlias`), transformFrontmatterForClaude, adaptPathsForClaude

`bin/cli.js` still untouched. `typecheck` + `build` + 85 tests green.

### PR C — Copy + installers

**Goal:** Port the file-system and install-orchestration layer.

- `src/copy/index.ts` — copyDir, appendSkillsToGitignore, linkSkill, installSkillsStandard
- `src/installers/hooks.ts` — finalizeHookConfigs, installHooks
- `src/installers/instructions.ts` — installCopilotInstructions
- `src/installers/agents.ts` — getAgentsTemplateBody, installAgentsFile
- `src/installers/git-based.ts` — installGitBasedTarget (~500 lines; biggest single function)
- `src/installers/index.ts` — barrel re-export

`bin/cli.js` still untouched. `typecheck` + `build` + 85 tests green.

### PR D — Commands + entry point + test migration + cutover

**Goal:** Wire all src/ modules into `src/cli.ts`, delete `bin/cli.js`, verify full
`npx` contract.

- `src/commands/install.ts` — install, installClaude, installCodex
- `src/commands/restore.ts` — restore
- `src/commands/status.ts` — status, list
- `src/commands/help.ts` — showHelp, parseArgs, resolveInstallTarget
- `src/commands/index.ts` — barrel re-export
- `src/cli.ts` — main() dispatcher; `#!/usr/bin/env node` shebang
- `package.json`: `"bin"` → `"dist/cli.mjs"`, `"main"` → `"dist/index.mjs"`,
  remove `"bin/"` from `"files"` if bin/ is empty
- `src/cli.test.js` → `src/cli.test.ts`: update `CLI_PATH` to `dist/cli.mjs`;
  add `beforeAll(() => execSync('npm run build'))` or rely on pre-test build step
- Delete `bin/cli.js`
- Verify `npx` against a scratch project for all three targets (copilot, claude, codex)

All 85 tests now run against compiled `dist/cli.mjs`. `npm run check` (typecheck + build + validate:prompts + test) green.

### PR E — TSDoc dogfood (separate, post-D)

**Goal:** Migrate JSDoc comments to TSDoc using the toolkit's own `jsdoc-to-tsdoc` tool —
a real end-to-end test for that project.

```bash
npx jsdoc-to-tsdoc init     # tsdoc.json + ESLint rules
npx jsdoc-to-tsdoc convert  # batch JSDoc → TSDoc
npx jsdoc-to-tsdoc check    # validate; expect ~15% residual for manual fix
```

Add `tsdoc.json` and `eslint-plugin-tsdoc` devDep. Fix residual issues from `check`.
File issues against `jsdoc-to-tsdoc` for any shapes it cannot handle.

---

## Testing Strategy

- Tests remain spawn-based (`spawnSync` against CLI_PATH) throughout PRs A–D: no change
  to test structure until PR D's cutover.
- In PR D, `CLI_PATH` changes from `bin/cli.js` → `dist/cli.mjs`. The `build` step must
  run before `node --test` in CI.
- **Compat job** (`npm ci --omit=dev && node --test`): after PR D, this job needs
  `npm run build` inserted before `npm test`. TypeScript is a devDep, so the compat job
  must install devDeps for the build step, then strip them. Alternative: commit `dist/`
  to the repo (simpler, keeps compat job unchanged).
- Unit tests for new typed modules (PR B–C): test the pure functions directly rather than
  through the CLI subprocess, since they are now importable modules.
- The `validate:prompts` and version-sync checks (`every shipped prompt declares tools:`,
  `VERSION matches package.json`) are type-aware after migration but logic unchanged.

---

## Acceptance Criteria

- [ ] `tsconfig.json` with `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`
- [ ] `npm run typecheck` passes (zero errors, zero `any`)
- [ ] `npm run build` produces `dist/cli.mjs` + `dist/index.mjs`
- [ ] `npx @silverassist/agents-toolkit install` works against a scratch project for
      all three targets: copilot, claude, codex
- [ ] `npm test` green — 85 tests, no coverage regression
- [ ] `npm run check` green end-to-end
- [ ] No `any` — confirmed by `noImplicitAny` (implied by `strict`)
- [ ] Version and export-array sync checks still enforced
- [ ] Every exported symbol has valid TSDoc (PR E)
