---
agent: agent
description: Fix failing tests in agents-toolkit
---

# Fix Code Issues

Fix failing tests in `src/cli.test.js`.

## Steps

### 1. Run the Test Suite

```bash
npm test 2>&1 | head -80
```

### 2. Read Failing Test Output

For each failing test, the output shows:

- Test name
- Expected vs actual values
- Stack trace pointing to the assertion

### 3. Diagnose Each Failure

Determine the root cause:

- **CLI output changed** — update assertion regex to match new output
- **CLI behavior changed** — fix the relevant `src/commands/` or `src/installers/` module
- **Test is wrong** — update test if requirement changed
- **New file missing** — CLI didn't create a file it should; fix the installer
- **Symlink type wrong** — ensure `fs.symlinkSync(target, link, 'dir')` uses `'dir'` type

### 4. Fix the Code

Edit the relevant file:

- `src/commands/` — CLI behavior and installers
- `src/cli.test.js` — test assertions (only if the test is wrong)
- `src/index.ts` — exports (if an export mismatch caused the failure)

### 5. Re-run After Each Fix

```bash
npm test
```

All tests must pass before committing.

## Output

### Fixed Issues

| Test | Root Cause | Fix Applied |
|------|-----------|-------------|
| test name | description | what was changed |

### Remaining Issues

List any tests still failing and why.
