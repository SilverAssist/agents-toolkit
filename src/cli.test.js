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

/**
 * Returns true when the OS / file-system supports symbolic links in dir.
 * On Windows without Developer Mode symlink creation requires elevated
 * privileges; the CLI falls back to real copies in that case.
 * @param {string} dir - Directory to probe
 * @returns {boolean}
 */
function symlinkSupported(dir) {
  const probe = path.join(dir, '_symlink_probe');
  try {
    fs.symlinkSync(dir, probe, 'dir');
    fs.unlinkSync(probe);
    return true;
  } catch {
    return false;
  }
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
  assert.match(stdout, /create-github-pr\.prompt\.md/);
  assert.match(stdout, /finalize-github-pr\.prompt\.md/);
  assert.match(stdout, /github-integration\.md/);
  assert.doesNotMatch(stdout, /analyze-ticket\.prompt\.md/);
  assert.doesNotMatch(stdout, /work-ticket\.prompt\.md/);
  assert.doesNotMatch(stdout, /create-pr\.prompt\.md/);
  assert.doesNotMatch(stdout, /finalize-pr\.prompt\.md/);
  assert.doesNotMatch(stdout, /jira-integration\.md/);
});

test('--tracker jira excludes GitHub prompts', (t) => {
  const tempDir = createTempProject(t);
  const { status, stdout } = runCli(['install', '--dry-run', '--tracker', 'jira'], tempDir);

  assert.equal(status, 0);
  assert.match(stdout, /analyze-ticket\.prompt\.md/);
  assert.match(stdout, /work-ticket\.prompt\.md/);
  assert.match(stdout, /create-pr\.prompt\.md/);
  assert.match(stdout, /finalize-pr\.prompt\.md/);
  assert.match(stdout, /jira-integration\.md/);
  assert.doesNotMatch(stdout, /analyze-github-issue\.prompt\.md/);
  assert.doesNotMatch(stdout, /work-github-issue\.prompt\.md/);
  assert.doesNotMatch(stdout, /create-github-pr\.prompt\.md/);
  assert.doesNotMatch(stdout, /finalize-github-pr\.prompt\.md/);
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
  const entry = config.hooks.PostToolUse[0];
  assert.ok(!entry.command.includes('.github/'), 'command path should not contain .github/ (must work globally)');
  assert.match(entry.command, /^scripts\//, 'command should use relative path from hooks dir');

  // Global installs need an absolute cwd (no workspace anchor) + required version field
  assert.equal(config.version, 1, 'global hook config should declare version 1');
  assert.equal(entry.cwd, hooksDir, 'global hook cwd should be the absolute hooks directory');
});

test('--hooks-only sets cwd to .github/hooks for project installs', (t) => {
  const tempDir = createTempProject(t);
  const result = spawnSync(process.execPath, [CLI_PATH, 'install', '--hooks-only'], {
    cwd: tempDir,
    encoding: 'utf-8',
  });
  assert.equal(result.status, 0);

  const config = JSON.parse(fs.readFileSync(path.join(tempDir, '.github', 'hooks', 'lint-format.json'), 'utf-8'));
  const entry = config.hooks.PostToolUse[0];
  assert.equal(config.version, 1, 'project hook config should declare version 1');
  assert.equal(entry.cwd, '.github/hooks', 'project hook cwd should be relative to the workspace root');
  assert.match(entry.command, /^scripts\//, 'command should resolve against cwd');

  // The command must resolve to a real script from the configured cwd.
  const resolved = path.join(tempDir, entry.cwd, entry.command);
  assert.ok(fs.existsSync(resolved), 'cwd + command should point at an installed script');
});

// --- Skills (npx skills standard) tests ---

test('--skills-only creates canonical .agents/skills and symlinks .github/skills', (t) => {
  const tempDir = createTempProject(t);
  const { status } = runCli(['install', '--skills-only'], tempDir);
  assert.equal(status, 0);

  const canonical = path.join(tempDir, '.agents', 'skills', 'domain-driven-design');
  assert.ok(fs.existsSync(path.join(canonical, 'SKILL.md')), 'canonical skill should exist in .agents/skills');

  const link = path.join(tempDir, '.github', 'skills', 'domain-driven-design');
  const stat = fs.lstatSync(link);
  if (symlinkSupported(tempDir)) {
    assert.ok(stat.isSymbolicLink(), '.github/skills entry should be a symlink');
  } else {
    assert.ok(stat.isDirectory(), '.github/skills entry should be a real directory (copy fallback)');
  }

  // Skill must be readable through the agent entry regardless of symlink/copy.
  assert.ok(fs.existsSync(path.join(link, 'SKILL.md')), 'skill should be readable through .github/skills');
});

test('--claude --skills-only symlinks .claude/skills to the same canonical store', (t) => {
  const tempDir = createTempProject(t);
  const { status } = runCli(['install', '--claude', '--skills-only'], tempDir);
  assert.equal(status, 0);

  const canonical = path.join(tempDir, '.agents', 'skills', 'domain-driven-design');
  assert.ok(fs.existsSync(path.join(canonical, 'SKILL.md')), 'canonical skill should exist');

  const link = path.join(tempDir, '.claude', 'skills', 'domain-driven-design');
  const stat = fs.lstatSync(link);
  if (symlinkSupported(tempDir)) {
    assert.ok(stat.isSymbolicLink(), '.claude/skills entry should be a symlink');
    const target = fs.readlinkSync(link);
    const resolved = path.resolve(path.dirname(link), target);
    assert.equal(resolved, canonical, '.claude/skills symlink should point to .agents/skills canonical');
  } else {
    assert.ok(stat.isDirectory(), '.claude/skills entry should be a real directory (copy fallback)');
    assert.ok(fs.existsSync(path.join(link, 'SKILL.md')), 'copied skill should be readable through .claude/skills');
  }
});

test('installing both targets shares a single canonical skills store', (t) => {
  const tempDir = createTempProject(t);
  runCli(['install', '--skills-only'], tempDir);
  runCli(['install', '--claude', '--skills-only'], tempDir);

  const canonicalFile = path.join(tempDir, '.agents', 'skills', 'domain-driven-design', 'SKILL.md');
  const githubEntry = path.join(tempDir, '.github', 'skills', 'domain-driven-design', 'SKILL.md');
  const claudeEntry = path.join(tempDir, '.claude', 'skills', 'domain-driven-design', 'SKILL.md');

  assert.ok(fs.existsSync(githubEntry), '.github/skills skill should be readable');
  assert.ok(fs.existsSync(claudeEntry), '.claude/skills skill should be readable');

  if (symlinkSupported(tempDir)) {
    // When symlinks are used, editing the canonical file is immediately visible
    // through both agent entries (single source of truth).
    fs.appendFileSync(canonicalFile, '\n<!-- single source of truth marker -->\n');
    const viaGithub = fs.readFileSync(githubEntry, 'utf-8');
    const viaClaude = fs.readFileSync(claudeEntry, 'utf-8');
    assert.match(viaGithub, /single source of truth marker/);
    assert.match(viaClaude, /single source of truth marker/);
  }
  // When copy fallback is used, each entry is an independent copy — that is
  // the intended behaviour; no further assertion is needed.
});

test('--copy produces real copies instead of symlinks', (t) => {
  const tempDir = createTempProject(t);
  const { status } = runCli(['install', '--skills-only', '--copy'], tempDir);
  assert.equal(status, 0);

  const link = path.join(tempDir, '.github', 'skills', 'domain-driven-design');
  const stat = fs.lstatSync(link);
  assert.ok(!stat.isSymbolicLink(), '.github/skills entry should be a real directory with --copy');
  assert.ok(fs.existsSync(path.join(link, 'SKILL.md')), 'copied skill should contain SKILL.md');
});

test('--skills-only --stack react filters the canonical store', (t) => {
  const tempDir = createTempProject(t);
  const { status } = runCli(['install', '--skills-only', '--stack', 'react'], tempDir);
  assert.equal(status, 0);

  const canonical = path.join(tempDir, '.agents', 'skills');
  assert.ok(fs.existsSync(path.join(canonical, 'component-architecture')), 'react skill should be present');
  assert.ok(!fs.existsSync(path.join(canonical, 'plugin-creation')), 'wordpress skill should be excluded');
});

test('--skills-only --dry-run does not create skills or symlinks', (t) => {
  const tempDir = createTempProject(t);
  const { status, stdout } = runCli(['install', '--skills-only', '--dry-run'], tempDir);

  assert.equal(status, 0);
  assert.match(stdout, /Dry run complete/);
  assert.ok(!fs.existsSync(path.join(tempDir, '.agents')), '.agents should not exist in dry-run');
  assert.ok(!fs.existsSync(path.join(tempDir, '.github', 'skills')), '.github/skills should not exist in dry-run');
});

test('help shows --copy option', () => {
  const { status, stdout } = runCli(['help'], process.cwd());
  assert.equal(status, 0);
  assert.match(stdout, /--copy/);
});

// ─── Lockfile tests ───────────────────────────────────────────────────────────

test('install writes agents-toolkit-lock.json', (t) => {
  const tempDir = createTempProject(t);
  const { status } = runCli(['install', '--skills-only'], tempDir);

  assert.equal(status, 0);
  const lockPath = path.join(tempDir, 'agents-toolkit-lock.json');
  assert.ok(fs.existsSync(lockPath), 'agents-toolkit-lock.json should be created');

  const lock = JSON.parse(fs.readFileSync(lockPath, 'utf-8'));
  assert.equal(lock.version, 1);
  assert.ok(typeof lock.packageVersion === 'string', 'packageVersion should be a string');
  assert.ok(typeof lock.config === 'object', 'config should be present');
  assert.ok(typeof lock.skills === 'object', 'skills should be present');
  assert.ok(Object.keys(lock.skills).length > 0, 'at least one skill should be recorded');

  const firstSkill = Object.values(lock.skills)[0];
  assert.equal(firstSkill.source, '@silverassist/agents-toolkit');
  assert.ok(typeof firstSkill.computedHash === 'string', 'computedHash should be a string');
  assert.ok(firstSkill.computedHash.length === 64, 'computedHash should be a 64-char hex SHA-256');
  assert.ok(Array.isArray(firstSkill.agents), 'agents should be an array');
});

test('install --dry-run does not write agents-toolkit-lock.json', (t) => {
  const tempDir = createTempProject(t);
  runCli(['install', '--skills-only', '--dry-run'], tempDir);

  const lockPath = path.join(tempDir, 'agents-toolkit-lock.json');
  assert.ok(!fs.existsSync(lockPath), 'agents-toolkit-lock.json should NOT be created during dry-run');
});

test('install --global does not write agents-toolkit-lock.json', (t) => {
  const tempDir = createTempProject(t);
  // Use a fake HOME so global install doesn't touch the real home dir.
  const fakeHome = path.join(tempDir, 'fake-home');
  fs.mkdirSync(fakeHome, { recursive: true });

  const result = spawnSync(process.execPath, [CLI_PATH, 'install', '--global', '--skills-only'], {
    cwd: tempDir,
    encoding: 'utf-8',
    env: { ...process.env, HOME: fakeHome },
  });
  assert.equal(result.status, 0, `global install failed:\n${result.stderr}`);

  const lockPath = path.join(tempDir, 'agents-toolkit-lock.json');
  assert.ok(!fs.existsSync(lockPath), 'agents-toolkit-lock.json should NOT be created for global installs');
});

test('restore recreates skills from lockfile', (t) => {
  if (!symlinkSupported(os.tmpdir())) {
    t.skip('symlinks not supported on this platform');
    return;
  }

  const tempDir = createTempProject(t);

  // 1. Install to create lockfile and skills.
  const installResult = runCli(['install', '--skills-only'], tempDir);
  assert.equal(installResult.status, 0);

  const lockPath = path.join(tempDir, 'agents-toolkit-lock.json');
  assert.ok(fs.existsSync(lockPath), 'lockfile should exist after install');

  // 2. Delete the canonical skills store (simulating a fresh clone).
  const agentsSkillsDir = path.join(tempDir, '.agents', 'skills');
  fs.rmSync(agentsSkillsDir, { recursive: true, force: true });
  assert.ok(!fs.existsSync(agentsSkillsDir), '.agents/skills should be deleted');

  // 3. Restore from lockfile.
  const restoreResult = runCli(['restore'], tempDir);
  assert.equal(restoreResult.status, 0, `restore failed:\n${restoreResult.stdout}\n${restoreResult.stderr}`);
  assert.match(restoreResult.stdout, /Restored/);

  // 4. Skills should be back.
  assert.ok(fs.existsSync(agentsSkillsDir), '.agents/skills should be recreated after restore');
});

test('restore exits 1 when lockfile is missing', (t) => {
  const tempDir = createTempProject(t);
  const { status, stdout } = runCli(['restore'], tempDir);

  assert.equal(status, 1);
  assert.match(stdout, /agents-toolkit-lock\.json/);
});

test('status exits 0 when all skills are up-to-date', (t) => {
  const tempDir = createTempProject(t);
  const installResult = runCli(['install', '--skills-only'], tempDir);
  assert.equal(installResult.status, 0, `install failed:\n${installResult.stdout}`);

  const { status, stdout } = runCli(['status'], tempDir);
  assert.equal(status, 0, `status should exit 0:\n${stdout}`);
  assert.match(stdout, /up-to-date/);
});

test('status exits 1 when a skill is missing', (t) => {
  const tempDir = createTempProject(t);
  const installResult = runCli(['install', '--skills-only'], tempDir);
  assert.equal(installResult.status, 0, `install failed:\n${installResult.stdout}`);

  // Delete one skill from the canonical store.
  const agentsSkillsDir = path.join(tempDir, '.agents', 'skills');
  const skills = fs.readdirSync(agentsSkillsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
  assert.ok(skills.length > 0, 'at least one skill should exist');
  fs.rmSync(path.join(agentsSkillsDir, skills[0]), { recursive: true, force: true });

  const { status, stdout } = runCli(['status'], tempDir);
  assert.equal(status, 1, 'status should exit 1 when a skill is missing');
  assert.match(stdout, /missing/);
});

test('status exits 1 when a skill is modified', (t) => {
  const tempDir = createTempProject(t);
  const installResult = runCli(['install', '--skills-only'], tempDir);
  assert.equal(installResult.status, 0, `install failed:\n${installResult.stdout}`);

  // Modify one skill's SKILL.md in the canonical store.
  const agentsSkillsDir = path.join(tempDir, '.agents', 'skills');
  const skills = fs.readdirSync(agentsSkillsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);
  assert.ok(skills.length > 0, 'at least one skill should exist');
  const skillMdPath = path.join(agentsSkillsDir, skills[0], 'SKILL.md');
  fs.appendFileSync(skillMdPath, '\n<!-- modified -->');

  const { status, stdout } = runCli(['status'], tempDir);
  assert.equal(status, 1, 'status should exit 1 when a skill is modified');
  assert.match(stdout, /modified/);
});

test('status exits 1 when lockfile is missing', (t) => {
  const tempDir = createTempProject(t);
  const { status, stdout } = runCli(['status'], tempDir);

  assert.equal(status, 1);
  assert.match(stdout, /agents-toolkit-lock\.json/);
});

test('help shows restore and status commands', () => {
  const { status, stdout } = runCli(['help'], process.cwd());
  assert.equal(status, 0);
  assert.match(stdout, /restore/);
  assert.match(stdout, /status/);
});

test('install appends managed paths to .gitignore', (t) => {
  const tempDir = createTempProject(t);
  // Create a minimal .gitignore that does not contain the managed paths.
  fs.writeFileSync(path.join(tempDir, '.gitignore'), 'node_modules/\n');

  const { status } = runCli(['install', '--skills-only'], tempDir);
  assert.equal(status, 0);

  const gitignore = fs.readFileSync(path.join(tempDir, '.gitignore'), 'utf-8');
  assert.ok(gitignore.includes('.agents/skills/'), '.gitignore should contain .agents/skills/');
  assert.ok(gitignore.includes('.github/skills/'), '.gitignore should contain .github/skills/');
  assert.ok(gitignore.includes('.claude/skills/'), '.gitignore should contain .claude/skills/');
});

test('install does not duplicate .gitignore entries on re-run', (t) => {
  const tempDir = createTempProject(t);

  const r1 = runCli(['install', '--skills-only'], tempDir);
  assert.equal(r1.status, 0, `first install failed:\n${r1.stdout}`);

  const r2 = runCli(['install', '--skills-only', '--force'], tempDir);
  assert.equal(r2.status, 0, `second install (--force) failed:\n${r2.stdout}`);

  const gitignore = fs.readFileSync(path.join(tempDir, '.gitignore'), 'utf-8');
  const count = (gitignore.match(/\.agents\/skills\//g) || []).length;
  assert.equal(count, 1, '.agents/skills/ should appear exactly once in .gitignore');
});

test('successive installs to multiple targets accumulate lockfile entries', (t) => {
  if (!symlinkSupported(os.tmpdir())) {
    t.skip('symlinks not supported on this platform');
    return;
  }

  const tempDir = createTempProject(t);

  // First install: copilot target (writes .github/skills entries).
  const r1 = runCli(['install', '--skills-only'], tempDir);
  assert.equal(r1.status, 0, `first install failed:\n${r1.stdout}`);

  // Second install: claude target (should merge, not overwrite).
  const r2 = runCli(['install', '--target', 'claude', '--skills-only'], tempDir);
  assert.equal(r2.status, 0, `second install failed:\n${r2.stdout}`);

  const lockPath = path.join(tempDir, 'agents-toolkit-lock.json');
  const lock = JSON.parse(fs.readFileSync(lockPath, 'utf-8'));

  // Every skill should have BOTH .github/skills and .claude/skills in its agents array.
  for (const [name, meta] of Object.entries(lock.skills)) {
    assert.ok(
      meta.agents.some(a => a.includes('.github')),
      `skill "${name}" should have a .github/skills agent entry after copilot install`
    );
    assert.ok(
      meta.agents.some(a => a.includes('.claude')),
      `skill "${name}" should have a .claude/skills agent entry after claude install`
    );
  }
});

// ─── #31: TSDoc standards + GitHub review management ───────────────────────────

test('tsdoc-standards instruction + skill install for react stack, not wordpress', (t) => {
  const tempDir = createTempProject(t);

  const react = runCli(['install', '--dry-run', '--stack', 'react'], tempDir);
  assert.equal(react.status, 0, react.stderr);
  assert.match(react.stdout, /tsdoc-standards\.instructions\.md/);
  // Assert the skill's canonical SKILL.md explicitly — /tsdoc-standards/ alone
  // is already satisfied by the instruction file, so it would pass even if the
  // skill were not installed.
  assert.match(react.stdout, /tsdoc-standards[\\/]SKILL\.md/);

  const wordpress = runCli(['install', '--dry-run', '--stack', 'wordpress'], tempDir);
  assert.equal(wordpress.status, 0, wordpress.stderr);
  assert.doesNotMatch(wordpress.stdout, /tsdoc-standards\.instructions\.md/);
  assert.doesNotMatch(wordpress.stdout, /tsdoc-standards[\\/]SKILL\.md/);
});

test('resolve-github-reviews prompt is included for --tracker github, excluded for --tracker jira', (t) => {
  const tempDir = createTempProject(t);

  const github = runCli(['install', '--dry-run', '--tracker', 'github'], tempDir);
  assert.equal(github.status, 0, github.stderr);
  assert.match(github.stdout, /resolve-github-reviews\.prompt\.md/);

  const jira = runCli(['install', '--dry-run', '--tracker', 'jira'], tempDir);
  assert.equal(jira.status, 0, jira.stderr);
  assert.doesNotMatch(jira.stdout, /resolve-github-reviews\.prompt\.md/);
});

test('github-review-management skill is included for --tracker github, excluded for --tracker jira', (t) => {
  const tempDir = createTempProject(t);

  const github = runCli(['install', '--dry-run', '--tracker', 'github'], tempDir);
  assert.equal(github.status, 0, github.stderr);
  assert.match(github.stdout, /github-review-management/);

  const jira = runCli(['install', '--dry-run', '--tracker', 'jira'], tempDir);
  assert.equal(jira.status, 0, jira.stderr);
  assert.doesNotMatch(jira.stdout, /github-review-management/);
});

// ─── #35: Pre-review core-review skill ─────────────────────────────────────────

test('core-review skill is included for --tracker github, excluded for --tracker jira', (t) => {
  const tempDir = createTempProject(t);

  const github = runCli(['install', '--dry-run', '--tracker', 'github'], tempDir);
  assert.equal(github.status, 0, github.stderr);
  // Assert the skill's canonical SKILL.md explicitly (Windows-safe separator) so the match
  // cannot be satisfied by an unrelated path that merely contains "core-review".
  assert.match(github.stdout, /core-review[\\/]SKILL\.md/);

  const jira = runCli(['install', '--dry-run', '--tracker', 'jira'], tempDir);
  assert.equal(jira.status, 0, jira.stderr);
  assert.doesNotMatch(jira.stdout, /core-review[\\/]SKILL\.md/);
});

// ─── #39 M3: Copilot → Claude model: frontmatter remap ────────────────────────

test('claude install remaps cheap-tier Copilot model to `haiku` alias', (t) => {
  const tempDir = createTempProject(t);
  const { status, stderr } = runCli(['install', '--target', 'claude', '--prompts-only'], tempDir);
  assert.equal(status, 0, stderr);

  const file = path.join(tempDir, '.claude', 'commands', 'quality-check.md');
  const content = fs.readFileSync(file, 'utf-8');

  assert.match(content, /^---\nmodel: haiku\n---\n\n/, 'expected haiku alias frontmatter');
  assert.doesNotMatch(content, /Claude Haiku 4\.5 \(copilot\)/, 'Copilot vendor name must not leak into Claude commands');
  assert.doesNotMatch(content, /GPT-5 mini \(copilot\)/, 'GPT-5 fallback must be dropped for Claude');
  assert.doesNotMatch(content, /^agent:/m, 'Copilot-only `agent:` field must be stripped');
  assert.doesNotMatch(content, /^tools:/m, 'Copilot-only `tools:` field must be stripped');
});

test('claude install remaps smart-tier Copilot model to `sonnet` alias', (t) => {
  const tempDir = createTempProject(t);
  const { status, stderr } = runCli(['install', '--target', 'claude', '--prompts-only'], tempDir);
  assert.equal(status, 0, stderr);

  const file = path.join(tempDir, '.claude', 'commands', 'create-plan.md');
  const content = fs.readFileSync(file, 'utf-8');

  assert.match(content, /^---\nmodel: sonnet\n---\n\n/, 'expected sonnet alias frontmatter');
  assert.doesNotMatch(content, /Claude Sonnet 5 \(copilot\)/, 'Copilot vendor name must not leak into Claude commands');
});

test('every shipped prompt pins `model:` as a scalar, never a list', () => {
  // A prioritized array is undocumented for .prompt.md files and GitHub Copilot
  // CLI rejects it outright ("model: Expected string, received array"). If the
  // array form silently loses, the prompt falls back to the picker and the whole
  // cost optimization becomes a no-op — so guard the scalar form here.
  const dir = path.join(process.cwd(), 'templates', 'shared', 'prompts');
  const prompts = fs.readdirSync(dir).filter((f) => f.endsWith('.prompt.md'));
  assert.ok(prompts.length > 0, 'expected shipped prompts');

  for (const name of prompts) {
    const content = fs.readFileSync(path.join(dir, name), 'utf-8');
    assert.match(content, /^model: \S[^\n]*$/m, `${name} must carry a scalar model: pin`);
    assert.doesNotMatch(content, /^model:[ \t]*\n[ \t]*-/m, `${name} must not use the array model: form`);
  }
});

test('copilot install ships the prompt pin verbatim', (t) => {
  const tempDir = createTempProject(t);
  const { status, stderr } = runCli(['install', '--prompts-only'], tempDir);
  assert.equal(status, 0, stderr);

  // No transform runs on the Copilot path any more — the installed file must be
  // byte-identical to the shipped template.
  const installed = fs.readFileSync(path.join(tempDir, '.github', 'prompts', 'quality-check.prompt.md'), 'utf-8');
  const shipped = fs.readFileSync(path.join(process.cwd(), 'templates', 'shared', 'prompts', 'quality-check.prompt.md'), 'utf-8');
  assert.equal(installed, shipped, 'copilot prompts must install byte-identical to the template');
  assert.match(installed, /^model: Claude Haiku 4\.5 \(copilot\)$/m, 'cheap tier pin must survive');
});

test('claude install preserves the > **Model:** blockquote body text', (t) => {
  const tempDir = createTempProject(t);
  const { status, stderr } = runCli(['install', '--target', 'claude', '--prompts-only'], tempDir);
  assert.equal(status, 0, stderr);

  const content = fs.readFileSync(path.join(tempDir, '.claude', 'commands', 'quality-check.md'), 'utf-8');
  assert.match(content, /> \*\*Model:\*\* Cheap tier/, 'body-level model note must survive the transform');
});

// ─── #39: agent overrides + --budget ─────────────────────────────────────────

test('help shows --no-agent-overrides and no model-selection flags', () => {
  const { status, stdout } = runCli(['help'], process.cwd());
  assert.equal(status, 0);
  assert.match(stdout, /--no-agent-overrides/);
  // Model pins are hardcoded in the templates; there is no CLI surface for them.
  assert.doesNotMatch(stdout, /--model-pins/);
});

test('claude install copies Explore subagent override by default', (t) => {
  const tempDir = createTempProject(t);
  const { status, stderr } = runCli(['install', '--target', 'claude', '--prompts-only'], tempDir);
  assert.equal(status, 0, stderr);

  const explorePath = path.join(tempDir, '.claude', 'agents', 'Explore.md');
  assert.ok(fs.existsSync(explorePath), 'Explore.md must exist at .claude/agents/Explore.md');
  const content = fs.readFileSync(explorePath, 'utf-8');
  assert.match(content, /^---\n[\s\S]*?name: Explore/, 'Explore.md must keep its Claude subagent frontmatter');
  assert.match(content, /model: haiku/, 'Explore override must pin cheap tier');
});

test('--no-agent-overrides skips .claude/agents/ install', (t) => {
  const tempDir = createTempProject(t);
  const { status, stderr } = runCli(['install', '--target', 'claude', '--prompts-only', '--no-agent-overrides'], tempDir);
  assert.equal(status, 0, stderr);

  const agentsDir = path.join(tempDir, '.claude', 'agents');
  assert.equal(fs.existsSync(agentsDir), false, '.claude/agents/ must not be created with --no-agent-overrides');
});

test('core-review skill ships model: haiku and --budget hint', () => {
  const skillPath = path.join(process.cwd(), 'templates', 'shared', 'skills', 'core-review', 'SKILL.md');
  const content = fs.readFileSync(skillPath, 'utf-8');
  assert.match(content, /^model: haiku$/m, 'core-review must pin the cheap tier for Claude');
  assert.match(content, /argument-hint: --budget quick\|medium\|thorough/, 'core-review must advertise the --budget argument');
  assert.match(content, /## `--budget \{quick,medium,thorough\}`/, 'core-review must document the budget scoping');
});

test('orchestrator prompts pass explicit --budget to core-review', () => {
  const preview = (name) => fs.readFileSync(path.join(process.cwd(), 'templates', 'shared', 'prompts', name), 'utf-8');
  assert.match(preview('create-github-pr.prompt.md'), /`core-review` skill[\s\S]*?`--budget medium`/, 'create-github-pr must pass --budget medium');
  assert.match(preview('finalize-github-pr.prompt.md'), /`core-review` skill[\s\S]*?`--budget quick`/, 'finalize-github-pr must pass --budget quick');
  assert.match(preview('resolve-github-reviews.prompt.md'), /`core-review` skill[\s\S]*?`--budget quick`/, 'resolve-github-reviews must pass --budget quick');
});

// ─── Planning-doc removal: the shipped shell block must not eat other docs ────

/**
 * Extract the first fenced bash block that contains the planning-doc removal
 * logic from a shipped prompt.
 * @param {string} promptName - File name under templates/shared/prompts
 * @returns {string} The bash source
 */
function planDocBlock(promptName) {
  const content = fs.readFileSync(path.join(process.cwd(), 'templates', 'shared', 'prompts', promptName), 'utf-8');
  // Scan each fenced block separately — a single regex spanning the file would
  // glue several blocks (and the prose between them) into one script.
  const blocks = [...content.matchAll(/```bash\n((?:(?!```)[\s\S])*)```/g)].map((m) => m[1]);
  const block = blocks.find((b) => b.includes('-plan.md') && b.includes('git rm'));
  assert.ok(block, `${promptName} must ship a bash block that removes *-plan.md`);
  return block;
}

const bashAvailable = spawnSync('bash', ['-c', 'command -v git'], { encoding: 'utf-8' }).status === 0;

for (const promptName of ['create-pr.prompt.md', 'create-github-pr.prompt.md']) {
  test(`${promptName} plan-doc removal spares unrelated docs and survives spaces`, { skip: !bashAvailable && 'bash/git unavailable' }, (t) => {
    const repo = createTempProject(t);
    const git = (...args) => spawnSync('git', args, { cwd: repo, encoding: 'utf-8' });

    git('init', '-q', '.');
    git('config', 'user.email', 'test@example.com');
    git('config', 'user.name', 'Test');
    fs.mkdirSync(path.join(repo, 'docs', 'nested'), { recursive: true });
    fs.writeFileSync(path.join(repo, 'docs', 'pre-existing-plan.md'), 'old\n');
    git('add', '-A');
    git('commit', '-qm', 'base');
    git('branch', '-M', 'main');
    git('checkout', '-qb', 'feat');

    // "explanation" and "planet" both contain the substring "plan" — a
    // `*plan*.md` glob would delete them. A path with a space word-splits under
    // xargs and aborts the whole `git rm`, leaving the real plan doc behind.
    for (const name of ['explanation.md', 'planet.md', 'auth-plan.md', 'my feature-plan.md']) {
      fs.writeFileSync(path.join(repo, 'docs', name), 'x\n');
    }
    fs.writeFileSync(path.join(repo, 'docs', 'nested', 'deep-plan.md'), 'x\n');
    git('add', '-A');
    git('commit', '-qm', 'add docs');

    // The block references $BASE_BRANCH, set by an earlier step in the prompt.
    // create-pr's block also commits, which needs the identity configured above.
    const script = `set -e\nBASE_BRANCH=main\n${planDocBlock(promptName)}`;
    const run = spawnSync('bash', ['-c', script], { cwd: repo, encoding: 'utf-8' });
    assert.equal(run.status, 0, `block failed: ${run.stderr}`);

    const exists = (...p) => fs.existsSync(path.join(repo, 'docs', ...p));
    assert.ok(exists('explanation.md'), 'explanation.md must survive — it only contains the substring "plan"');
    assert.ok(exists('planet.md'), 'planet.md must survive');
    assert.ok(exists('pre-existing-plan.md'), 'a plan doc that predates the branch must survive');
    assert.ok(!exists('auth-plan.md'), 'the branch-added plan doc must be removed');
    assert.ok(!exists('my feature-plan.md'), 'a plan doc whose path contains a space must be removed');
    assert.ok(!exists('nested', 'deep-plan.md'), 'a nested plan doc must be removed');
  });
}
