import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
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

function createTempProject(t) {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-toolkit-'));
  t.after(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });
  return tempDir;
}

test('help shows target and append options', () => {
  const { status, stdout } = runCli(['help'], process.cwd());
  assert.equal(status, 0);
  assert.match(stdout, /--target <name>/);
  assert.match(stdout, /--append/);
});

test('install --target codex --dry-run reports planned changes', (t) => {
  const tempDir = createTempProject(t);
  const { status, stdout } = runCli(['install', '--target', 'codex', '--dry-run'], tempDir);

  assert.equal(status, 0);
  assert.match(stdout, /Codex Installer/);
  const match = stdout.match(/Dry run complete\. (\d+) files would be installed\./);
  assert.ok(match, 'expected dry-run summary count');
  assert.ok(Number(match[1]) > 0, 'expected planned changes to be greater than zero');
});

test('install --target=claude --dry-run selects Claude installer', (t) => {
  const tempDir = createTempProject(t);
  const { status, stdout } = runCli(['install', '--target=claude', '--dry-run'], tempDir);

  assert.equal(status, 0);
  assert.match(stdout, /Claude Code Installer/);
});

test('legacy codex flag still works', (t) => {
  const tempDir = createTempProject(t);
  const { status, stdout } = runCli(['install', '--codex', '--dry-run'], tempDir);

  assert.equal(status, 0);
  assert.match(stdout, /Codex Installer/);
});

test('conflicting legacy flags fail with a clear error', (t) => {
  const tempDir = createTempProject(t);
  const { status, stdout } = runCli(['install', '--claude', '--codex'], tempDir);

  assert.equal(status, 1);
  assert.match(stdout, /Use either --claude or --codex, not both/);
});

test('conflicting --target and legacy flag fails', (t) => {
  const tempDir = createTempProject(t);
  const { status, stdout } = runCli(['install', '--target', 'copilot', '--claude'], tempDir);

  assert.equal(status, 1);
  assert.match(stdout, /Conflicting target flags/);
});

test('invalid --target value fails with a clear error', (t) => {
  const tempDir = createTempProject(t);
  const { status, stdout } = runCli(['install', '--target', 'unknown'], tempDir);

  assert.equal(status, 1);
  assert.match(stdout, /Invalid --target value/);
});

test('append mode merges AGENTS.md when instructions are missing', (t) => {
  const tempDir = createTempProject(t);
  const agentsPath = path.join(tempDir, 'AGENTS.md');
  fs.writeFileSync(agentsPath, '# Team Instructions\n\nCustom content only.\n');

  const { status, stdout } = runCli(['install', '--target', 'codex', '--instructions-only', '--append'], tempDir);
  assert.equal(status, 0);
  assert.match(stdout, /Appended missing sections to AGENTS\.md/);

  const merged = fs.readFileSync(agentsPath, 'utf-8');
  assert.match(merged, /Custom content only\./);
  assert.match(merged, /Added by agents-toolkit \(\-\-append\)/);
  assert.match(merged, /## 🔄 Agent Workflow \(Complex Tasks\)/);
});
