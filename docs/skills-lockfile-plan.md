# Skills Lockfile Implementation Plan

**Issue**: [#21 — feat: Add skills lockfile support](https://github.com/SilverAssist/agents-toolkit/issues/21)
**Branch**: `feature/21-skills-lockfile`

## Problem Statement

When users run `npx @silverassist/agents-toolkit install`, skill files are physically copied into `.agents/skills/` and those files get committed to the project repository. Every time the package is updated, all projects must re-run install and commit hundreds of changed skill files — creating unnecessary churn.

## Current Architecture

```
npm package (templates/shared/skills/)
        │ copyDir()
        ▼
.agents/skills/<name>/SKILL.md   ← real files committed to repo
        │ symlink
        ▼
.github/skills/<name>            ← symlink → ../.agents/skills/<name>
.claude/skills/<name>            ← symlink → ../.agents/skills/<name>
```

**installSkillsStandard()** in `bin/cli.js`:
1. Copies from `templates/shared/skills/` → `.agents/skills/` (canonical store)
2. Symlinks `.github/skills/<name>` and `.claude/skills/<name>` → canonical store

## Proposed Architecture

```
npm package (templates/shared/skills/)
        │ copyDir() [same]
        ▼
.agents/skills/<name>/SKILL.md   ← real files (gitignored)
        │ symlink [same]
        ▼
.github/skills/<name>            ← symlink (gitignored)
.claude/skills/<name>            ← symlink (gitignored)

agents-toolkit-lock.json         ← NEW: only this gets committed
```

Users commit only the lockfile. Any teammate or CI pipeline runs `restore` to regenerate the skill files from the installed package version.

## Lockfile Format: `agents-toolkit-lock.json`

```json
{
  "version": 1,
  "packageVersion": "2.4.0",
  "config": {
    "stack": "react",
    "tracker": "github"
  },
  "skills": {
    "component-architecture": {
      "source": "@silverassist/agents-toolkit",
      "packageVersion": "2.4.0",
      "computedHash": "ca7b0c0c6e5f2750043f7f0cd72d16ac4e2abc48f9b5500d047a4b77a2506212",
      "agents": [".github/skills", ".claude/skills"]
    }
  }
}
```

The `computedHash` is a hex-encoded SHA-256 of the `SKILL.md` file content — same algorithm used by `npx skills` (Vercel). This enables detecting:
- **Drift**: file was manually modified after install
- **Staleness**: package was updated but `restore` hasn't been run

## Comparison with `npx skills` (Vercel)

| | `npx skills` | Our toolkit |
|---|---|---|
| Source | GitHub repo (`owner/repo`) | npm package (`templates/shared/skills/`) |
| `.agents/skills/` | real files downloaded from GitHub | real files copied from package |
| Agent dirs | symlinks → `.agents/skills/` | symlinks → `.agents/skills/` (existing) |
| Lockfile | `skills-lock.json` | `agents-toolkit-lock.json` |
| Restore | re-downloads from GitHub by hash | re-copies from installed npm package |
| Hash algorithm | SHA-256 of SKILL.md | SHA-256 of SKILL.md (same) |

## Implementation Phases

### Phase 1 — Core: `writeLockfile()` + extend `install`

**Files**: `bin/cli.js`

New helpers:
- `computeSkillHash(skillDir)` — reads `SKILL.md`, returns hex SHA-256 using `node:crypto`
- `writeLockfile(skills, config, options)` — writes `agents-toolkit-lock.json`
- `readLockfile()` — reads and parses `agents-toolkit-lock.json`, returns null if absent

Extend `installSkillsStandard()` return value to include the list of installed skill names and their agent dirs, so `install` can pass that data to `writeLockfile()`.

Changes to `install()` / `installClaude()` / `installCodex()`:
- After skills are installed, call `writeLockfile()` with collected skill metadata
- Skip lockfile write during `--dry-run`

Also handle `.gitignore` suggestion: after writing the lockfile, if `.gitignore` exists and doesn't already contain `.agents/skills/`, append the managed entries with a comment.

### Phase 2 — `restore` command

```bash
npx @silverassist/agents-toolkit restore [--force] [--dry-run]
```

Behavior:
1. Read `agents-toolkit-lock.json` — exit with friendly error if absent
2. Warn if `lockfile.packageVersion !== VERSION` (from `src/index.js`)
3. Call `installSkillsStandard()` using config from lockfile (`stack`, `tracker`)
4. After restore, compute hashes and verify each matches `computedHash` in lockfile
5. Report: `✅ N skills restored` or list of mismatches

### Phase 3 — `status` command

```bash
npx @silverassist/agents-toolkit status
```

Behavior:
1. Read `agents-toolkit-lock.json` — exit 1 with friendly error if absent
2. For each skill in the lockfile: compute hash of installed `SKILL.md`
3. Compare with stored hash
4. Print table: `up-to-date | modified | missing`
5. Exit 0 if all match, exit 1 if any mismatch (CI-friendly)

### Phase 4 — `update` command (rename existing + extend)

The existing `update` command is an alias for `install --force`. Extend it:
- Re-run install with `--force` (overwrites existing files)
- After install, recompute all hashes
- Write new `agents-toolkit-lock.json` with updated `packageVersion` and hashes
- Report diff: which skills changed (hash before vs after)

### Phase 5 — Tests

Add to `src/cli.test.js`:
- `install writes agents-toolkit-lock.json` — verify file exists and valid JSON after install
- `restore recreates skills from lockfile` — install, delete `.agents/skills/`, restore, verify files back
- `status exits 0 when up-to-date` — install, then status
- `status exits 1 when skill is missing` — install, delete one skill, status
- `status exits 1 when skill is modified` — install, modify SKILL.md, status

### Phase 6 — Docs

Update `README.md`:
- New "Skills Lockfile" section explaining the workflow
- Document `restore`, `status` commands
- Recommend `.gitignore` pattern
- Add note to "Getting Started" about committing only the lockfile

## Key Implementation Details

### Hash computation (`node:crypto`, no new deps)

```js
import crypto from 'node:crypto';

function computeSkillHash(skillDir) {
  const skillMdPath = path.join(skillDir, 'SKILL.md');
  if (!fs.existsSync(skillMdPath)) return null;
  const content = fs.readFileSync(skillMdPath, 'utf-8');
  return crypto.createHash('sha256').update(content).digest('hex');
}
```

### Lockfile location

Always at `process.cwd()/agents-toolkit-lock.json` (project root). Global installs (`--global`) do not write a lockfile — it makes no sense for user-level installs.

### `.gitignore` auto-update

The block to append:
```gitignore
# agents-toolkit managed — regenerate with: npx @silverassist/agents-toolkit restore
.agents/skills/
.github/skills/
.claude/skills/
```

Only append if none of the three entries already exist in `.gitignore`. Never touch `.gitignore` during `--dry-run` or `--global`.

## Files to Change

| File | Change |
|---|---|
| `bin/cli.js` | Add `computeSkillHash`, `writeLockfile`, `readLockfile`; extend `install`; add `restore`, `status`; update `update`; extend `showHelp`; extend `parseArgs`; extend `main` switch |
| `src/index.js` | No change needed (`VERSION` already exported) |
| `src/cli.test.js` | Add tests for phases 1–3 |
| `README.md` | Document lockfile workflow and new commands |

## Acceptance Criteria

- [ ] `install` writes `agents-toolkit-lock.json` on every non-dry-run, non-global run
- [ ] `restore` reads the lockfile and reinstalls all skills + symlinks
- [ ] `status` exits 0 when all skills match lockfile, exits 1 on any mismatch
- [ ] `update` rewrites the lockfile with new hashes after force-reinstall
- [ ] Tests cover all four behaviors
- [ ] `.agents/skills/` can be gitignored — `restore` recreates everything
- [ ] README updated with lockfile-only commit pattern
