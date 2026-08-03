# Copilot Code Review Instructions — agents-toolkit

When performing a code review, apply the following checks.

## 1. Template/Export Sync (CRITICAL)

`src/index.ts` exports must always match the actual files in `templates/shared/`.
Check each array against the filesystem:

| Export | Source directory | Strip suffix |
|--------|-----------------|--------------|
| `SKILLS` | `templates/shared/skills/` | (folder names, no suffix) |
| `INSTRUCTIONS` | `templates/shared/instructions/` | `.instructions.md` |
| `PARTIALS` | `templates/shared/prompts/_partials/` | `.md` |
| `HOOKS` | `templates/shared/hooks/` | `.json` |
| `PROMPTS.workflow` + `PROMPTS.utility` | `templates/shared/prompts/` | `.prompt.md` |
| `AGENTS` | `templates/shared/agents/` | `.md` |

Flag any file that exists in `templates/shared/` but is missing from the corresponding export array, and vice versa.
All arrays must be sorted alphabetically.

## 2. Test Platform Portability

- Every test that creates or asserts on a symlink **must** be gated by `symlinkSupported(tempDir)`.
- `symlinkSupported()` must call `fs.symlinkSync(target, probe, 'dir')` — the `'dir'` type argument is required to match CLI behavior and avoid false negatives on Windows Developer Mode.
- Never write a test that unconditionally calls `stat.isSymbolicLink()` without a `symlinkSupported()` guard.

## 3. Documentation Completeness

- Any README example that lists available items (skills, instructions, prompts, hooks) must show **all** items, not a truncated subset. If the list is long, add a comment like `# ... 9 total`.
- Sections titled "Creating Custom X" must point to the canonical source-of-truth location:
  - Custom skills → `.agents/skills/your-skill-name/` (not `.github/skills/`)
  - After adding, run `install --skills-only` to propagate symlinks.

## 4. Node.js ESM Conventions

- All imports use `import`/`export` syntax (ESM only, `"type": "module"` in package.json).
- Use `fileURLToPath(import.meta.url)` for `__dirname` equivalents — never `__dirname` directly.
- Tests use `node:test` and `node:assert/strict` — not Jest or Mocha.
- CLI tests use `spawnSync` into temp directories; always check `result.status === 0` and inspect `result.stderr` on failure.

## 5. CLI Flags Consistency

When adding a new CLI flag:

- Add it to the `help` command output.
- Add a corresponding test asserting `help shows --flag-name option`.
- Honor `force`, `dryRun`, and `global` flags in the new code path.

## 6. Version Sync (CRITICAL)

This package declares its version in **two** places that MUST always match:

- `package.json` → `"version"`
- `src/index.ts` → `export const VERSION`

`src/cli.ts` (compiled to `dist/cli.mjs`) stamps the exported `VERSION` into the generated `agents-toolkit-lock.json`
(`packageVersion`), and `restore` / `status` compare against it to warn on drift — so a mismatch
records the wrong version in users' lockfiles and emits misleading sync warnings. On any
release/version-bump PR (or any diff that touches either value), confirm both are identical and equal
to the new version. Flag a bump that updates one but not the other. See the **Release Flow** section
in `CLAUDE.md` / `AGENTS.md`.
