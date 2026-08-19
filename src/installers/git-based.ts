import path from 'node:path';

import { TEMPLATES_DIR } from '../constants.js';
import { VERSION } from '../index.js';
import { log, info, success, warn } from '../logger.js';
import { getTargetDir } from '../paths.js';
import { appendSkillsToGitignore, copyDir, installSkillsStandard } from '../copy/index.js';
import { getChangeCount, getInstallScope, ensureConfigFile } from '../config/index.js';
import { computeSkillHash, writeLockfile } from '../lockfile/index.js';
import { shouldIncludeFile } from '../filter/index.js';
import { installHooks } from './hooks.js';
import { installCopilotInstructions } from './instructions.js';
import { installAgentsFile } from './agents.js';
import { stripModelAndToolsPins } from '../transforms/index.js';
import type { FileCategoryKey } from '../filter/index.js';
import type { InstallFilters, InstallOptions, SkillMeta } from '../types.js';

type GitBasedTargetOptions = Partial<InstallOptions> & { filters?: InstallFilters };

/**
 * Orchestrates the full Copilot or Codex install: prompts, instructions, skills, hooks,
 * config, subagent overrides, and lockfile write.
 *
 * @param options - Install options including resolved filters, `force`, `dryRun`, and `copy`.
 * @param target - Install target: `'copilot'` (default) or `'codex'`.
 */
export function installGitBasedTarget(options: GitBasedTargetOptions = {}, target = 'copilot'): void {
  const {
    force = false,
    append = false,
    dryRun = false,
    copy = false,
    global: isGlobal = false,
    filters = { stack: 'all', tracker: 'all' },
    noAgentOverrides = false,
  } = options;
  const isCodex = target === 'codex';
  const targetDir = getTargetDir(isGlobal);
  const scope = getInstallScope(options);
  let totalChanges = 0;
  const installedSkillsMap: Record<string, { canonicalDir: string; agents: string[] }> = {};

  const makeFilter =
    (category: FileCategoryKey) =>
    (name: string): boolean => {
      const basename = name.replace(/\.(prompt\.md|instructions\.md|md)$/, '');
      return shouldIncludeFile(basename, category, filters);
    };

  const promptsFilter = makeFilter('prompts');
  const partialsFilter = makeFilter('partials');

  log(
    isCodex
      ? '\n⚡ Codex Installer\n'
      : isGlobal
        ? '\n🌐 Agents Toolkit Global Installer\n'
        : '\n📦 Agents Toolkit Installer\n',
    'bright',
  );

  if (isGlobal) info(`Target: ${targetDir}\n`);
  if (dryRun) info('Dry run mode - no files will be copied\n');

  if (scope.shouldInstallPrompts) {
    info('Installing prompts...');
    const result = copyDir(path.join(TEMPLATES_DIR, 'shared', 'prompts'), path.join(targetDir, 'prompts'), {
      force,
      dryRun,
      filter: promptsFilter,
      partialsFilter,
      transformContent: stripModelAndToolsPins,
    });
    totalChanges += getChangeCount(result, dryRun);
    if (!dryRun && result.written > 0) success(`Installed ${result.written} prompt files`);
  }

  if (scope.shouldInstallInstructions) {
    info('Installing instructions...');
    const result = copyDir(path.join(TEMPLATES_DIR, 'shared', 'instructions'), path.join(targetDir, 'instructions'), {
      force,
      dryRun,
      filter: makeFilter('instructions'),
    });
    totalChanges += getChangeCount(result, dryRun);
    if (!dryRun && result.written > 0) success(`Installed ${result.written} instruction files`);
  }

  if (scope.shouldInstallSkills) {
    info('Installing skills (npx skills standard)...');
    const result = installSkillsStandard({
      isGlobal,
      agentSkillsDir: path.join(targetDir, 'skills'),
      force,
      dryRun,
      copy,
      dirFilter: makeFilter('skills'),
    });
    totalChanges += getChangeCount(result, dryRun);

    for (const [name, meta] of Object.entries(result.installedSkills)) {
      let entry = installedSkillsMap[name];
      if (entry === undefined) {
        entry = { canonicalDir: meta.canonicalDir, agents: [] };
        installedSkillsMap[name] = entry;
      }
      entry.agents.push(path.relative(process.cwd(), path.join(targetDir, 'skills')));
    }

    if (!dryRun && result.written > 0) success(`Installed ${result.written} skill files/links`);
  }

  if (scope.shouldInstallHooks) {
    info('Installing hooks...');
    const hooksResult = installHooks({ targetDir, force, dryRun, global: isGlobal });
    totalChanges += getChangeCount(hooksResult, dryRun);
  }

  totalChanges += getChangeCount(ensureConfigFile({ dryRun, global: isGlobal }), dryRun);

  if (scope.shouldInstallPrompts && !noAgentOverrides && !isCodex && !isGlobal) {
    info('Installing Copilot subagent overrides...');
    const result = copyDir(path.join(TEMPLATES_DIR, 'shared', 'agents'), path.join(targetDir, 'agents'), {
      force,
      dryRun,
      filter: (name) => name.endsWith('.agent.md'),
    });
    totalChanges += getChangeCount(result, dryRun);
    if (!dryRun && result.written > 0)
      success(`Installed ${result.written} Copilot agent override(s) to .github/agents/`);
  }

  if (!isGlobal && scope.shouldInstallInstructions && !isCodex) {
    totalChanges += getChangeCount(installCopilotInstructions({ targetDir, dryRun }), dryRun);
  }

  if (!isGlobal && scope.shouldInstallInstructions) {
    const agentsTemplatePath = isCodex
      ? path.join(TEMPLATES_DIR, 'agents', 'AGENTS.codex.md')
      : path.join(TEMPLATES_DIR, 'agents', 'AGENTS.md');
    totalChanges += getChangeCount(
      installAgentsFile({ templatePath: agentsTemplatePath, force, append, dryRun }),
      dryRun,
    );
  }

  if (!isGlobal && !dryRun && scope.shouldInstallSkills && Object.keys(installedSkillsMap).length > 0) {
    const skillsForLock: Record<string, SkillMeta> = {};
    for (const [name, meta] of Object.entries(installedSkillsMap)) {
      skillsForLock[name] = { computedHash: computeSkillHash(meta.canonicalDir), agents: meta.agents };
    }
    writeLockfile({ skills: skillsForLock, config: filters, packageVersion: VERSION });
    appendSkillsToGitignore(process.cwd());
  }

  console.log('');
  if (dryRun) {
    info(`Dry run complete. ${totalChanges} files would be installed.`);
  } else if (totalChanges > 0) {
    success(`Installation complete! ${totalChanges} files installed.`);
    console.log('');
    if (isGlobal) {
      info('Next steps:');
      console.log('  1. Update ~/.agents-toolkit.json with your defaults');
      console.log('  2. Instructions/prompts/skills are now available globally in VS Code');
    } else {
      info('Next steps:');
      console.log('  1. Update .agents-toolkit.json with your Jira project key');
      if (isCodex) {
        console.log('  2. Review AGENTS.md in the project root');
        console.log('  3. Run Codex from this project root');
      } else {
        console.log('  2. Configure Atlassian MCP in VS Code');
        console.log('  3. Run prompts via Command Palette > "GitHub Copilot: Run Prompt"');
      }
    }
  } else {
    warn('No new files installed. Use --force to overwrite existing files.');
  }
  console.log('');
}
