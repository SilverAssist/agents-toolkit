---
agent: agent
description: Quick code review of current changes
---

# Quick Code Review

Perform a quick code review of the current changes.

## Steps

### 1. Get Changed Files

```bash
git diff --name-only HEAD~1
# or for uncommitted changes:
git diff --name-only
```

### 2. Review Each File

#### `src/commands/` and `src/installers/` — CLI logic

- [ ] No `console.log` debug statements (use `info()`/`warn()`/`success()`/`error()` helpers)
- [ ] No hardcoded paths — use `getTargetDir()`, `getClaudeTargetDir()`, `getAgentsSkillsDir()`
- [ ] TSDoc on new/modified exported symbols in `src/**/*.ts`
- [ ] `force`, `dryRun`, and `global` flags respected in new code paths
- [ ] New flags added to `showHelp()` output in `src/commands/help.ts`
- [ ] No duplicate code — reuse existing helpers (`copyDir`, `linkSkill`, etc.)
- [ ] Imports use the domain barrel (`../installers/index.js`), never internal files

#### `src/index.ts` — exports

- [ ] All arrays sorted alphabetically
- [ ] Every file in `templates/shared/` has a corresponding export entry
- [ ] No entry references a file that doesn't exist in `templates/shared/`

#### `src/cli.test.js` — tests

- [ ] Symlink tests gated by `symlinkSupported(tempDir)`
- [ ] `symlinkSupported()` uses `'dir'` as the third argument to `symlinkSync`
- [ ] New CLI flags have a corresponding `help shows --flag` test
- [ ] Global install tests use `HOME`/`USERPROFILE` env override

#### `templates/shared/` — content files

- [ ] Prompt frontmatter uses `agent: agent` (not `mode: agent`)
- [ ] No Copilot-specific references in generic templates

### 3. Security Check

- [ ] No hardcoded credentials or API keys
- [ ] No `eval` or dynamic `require` with user input
- [ ] File write paths stay within the target directory (no path traversal)

### 4. Scope Check

- [ ] Changes align with the issue/PR scope
- [ ] No unintended modifications to unrelated files
- [ ] `CHANGELOG.md` updated under the correct version
- [ ] `README.md` updated if user-visible behavior changed

## Output

### Review Summary

| File | Status | Issues |
|------|--------|--------|
| src/commands/ | ✅/⚠️/❌ | — |

### Issues Found

#### ❌ Critical (must fix)

- Issue description

#### ⚠️ Warnings (should fix)

- Warning description

### Overall

**Status**: Ready / Needs Work
