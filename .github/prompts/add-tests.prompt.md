---
agent: agent
description: Add tests for a CLI command, flag, or behavior in agents-toolkit
---

# Add Tests

Add tests for **{target-behavior}** in `src/cli.test.js`.

## Prerequisites

- Reference: `.agents/skills/testing-patterns/SKILL.md`

## Steps

### 1. Analyze Target

Read the relevant code in `bin/cli.js` to understand:

- What command/flag/behavior to test
- What filesystem changes it produces
- What stdout/stderr output it emits
- Edge cases and failure modes

### 2. Test Location

All tests live in `src/cli.test.js`. Add the new test(s) at the end of the file,
grouped logically with a comment separator if introducing a new area.

### 3. Test Pattern

Every test spawns the CLI against a temp directory:

```js
test('{description of what it does}', (t) => {
  const tempDir = createTempProject(t);  // auto-cleaned after test
  const { status, stdout } = runCli(['install', '--flag', '--dry-run'], tempDir);

  assert.equal(status, 0);
  assert.match(stdout, /expected output/);
  assert.doesNotMatch(stdout, /unexpected output/);
});
```

For filesystem assertions:

```js
test('{description}', (t) => {
  const tempDir = createTempProject(t);
  runCli(['install', '--some-flag'], tempDir);

  const filePath = path.join(tempDir, '.github', 'path', 'to', 'file');
  assert.ok(fs.existsSync(filePath), 'file should exist');

  const content = fs.readFileSync(filePath, 'utf-8');
  assert.match(content, /expected content/);
});
```

For symlink assertions (always guard with `symlinkSupported()`):

```js
test('{description}', (t) => {
  const tempDir = createTempProject(t);
  runCli(['install', '--skills-only'], tempDir);

  const link = path.join(tempDir, '.github', 'skills', 'skill-name');
  const stat = fs.lstatSync(link);
  if (symlinkSupported(tempDir)) {
    assert.ok(stat.isSymbolicLink(), 'should be a symlink');
  } else {
    assert.ok(stat.isDirectory(), 'fallback: should be a real directory');
  }
  assert.ok(fs.existsSync(path.join(link, 'SKILL.md')), 'SKILL.md should be readable');
});
```

For global installs (use `HOME` override):

```js
test('{description}', (t) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-toolkit-global-'));
  t.after(() => { fs.rmSync(tempDir, { recursive: true, force: true }); });

  const result = spawnSync(process.execPath, [CLI_PATH, 'install', '--global', '--dry-run'], {
    cwd: os.tmpdir(),
    encoding: 'utf-8',
    env: { ...process.env, HOME: tempDir, USERPROFILE: tempDir },
  });

  const stdout = stripAnsi(result.stdout || '');
  assert.equal(result.status, 0);
  assert.match(stdout, /expected/);
});
```

### 4. Run and Verify

```bash
npm test
```

All 31+ tests must pass. Fix any regressions before committing.

### 5. Update Test Count Comment

If you added new tests, verify the count in the suite output matches expectations.
