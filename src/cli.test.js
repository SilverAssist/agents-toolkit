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

test('--stack react excludes WordPress content', (t) => {
  const tempDir = createTempProject(t);
  const { status, stdout } = runCli(['install', '--dry-run', '--stack', 'react'], tempDir);

  assert.equal(status, 0);
  assert.match(stdout, /css-styling\.instructions\.md/);
  assert.match(stdout, /react-components\.instructions\.md/);
  assert.doesNotMatch(stdout, /php-standards\.instructions\.md/);
  assert.doesNotMatch(stdout, /wordpress-plugin-architecture\.instructions\.md/);
  assert.doesNotMatch(stdout, /new-wp-component\.prompt\.md/);
  assert.doesNotMatch(stdout, /plugin-creation/);
});

test('--stack wordpress excludes React content', (t) => {
  const tempDir = createTempProject(t);
  const { status, stdout } = runCli(['install', '--dry-run', '--stack', 'wordpress'], tempDir);

  assert.equal(status, 0);
  assert.match(stdout, /php-standards\.instructions\.md/);
  assert.match(stdout, /new-wp-component\.prompt\.md/);
  assert.doesNotMatch(stdout, /css-styling\.instructions\.md/);
  assert.doesNotMatch(stdout, /react-components\.instructions\.md/);
  assert.doesNotMatch(stdout, /component-architecture/);
});

test('--tracker github excludes Jira prompts', (t) => {
  const tempDir = createTempProject(t);
  const { status, stdout } = runCli(['install', '--dry-run', '--tracker', 'github'], tempDir);

  assert.equal(status, 0);
  assert.match(stdout, /analyze-github-issue\.prompt\.md/);
  assert.match(stdout, /work-github-issue\.prompt\.md/);
  assert.match(stdout, /github-integration\.md/);
  assert.doesNotMatch(stdout, /analyze-ticket\.prompt\.md/);
  assert.doesNotMatch(stdout, /work-ticket\.prompt\.md/);
  assert.doesNotMatch(stdout, /jira-integration\.md/);
});

test('--tracker jira excludes GitHub prompts', (t) => {
  const tempDir = createTempProject(t);
  const { status, stdout } = runCli(['install', '--dry-run', '--tracker', 'jira'], tempDir);

  assert.equal(status, 0);
  assert.match(stdout, /analyze-ticket\.prompt\.md/);
  assert.match(stdout, /work-ticket\.prompt\.md/);
  assert.match(stdout, /jira-integration\.md/);
  assert.doesNotMatch(stdout, /analyze-github-issue\.prompt\.md/);
  assert.doesNotMatch(stdout, /work-github-issue\.prompt\.md/);
  assert.doesNotMatch(stdout, /github-integration\.md/);
});

test('invalid --stack value fails with a clear error', (t) => {
  const tempDir = createTempProject(t);
  const { status, stdout } = runCli(['install', '--stack', 'python'], tempDir);

  assert.equal(status, 1);
  assert.match(stdout, /Invalid --stack value/);
});

test('invalid --tracker value fails with a clear error', (t) => {
  const tempDir = createTempProject(t);
  const { status, stdout } = runCli(['install', '--tracker', 'linear'], tempDir);

  assert.equal(status, 1);
  assert.match(stdout, /Invalid --tracker value/);
});

test('config file stack/tracker values are used when no flags provided', (t) => {
  const tempDir = createTempProject(t);
  fs.writeFileSync(path.join(tempDir, '.agents-toolkit.json'), JSON.stringify({
    stack: 'react',
    tracker: 'github',
  }));

  const { status, stdout } = runCli(['install', '--dry-run'], tempDir);
  assert.equal(status, 0);
  assert.match(stdout, /react-components\.instructions\.md/);
  assert.doesNotMatch(stdout, /php-standards\.instructions\.md/);
  assert.match(stdout, /analyze-github-issue\.prompt\.md/);
  assert.doesNotMatch(stdout, /analyze-ticket\.prompt\.md/);
});

test('--global installs to ~/.copilot/ and skips project-level files', (t) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-toolkit-global-'));
  t.after(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  const result = spawnSync(process.execPath, [CLI_PATH, 'install', '--global', '--dry-run'], {
    cwd: os.tmpdir(),
    encoding: 'utf-8',
    env: { ...process.env, HOME: tempDir, USERPROFILE: tempDir },
  });

  const stdout = stripAnsi(result.stdout || '');
  assert.equal(result.status, 0);
  assert.match(stdout, /Global Installer/);
  assert.match(stdout, new RegExp(tempDir.replace(/[/\\]/g, '.')));
  // Should NOT include AGENTS.md or copilot-instructions.md in global mode
  assert.doesNotMatch(stdout, /Would create AGENTS\.md/);
  assert.doesNotMatch(stdout, /Would create copilot-instructions\.md/);
});

test('help shows --global option', () => {
  const { status, stdout } = runCli(['help'], process.cwd());
  assert.equal(status, 0);
  assert.match(stdout, /--global, -g/);
  assert.match(stdout, /install --global/);
});

// --- Hooks tests ---

test('--hooks-only installs hook files', (t) => {
  const tempDir = createTempProject(t);
  const { status, stdout } = runCli(['install', '--hooks-only'], tempDir);

  assert.equal(status, 0);
  assert.match(stdout, /Installing hooks/);

  // Verify hook config files were created
  const hooksDir = path.join(tempDir, '.github', 'hooks');
  assert.ok(fs.existsSync(path.join(hooksDir, 'validate-tsx.json')), 'validate-tsx.json should exist');
  assert.ok(fs.existsSync(path.join(hooksDir, 'lint-format.json')), 'lint-format.json should exist');

  // Verify scripts directory and files
  const scriptsDir = path.join(hooksDir, 'scripts');
  assert.ok(fs.existsSync(path.join(scriptsDir, 'validate-tsx.sh')), 'validate-tsx.sh should exist');
  assert.ok(fs.existsSync(path.join(scriptsDir, 'lint-format.sh')), 'lint-format.sh should exist');
});

test('--hooks-only makes scripts executable', (t) => {
  const tempDir = createTempProject(t);
  runCli(['install', '--hooks-only'], tempDir);

  const hooksDir = path.join(tempDir, '.github', 'hooks');
  const scriptsDir = path.join(hooksDir, 'scripts');

  // Check file permissions (0o755 = rwxr-xr-x)
  for (const script of ['validate-tsx.sh', 'lint-format.sh']) {
    const scriptPath = path.join(scriptsDir, script);
    if (fs.existsSync(scriptPath)) {
      const stat = fs.statSync(scriptPath);
      const mode = stat.mode & 0o777;
      assert.equal(mode, 0o755, `${script} should be executable (0755)`);
    }
  }
});

test('--hooks-only --dry-run does not create files', (t) => {
  const tempDir = createTempProject(t);
  const { status, stdout } = runCli(['install', '--hooks-only', '--dry-run'], tempDir);

  assert.equal(status, 0);
  assert.match(stdout, /Dry run complete/);

  // No files should exist
  const hooksDir = path.join(tempDir, '.github', 'hooks');
  assert.ok(!fs.existsSync(hooksDir), 'hooks dir should not exist in dry-run');
});

test('--hooks-only does not install prompts or instructions', (t) => {
  const tempDir = createTempProject(t);
  runCli(['install', '--hooks-only'], tempDir);

  // Prompts should NOT be installed
  const promptsDir = path.join(tempDir, '.github', 'prompts');
  assert.ok(!fs.existsSync(promptsDir), 'prompts should not be installed with --hooks-only');

  // Instructions should NOT be installed
  const instructionsDir = path.join(tempDir, '.github', 'instructions');
  assert.ok(!fs.existsSync(instructionsDir), 'instructions should not be installed with --hooks-only');
});

test('help shows --hooks-only option', () => {
  const { status, stdout } = runCli(['help'], process.cwd());
  assert.equal(status, 0);
  assert.match(stdout, /--hooks-only/);
});

test('--global --hooks-only installs hooks to ~/.copilot/hooks/', (t) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'agents-toolkit-global-hooks-'));
  t.after(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  const result = spawnSync(process.execPath, [CLI_PATH, 'install', '--global', '--hooks-only'], {
    cwd: os.tmpdir(),
    encoding: 'utf-8',
    env: { ...process.env, HOME: tempDir, USERPROFILE: tempDir },
  });

  const stdout = stripAnsi(result.stdout || '');
  assert.equal(result.status, 0);

  // Verify hooks are installed under ~/.copilot/hooks/
  const hooksDir = path.join(tempDir, '.copilot', 'hooks');
  assert.ok(fs.existsSync(path.join(hooksDir, 'validate-tsx.json')), 'validate-tsx.json should exist in global hooks');
  assert.ok(fs.existsSync(path.join(hooksDir, 'lint-format.json')), 'lint-format.json should exist in global hooks');
  assert.ok(fs.existsSync(path.join(hooksDir, 'scripts', 'validate-tsx.sh')), 'validate-tsx.sh should exist in global hooks');
  assert.ok(fs.existsSync(path.join(hooksDir, 'scripts', 'lint-format.sh')), 'lint-format.sh should exist in global hooks');

  // Verify the JSON configs use relative command paths (work for both project and global)
  const config = JSON.parse(fs.readFileSync(path.join(hooksDir, 'lint-format.json'), 'utf-8'));
  const command = config.hooks.PostToolUse[0].command;
  assert.ok(!command.includes('.github/'), 'command path should not contain .github/ (must work globally)');
  assert.match(command, /^scripts\//, 'command should use relative path from hooks dir');
});
