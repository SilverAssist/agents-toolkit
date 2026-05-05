# Implementation Plan: Deduplicate `templates/` + Rename Package

> Issue: [#7](https://github.com/SilverAssist/copilot-prompts-kit/issues/7)
> Branch: `refactor/7-deduplicate-templates`

---

## Problem Statement

The `templates/` directory duplicates content across flat top-level folders and agent-specific subdirectories. ~28 files are maintained in two locations (`templates/` and `.github/`), creating drift risk and maintenance burden.

Additionally, the package is named `copilot-prompts-kit` but now supports GitHub Copilot, Claude Code, and Codex — the name is misleading.

**Observed drift (3 files):**
- `skills/README.md` — "GitHub Copilot" vs "agents" wording (templates is correct/canonical)
- `skills/component-architecture/SKILL.md` — `export default function` vs `export function` (templates is correct per project conventions)
- `.github/prompts/release.prompt.md` — repo-specific, should stay in `.github/` only

All other files (instructions: 5, prompts: 16, skills: 2) are **identical**.

---

## Package Rename (BREAKING CHANGE → v2.0.0)

| Item | Old | New |
|------|-----|-----|
| npm package | `@silverassist/copilot-prompts-kit` | `@silverassist/agents-toolkit` |
| bin command | `copilot-prompts` | `agents-toolkit` |
| Config file | `.copilot-prompts.json` | `.agents-toolkit.json` |
| Display title | "Copilot Prompts Kit" | "Agents Toolkit" |
| Module JSDoc | `@module copilot-prompts-kit/cli` | `@module agents-toolkit/cli` |

**Post-publish:** `npm deprecate @silverassist/copilot-prompts-kit "Renamed to @silverassist/agents-toolkit"`

---

## Current Structure

```
templates/
├── AGENTS.md                   # Copilot Coding Agent root template
├── copilot-instructions.md     # Copilot root template
├── claude/CLAUDE.md            # Claude root template
├── codex/AGENTS.md             # Codex root template
├── instructions/ (5 files)     # DUPLICATES .github/instructions/
├── prompts/ (16 files)         # DUPLICATES .github/prompts/ (minus release.prompt.md)
└── skills/ (4 files)           # DUPLICATES .github/skills/ (with minor drift)
```

---

## Proposed Structure

```
templates/
├── agents/                          # Agent-specific root files ONLY
│   ├── copilot-instructions.md      # → .github/copilot-instructions.md
│   ├── AGENTS.md                    # → ./AGENTS.md (Copilot Coding Agent)
│   ├── AGENTS.codex.md              # → ./AGENTS.md (Codex variant)
│   └── CLAUDE.md                    # → ./CLAUDE.md
├── shared/                          # Single source of truth
│   ├── instructions/ (5 files)
│   ├── prompts/ (16 files incl. _partials/)
│   └── skills/ (4 files in 3 dirs)
```

---

## Phase Breakdown

### Phase 1: Resolve Drift (sync .github/ → templates/)

Before restructuring, make `.github/` match `templates/` (the canonical source):

1. Copy `templates/skills/README.md` → `.github/skills/README.md`
2. Copy `templates/skills/component-architecture/SKILL.md` → `.github/skills/component-architecture/SKILL.md`

**Decision:** `templates/` is canonical because it's the distributed package content. `.github/` dogfoods it.

### Phase 2: Restructure `templates/`

Move files:
```bash
# Create new structure
mkdir -p templates/agents templates/shared

# Move agent-specific root files
mv templates/copilot-instructions.md templates/agents/
mv templates/AGENTS.md templates/agents/
mv templates/codex/AGENTS.md templates/agents/AGENTS.codex.md
mv templates/claude/CLAUDE.md templates/agents/

# Move shared content
mv templates/instructions templates/shared/
mv templates/prompts templates/shared/
mv templates/skills templates/shared/

# Remove empty agent-specific dirs
rm -r templates/codex templates/claude
```

### Phase 3: Update CLI (`bin/cli.js`)

Update path references (6 locations):

| Current Path | New Path |
|---|---|
| `path.join(TEMPLATES_DIR, 'prompts')` | `path.join(TEMPLATES_DIR, 'shared', 'prompts')` |
| `path.join(TEMPLATES_DIR, 'instructions')` | `path.join(TEMPLATES_DIR, 'shared', 'instructions')` |
| `path.join(TEMPLATES_DIR, 'skills')` | `path.join(TEMPLATES_DIR, 'shared', 'skills')` |
| `path.join(TEMPLATES_DIR, 'copilot-instructions.md')` | `path.join(TEMPLATES_DIR, 'agents', 'copilot-instructions.md')` |
| `path.join(TEMPLATES_DIR, 'AGENTS.md')` | `path.join(TEMPLATES_DIR, 'agents', 'AGENTS.md')` |
| `path.join(TEMPLATES_DIR, 'codex', 'AGENTS.md')` | `path.join(TEMPLATES_DIR, 'agents', 'AGENTS.codex.md')` |
| `path.join(TEMPLATES_DIR, 'claude', 'CLAUDE.md')` | `path.join(TEMPLATES_DIR, 'agents', 'CLAUDE.md')` |

### Phase 4: Update Tests

Run existing 8 tests — they exercise the CLI via `spawnSync`, so they test the full path resolution end-to-end. No test code changes should be needed (they don't reference template paths directly).

```bash
node --test src/cli.test.js
```

### Phase 5: Validate Package

```bash
npm pack --dry-run 2>&1 | grep templates/
```

Confirm all files under `templates/shared/` and `templates/agents/` are included.

### Phase 6: CHANGELOG & Docs

- Add entry under `[Unreleased]` in CHANGELOG.md
- Update README if it references template paths

---

## Testing Strategy

- **Unit tests**: All 8 existing tests must pass (install copilot/codex/claude, dry-run, conflicts, append)
- **Manual**: Run `node bin/cli.js install --dry-run` for each target and verify file count matches current behavior
- **Package**: `npm pack --dry-run` to verify published contents

---

## Acceptance Criteria

- [ ] Single source of truth for instructions, prompts, and skills in `templates/shared/`
- [ ] Agent-specific files isolated in `templates/agents/`
- [ ] CLI installs correctly for all targets: `--copilot`, `--codex`, `--claude`
- [ ] All existing tests pass
- [ ] Package renamed to `@silverassist/agents-toolkit` (bin: `agents-toolkit`)
- [ ] Config file renamed to `.agents-toolkit.json`
- [ ] Version bumped to 2.0.0
- [ ] CHANGELOG updated with breaking changes
