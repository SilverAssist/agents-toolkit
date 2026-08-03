import fs from 'node:fs';
import path from 'node:path';

import { error, info, success } from '../logger.js';
import { getHomeDir } from '../paths.js';
import type { AgentToolkitConfig, InstallFilters, InstallOptions, InstallResult, InstallScope } from '../types.js';

/**
 * Default config.
 *
 * @remarks TODO(tsdoc): verify this generated summary.
 */
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

function loadConfig(configPath: string): AgentToolkitConfig | null {
  if (!fs.existsSync(configPath)) return null;
  try {
    const raw: unknown = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    if (typeof raw !== 'object' || raw === null) return null;
    return raw as AgentToolkitConfig;
  } catch {
    return null;
  }
}

/**
 * Resolves the filters.
 *
 * @remarks TODO(tsdoc): verify this generated summary.
 *
 * @param options - TODO(tsdoc): describe options.
 * @returns TODO(tsdoc): describe the return value.
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
 * Gets the install scope.
 *
 * @remarks TODO(tsdoc): verify this generated summary.
 *
 * @param options - TODO(tsdoc): describe options.
 * @returns TODO(tsdoc): describe the return value.
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
 * Gets the change count.
 *
 * @remarks TODO(tsdoc): verify this generated summary.
 *
 * @param result - TODO(tsdoc): describe result.
 * @param dryRun - TODO(tsdoc): describe dryRun.
 * @returns TODO(tsdoc): describe the return value.
 */
export function getChangeCount(result: InstallResult, dryRun: boolean): number {
  return dryRun ? result.planned : result.written;
}

/**
 * Ensure config file.
 *
 * @remarks TODO(tsdoc): verify this generated summary.
 *
 * @param options - TODO(tsdoc): describe options (optional).
 * @returns TODO(tsdoc): describe the return value.
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
