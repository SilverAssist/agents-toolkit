import path from 'node:path';

/** Returns the user home directory, compatible with macOS, Linux, and Windows. */
export function getHomeDir(): string {
  return process.env['HOME'] || process.env['USERPROFILE'] || '';
}

/** Returns the Copilot install target: `.github/` (project) or `~/.copilot/` (global). */
export function getTargetDir(global = false): string {
  return global ? path.join(getHomeDir(), '.copilot') : path.join(process.cwd(), '.github');
}

/** Returns the Claude Code install target: `.claude/` (project) or `~/.claude/` (global). */
export function getClaudeTargetDir(global = false): string {
  return global ? path.join(getHomeDir(), '.claude') : path.join(process.cwd(), '.claude');
}

/** Returns the canonical skills dir per the `npx skills` standard. */
export function getAgentsSkillsDir(global = false): string {
  const base = global ? getHomeDir() : process.cwd();
  return path.join(base, '.agents', 'skills');
}
