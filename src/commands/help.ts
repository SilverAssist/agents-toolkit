import { log, error } from '../logger.js';
import type { InstallOptions } from '../types.js';

/** Prints the CLI help text to stdout. */
export function showHelp(): void {
  log('\n📦 Agents Toolkit\n', 'bright');
  console.log('Usage: agents-toolkit <command> [options]\n');

  log('Commands:', 'cyan');
  console.log('  install     Install prompts (default target: copilot)');
  console.log('  restore     Restore skills from agents-toolkit-lock.json');
  console.log('  status      Check if installed skills match the lockfile');
  console.log('  update      Update existing prompts and refresh the lockfile');
  console.log('  list        List available prompts');
  console.log('  help        Show this help message');

  console.log('');
  log('Options:', 'cyan');
  console.log('  --force, -f         Overwrite existing files');
  console.log('  --global, -g        Install to ~/.copilot/ (user-level, all projects)');
  console.log('  --target <name>     Target installer: copilot | claude | codex');
  console.log('  --stack <name>      Filter by stack: react | wordpress | all (default: all)');
  console.log('  --tracker <name>    Filter by tracker: jira | github | all (default: all)');
  console.log('  --claude            Install for Claude Code (.claude/commands/ + CLAUDE.md)');
  console.log('  --codex             Install for Codex (AGENTS.md + shared .github files)');
  console.log('  --append            Append missing AGENTS.md sections instead of overwriting');
  console.log('  --prompts-only      Only install prompts (no instructions/skills)');
  console.log('  --instructions-only Only install instructions');
  console.log('  --partials-only     Only install partials');
  console.log('  --skills-only       Only install skills');
  console.log('  --hooks-only        Only install hooks (PostToolUse validation scripts)');
  console.log('  --copy              Copy skills instead of symlinking to .agents/skills/');
  console.log('  --no-agent-overrides  Skip installing agent overrides (.claude/agents/ and .github/agents/)');
  console.log('  --dry-run           Show what would be installed');

  console.log('');
  log('Examples:', 'cyan');
  console.log('  npx agents-toolkit install                          # All content to .github/');
  console.log('  npx agents-toolkit install --global                 # All content to ~/.copilot/');
  console.log('  npx agents-toolkit install --global --stack react   # React only to ~/.copilot/');
  console.log('  npx agents-toolkit install --stack react            # React/TS only');
  console.log('  npx agents-toolkit install --stack wordpress        # PHP/WordPress only');
  console.log('  npx agents-toolkit install --tracker github         # GitHub Issues workflow');
  console.log('  npx agents-toolkit install --tracker jira           # Jira workflow');
  console.log('  npx agents-toolkit install --target codex');
  console.log('  npx agents-toolkit install --target=claude');
  console.log('  npx agents-toolkit install --force');
  console.log('  npx agents-toolkit install --append --instructions-only');
  console.log('  npx agents-toolkit install --claude --force');
  console.log('  npx agents-toolkit install --codex --force');
  console.log('  npx agents-toolkit install --prompts-only');
  console.log('  npx agents-toolkit list');
  console.log('');
}

/**
 * Parses `process.argv` into a command name and install options.
 *
 * @returns The command name and the full set of parsed option flags.
 */
export function parseArgs(): { command: string; options: InstallOptions } {
  const args = process.argv.slice(2);
  const command = args[0] ?? 'help';
  const flags = args.slice(1);

  let target: string | null = null;
  let stack: string | null = null;
  let tracker: string | null = null;

  for (let i = 0; i < flags.length; i++) {
    const arg = flags[i];
    if (arg === undefined) break;

    if (arg === '--target') {
      const value = flags[i + 1];
      if (value !== undefined && !value.startsWith('-')) {
        target = value;
        i++;
      } else {
        target = '';
      }
    } else if (arg.startsWith('--target=')) {
      target = arg.split('=').slice(1).join('=');
    } else if (arg === '--stack') {
      const value = flags[i + 1];
      if (value !== undefined && !value.startsWith('-')) {
        stack = value;
        i++;
      } else {
        stack = '';
      }
    } else if (arg.startsWith('--stack=')) {
      stack = arg.split('=').slice(1).join('=');
    } else if (arg === '--tracker') {
      const value = flags[i + 1];
      if (value !== undefined && !value.startsWith('-')) {
        tracker = value;
        i++;
      } else {
        tracker = '';
      }
    } else if (arg.startsWith('--tracker=')) {
      tracker = arg.split('=').slice(1).join('=');
    }
  }

  const options: InstallOptions = {
    force: flags.includes('--force') || flags.includes('-f'),
    global: flags.includes('--global') || flags.includes('-g'),
    promptsOnly: flags.includes('--prompts-only'),
    partialsOnly: flags.includes('--partials-only'),
    skillsOnly: flags.includes('--skills-only'),
    instructionsOnly: flags.includes('--instructions-only'),
    hooksOnly: flags.includes('--hooks-only'),
    dryRun: flags.includes('--dry-run'),
    copy: flags.includes('--copy'),
    claude: flags.includes('--claude'),
    codex: flags.includes('--codex'),
    append: flags.includes('--append'),
    noAgentOverrides: flags.includes('--no-agent-overrides'),
    target,
    stack,
    tracker,
  };

  return { command, options };
}

/**
 * Resolves the install target from `--target`, `--claude`, or `--codex` flags.
 *
 * @param options - The parsed flag subset that specifies the target.
 * @returns The resolved target string (`'copilot'`, `'claude'`, or `'codex'`). Exits on conflicts.
 */
export function resolveInstallTarget(options: Pick<InstallOptions, 'claude' | 'codex' | 'target'>): string {
  const legacyTargets: string[] = [];
  if (options.claude) legacyTargets.push('claude');
  if (options.codex) legacyTargets.push('codex');

  let explicitTarget: string | null = null;
  if (options.target !== null) {
    explicitTarget = options.target.trim().toLowerCase();
    if (!explicitTarget) {
      error('Missing value for --target. Use copilot, claude, or codex.');
      process.exit(1);
    }
    if (!['copilot', 'claude', 'codex'].includes(explicitTarget)) {
      error(`Invalid --target value: ${options.target}. Use copilot, claude, or codex.`);
      process.exit(1);
    }
  }

  if (legacyTargets.length > 1) {
    error('Use either --claude or --codex, not both.');
    process.exit(1);
  }

  const legacyTarget = legacyTargets[0];
  if (explicitTarget !== null && legacyTarget !== undefined && legacyTarget !== explicitTarget) {
    error(`Conflicting target flags: --target ${explicitTarget} and --${legacyTarget}.`);
    process.exit(1);
  }

  if (explicitTarget !== null) return explicitTarget;
  if (legacyTarget !== undefined) return legacyTarget;
  return 'copilot';
}
