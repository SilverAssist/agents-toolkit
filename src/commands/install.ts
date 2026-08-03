import fs from 'node:fs';
import path from 'node:path';

import { TEMPLATES_DIR } from '../constants.js';
import { VERSION } from '../index.js';
import { log, info, success, warn } from '../logger.js';
import { getTargetDir, getClaudeTargetDir } from '../paths.js';
import { appendSkillsToGitignore, copyDir, installSkillsStandard } from '../copy/index.js';
import { getChangeCount, getInstallScope, ensureConfigFile } from '../config/index.js';
import { computeSkillHash, writeLockfile } from '../lockfile/index.js';
import { shouldIncludeFile } from '../filter/index.js';
import { adaptPathsForClaude, transformFrontmatterForClaude } from '../transforms/index.js';
import { installGitBasedTarget } from '../installers/index.js';
import type { FileCategoryKey } from '../filter/index.js';
import type { InstallFilters, InstallOptions, SkillMeta } from '../types.js';

type CommandOptions = Partial<InstallOptions> & { filters?: InstallFilters };

/** Installs all content for GitHub Copilot into `.github/`. */
export function install(options: CommandOptions = {}): void {
  installGitBasedTarget(options, 'copilot');
}

/** Installs all content for Codex into `.github/`. */
export function installCodex(options: CommandOptions = {}): void {
  installGitBasedTarget(options, 'codex');
}

/** Installs all content for Claude Code: slash commands, skills, CLAUDE.md, and subagent overrides. */
export function installClaude(options: CommandOptions = {}): void {
  const {
    force = false,
    dryRun = false,
    copy = false,
    global: isGlobal = false,
    filters = { stack: 'all', tracker: 'all' },
    noAgentOverrides = false,
  } = options;
  const scope = getInstallScope(options);
  const claudeDir = getClaudeTargetDir(isGlobal);
  const githubDir = getTargetDir(isGlobal);
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
  const claudeTransform = (content: string) => adaptPathsForClaude(transformFrontmatterForClaude(content));

  log('\n🤖 Claude Code Installer\n', 'bright');
  if (dryRun) info('Dry run mode - no files will be copied\n');

  if (scope.shouldInstallPrompts) {
    info('Installing slash commands...');
    const result = copyDir(path.join(TEMPLATES_DIR, 'shared', 'prompts'), path.join(claudeDir, 'commands'), {
      force,
      dryRun,
      filter: promptsFilter,
      partialsFilter,
      renameFile: (name) => name.replace(/\.prompt\.md$/, '.md'),
      transformContent: claudeTransform,
    });
    totalChanges += getChangeCount(result, dryRun);
    if (!dryRun && result.written > 0) success(`Installed ${result.written} command files to .claude/commands/`);
  }

  if (scope.shouldInstallPrompts && !noAgentOverrides) {
    const agentsDir = path.join(TEMPLATES_DIR, 'shared', 'agents');
    if (fs.existsSync(agentsDir)) {
      info('Installing subagent overrides...');
      const result = copyDir(agentsDir, path.join(claudeDir, 'agents'), {
        force,
        dryRun,
        filter: (name) => !name.endsWith('.agent.md'),
      });
      totalChanges += getChangeCount(result, dryRun);
      if (!dryRun && result.written > 0) success(`Installed ${result.written} agent override(s) to .claude/agents/`);
    }
  }

  if (scope.shouldInstallInstructions) {
    info('Installing instructions...');
    const result = copyDir(path.join(TEMPLATES_DIR, 'shared', 'instructions'), path.join(githubDir, 'instructions'), {
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
      agentSkillsDir: path.join(claudeDir, 'skills'),
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
      entry.agents.push(path.relative(process.cwd(), path.join(claudeDir, 'skills')));
    }

    if (!dryRun && result.written > 0) success(`Installed ${result.written} skill files/links to .claude/skills/`);
  }

  if (!isGlobal && scope.shouldInstallInstructions) {
    const claudeMdPath = path.join(process.cwd(), 'CLAUDE.md');
    const claudeMdTemplate = path.join(TEMPLATES_DIR, 'agents', 'CLAUDE.md');
    if (fs.existsSync(claudeMdTemplate)) {
      const exists = fs.existsSync(claudeMdPath);
      if (exists && !force) {
        info('CLAUDE.md already exists (use --force to overwrite)');
      } else {
        totalChanges++;
        if (dryRun) {
          info(exists ? 'Would update CLAUDE.md' : 'Would create CLAUDE.md');
        } else {
          fs.copyFileSync(claudeMdTemplate, claudeMdPath);
          success(exists ? 'Updated CLAUDE.md' : 'Created CLAUDE.md');
        }
      }
    }
  }

  totalChanges += getChangeCount(ensureConfigFile({ dryRun, global: isGlobal }), dryRun);

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
      console.log('  2. Claude commands are now available globally');
    } else {
      info('Next steps:');
      console.log('  1. Update .agents-toolkit.json with your Jira project key');
      console.log('  2. Configure Atlassian MCP in Claude Code settings');
      console.log('  3. Run slash commands with /analyze-ticket, /work-ticket, etc.');
    }
  } else {
    warn('No new files installed. Use --force to overwrite existing files.');
  }
  console.log('');
}
