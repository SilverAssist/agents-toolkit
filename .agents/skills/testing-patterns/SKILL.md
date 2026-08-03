---
name: testing-patterns
description: Guide for writing tests with Node.js built-in test runner. Use this when creating tests, debugging test failures, or implementing test patterns for the agents-toolkit CLI.
---

# Testing Patterns — agents-toolkit

This project uses the **Node.js built-in test runner** (`node:test`) with the **strict assert** module (`node:assert/strict`). There is no Jest, no React Testing Library, and no TypeScript.

## Quick Reference

```bash
# Run all tests
npm test

# Run a specific test file
node --test src/cli.test.js
```

---

## Test File Structure

```js
import test from 'node:test';
import assert from 'node:assert/strict';
// other node built-ins as needed

test('description of what is being tested', () => {
  // arrange
  // act
  // assert
});

test('async operation', async () => {
  const result = await someAsyncFn();
  assert.equal(result, expected);
});
```

### Subtests

```js
test('feature group', async (t) => {
  await t.test('scenario 1', () => {
    assert.equal(add(1, 2), 3);
  });

  await t.test('scenario 2', () => {
    assert.throws(() => add(null, 2), { message: /invalid/ });
  });
});
```

---

## CLI Integration Tests

The primary test pattern for this project is spawning the CLI and asserting on stdout/stderr.

### Standard CLI Test Helper

```js
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CLI_PATH = path.join(__dirname, '..', 'bin', 'cli.js');

function stripAnsi(text) {
  return text.replace(/\u001b\[[0-9;]*m/g, '');
}

function runCli(args, cwd) {
  const result = spawnSync(process.execPath, [CLI_PATH, ...args], {
    cwd,
    encoding: 'utf-8',
  });

  return {
    status: result.status ?? 0,
    stdout: stripAnsi(result.stdout || ''),
    stderr: stripAnsi(result.stderr || ''),
  };
}
```

### Temporary Project Fixture

Use `t.after()` for cleanup so teardown runs even on failure:

```js
import fs from 'node:fs';
import os from 'node:os';

function createTempProject(t) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-toolkit-'));
  t.after(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });
  return tempDir;
}
```

### Asserting CLI Output

```js
test('install --dry-run reports planned changes', (t) => {
  const tempDir = createTempProject(t);
  const { status, stdout } = runCli(['install', '--target', 'copilot', '--dry-run'], tempDir);

  assert.equal(status, 0);
  assert.match(stdout, /Dry run complete\. \d+ files would be installed\./);
});

test('install exits 1 on unknown target', (t) => {
  const tempDir = createTempProject(t);
  const { status, stderr } = runCli(['install', '--target', 'unknown'], tempDir);

  assert.equal(status, 1);
  assert.match(stderr, /Unknown target/);
});
```

---

## Assert Methods Reference

| Method | Usage |
|--------|-------|
| `assert.equal(actual, expected)` | Strict equality (`===`) |
| `assert.notEqual(a, b)` | Strict inequality |
| `assert.ok(value)` | Truthy check |
| `assert.match(string, regexp)` | Regex match |
| `assert.doesNotMatch(string, regexp)` | Regex non-match |
| `assert.throws(fn, matcher?)` | Expects synchronous throw |
| `assert.rejects(fn, matcher?)` | Expects async rejection |
| `assert.deepEqual(a, b)` | Deep structural equality |

---

## File System Assertions

```js
import fs from 'node:fs';

// File exists
assert.ok(fs.existsSync(path.join(dir, 'expected-file.md')));

// File content
const content = fs.readFileSync(path.join(dir, 'file.md'), 'utf-8');
assert.match(content, /expected text/);

// Directory exists
assert.ok(fs.statSync(path.join(dir, 'subdir')).isDirectory());
```

---

## Naming Conventions

- Test file: same name as the module under test, suffix `.test.js`
  - `src/index.ts` → `src/index.test.ts`
  - `dist/cli.mjs` → `src/cli.test.js` (spawns the compiled CLI)
- Test description: plain English, starts with a verb ("installs", "reports", "exits")
- No `describe` blocks — use subtests (`t.test()`) when grouping is needed

---

## What NOT to Use

- ❌ Jest, Mocha, Vitest — not installed
- ❌ `assert` (non-strict) — always import from `node:assert/strict`
- ❌ `beforeEach` / `afterEach` — use `t.before()` / `t.after()` inside a subtest context
- ❌ Mocking libraries — use real file-system operations in a temp directory
