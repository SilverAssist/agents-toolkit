import fs from 'node:fs';
import path from 'node:path';

import { error, info, success } from '../logger.js';
import { getHomeDir } from '../paths.js';
import type { AgentToolkitConfig, InstallFilters, InstallOptions, InstallResult, InstallScope } from '../types.js';

/** Default values written to `.agents-toolkit.json` on first install. */
export const DEFAULT_CONFIG: AgentToolkitConfig = {
  stack: 'all',
  tracker: 'all',
  jira: {
    projectKey: 'PROJECT',
    baseUrl: 'https://your-org.atlassian.net',
  },
  git: {
    defaultBranch: 'dev',
    branchPrefix: {
      feature: 'feature/',
      bugfix: 'bugfix/',
      hotfix: 'hotfix/',
    },
  },
  pr: {
    targetBranch: 'dev',
    template: 'default',
  },
};

const VALID_STACKS = new Set(['react', 'wordpress', 'all']);
const VALID_TRACKERS = new Set(['jira', 'github', 'all']);

function loadConfig(configPath: string): AgentToolkitConfig | null {
  if (!fs.existsSync(configPath)) return null;
  try {
    const raw: unknown = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    if (typeof raw !== 'object' || raw === null) return null;
    const obj = raw as Record<string, unknown>;
    // Reject invalid enum values so a typo silently behaves like 'all'.
    const stack = obj['stack'];
    if (stack !== undefined && (typeof stack !== 'string' || !VALID_STACKS.has(stack))) return null;
    const tracker = obj['tracker'];
    if (tracker !== undefined && (typeof tracker !== 'string' || !VALID_TRACKERS.has(tracker))) return null;
    return raw as AgentToolkitConfig;
  } catch {
    return null;
  }
}

/**
 * Resolves the active stack and tracker filters.
 *
 * @remarks
 * Resolution order: CLI flags → project `.agents-toolkit.json` → global `~/.agents-toolkit.json` → defaults.
 * Exits with an error message when a CLI flag value is not a recognised enum value.
 *
 * @param options - CLI flags that override config-file values.
 * @returns Resolved `stack` and `tracker` strings.
 */
export function resolveFilters(options: Pick<InstallOptions, 'stack' | 'tracker'>): InstallFilters {
  const validStacks = ['react', 'wordpress', 'all'] as const;
  const validTrackers = ['jira', 'github', 'all'] as const;

  let stack = 'all';
  let tracker = 'all';

  const globalConfig = loadConfig(path.join(getHomeDir(), '.agents-toolkit.json'));
  if (globalConfig?.stack) stack = globalConfig.stack;
  if (globalConfig?.tracker) tracker = globalConfig.tracker;

  const projectConfig = loadConfig(path.join(process.cwd(), '.agents-toolkit.json'));
  if (projectConfig?.stack) stack = projectConfig.stack;
  if (projectConfig?.tracker) tracker = projectConfig.tracker;

  if (options.stack !== null) {
    const value = options.stack.trim().toLowerCase();
    if (!value) {
      error('Missing value for --stack. Use react, wordpress, or all.');
      process.exit(1);
    }
    if (!(validStacks as readonly string[]).includes(value)) {
      error(`Invalid --stack value: ${options.stack}. Use react, wordpress, or all.`);
      process.exit(1);
    }
    stack = value;
  }

  if (options.tracker !== null) {
    const value = options.tracker.trim().toLowerCase();
    if (!value) {
      error('Missing value for --tracker. Use jira, github, or all.');
      process.exit(1);
    }
    if (!(validTrackers as readonly string[]).includes(value)) {
      error(`Invalid --tracker value: ${options.tracker}. Use jira, github, or all.`);
      process.exit(1);
    }
    tracker = value;
  }

  return { stack, tracker };
}

/**
 * Derives which content categories to install from the selective install flags.
 *
 * @param options - The subset of `InstallOptions` flags that select content categories.
 * @returns Booleans indicating whether each category should be installed.
 */
export function getInstallScope(
  options: Partial<
    Pick<InstallOptions, 'promptsOnly' | 'partialsOnly' | 'skillsOnly' | 'instructionsOnly' | 'hooksOnly'>
  >,
): InstallScope {
  const {
    promptsOnly = false,
    partialsOnly = false,
    skillsOnly = false,
    instructionsOnly = false,
    hooksOnly = false,
  } = options;
  const hasSpecificFlag = promptsOnly || partialsOnly || skillsOnly || instructionsOnly || hooksOnly;

  return {
    shouldInstallPrompts: !hasSpecificFlag || promptsOnly || partialsOnly,
    shouldInstallInstructions: !hasSpecificFlag || instructionsOnly,
    shouldInstallSkills: !hasSpecificFlag || skillsOnly,
    shouldInstallHooks: !hasSpecificFlag || hooksOnly,
  };
}

/**
 * Returns the relevant change count for the active mode.
 *
 * @param result - An install result with `planned` and `written` counts.
 * @param dryRun - When `true`, returns planned changes; otherwise actual written count.
 * @returns The change count to display or accumulate.
 */
export function getChangeCount(result: InstallResult, dryRun: boolean): number {
  return dryRun ? result.planned : result.written;
}

/**
 * Creates `.agents-toolkit.json` with default values if it does not already exist.
 *
 * @param options - `dryRun` previews without writing; `global` targets `~/` instead of `process.cwd()`.
 * @returns Install result indicating whether a config file was created.
 */
export function ensureConfigFile(options: { dryRun?: boolean; global?: boolean } = {}): InstallResult {
  const { dryRun = false, global: isGlobal = false } = options;
  const configDir = isGlobal ? getHomeDir() : process.cwd();
  const configPath = path.join(configDir, '.agents-toolkit.json');

  if (fs.existsSync(configPath)) {
    return { written: 0, planned: 0 };
  }

  if (dryRun) {
    info(`Would create ${isGlobal ? '~' : '.'}/.agents-toolkit.json`);
    return { written: 0, planned: 1 };
  }

  fs.writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2));
  success(`Created ${isGlobal ? '~' : '.'}/.agents-toolkit.json config file`);
  return { written: 1, planned: 1 };
}
