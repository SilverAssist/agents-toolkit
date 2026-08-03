---
name: quality-checks
description: Run and troubleshoot code quality tools for agents-toolkit. Covers the Node.js test runner, linting, and CI checks. Use when fixing test failures or troubleshooting CI.
---

# Quality Checks — agents-toolkit

This skill covers running and troubleshooting quality checks for the `@silverassist/agents-toolkit` Node.js CLI project.

## Quick Reference

```bash
# Run all tests
npm test

# Run a single test file
node --test src/cli.test.js

# Preview published package contents
npm pack --dry-run

# Verify package exports work
node -e "import('@silverassist/agents-toolkit').then(m => console.log(Object.keys(m)))"
```

---

## npm Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `npm test` | `node --test src/cli.test.js` | Run the full test suite |

---

## Test Failures

### Debugging a Failing Test

1. Run the specific test file:

   ```bash
   node --test src/cli.test.js
   ```

2. Add `console.log` statements to the `runCli()` helper to inspect stdout/stderr:

   ```js
   const result = runCli(['install', '--target', 'copilot', '--dry-run'], tempDir);
   console.log('stdout:', result.stdout);
   console.log('stderr:', result.stderr);
   ```

3. Run the CLI manually in a temp directory:

   ```bash
   mkdir /tmp/test-project && cd /tmp/test-project
   node /path/to/agents-toolkit/bin/cli.js install --target copilot --dry-run
   ```

### Common Failures

| Symptom | Cause | Fix |
|---------|-------|-----|
| `ERR_MODULE_NOT_FOUND` | Missing file referenced in source | Add the file to `templates/` or fix the path |
| Assertion fails on file count | New template file added/removed | Update the expected count in the test |
| Exit code 1 unexpectedly | CLI throwing an unhandled error | Check `result.stderr` for the error message |
| ANSI color codes in assertion | Missing `stripAnsi()` call | Wrap output with `stripAnsi()` before asserting |

---

## CI Checks (`.github/workflows/ci.yml`)

The CI pipeline runs on every push and PR to `main`. It:

1. Installs Node.js (matches `.nvmrc` or `engines.node` in `package.json`)
2. Runs `npm ci`
3. Runs `npm test`

### If CI Fails but Local Passes

- Check Node.js version mismatch — CI may use a different version
- Check if a template file was added locally but not committed
- Run `npm ci` locally (not `npm install`) to reproduce the clean-install behavior

---

## Package Integrity Checks

Before releasing, verify the package contents are correct:

```bash
# List files that would be published
npm pack --dry-run

# Expected top-level entries:
# bin/cli.js
# src/index.js
# templates/...
# README.md
# LICENSE
```

Files that should **never** be published:

- `src/cli.test.js`
- `.github/`, `.agents/`, `.claude/`
- `node_modules/`
- `.env`, `.env.*`
