#!/usr/bin/env node

/**
 * CLI tool for installing and managing AI agent prompts
 * @module copilot-prompts-kit/cli
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

const DEFAULT_CONFIG = {
  jira: {
    projectKey: 'PROJECT',
    baseUrl: 'https://your-org.atlassian.net'
  },
  git: {
    defaultBranch: 'dev',
    branchPrefix: {
      feature: 'feature/',
      bugfix: 'bugfix/',
      hotfix: 'hotfix/'
    }
  },
  pr: {
    targetBranch: 'dev',
    template: 'default'
  }
};

/**
 * Print colored message to console
 * @param {string} message - Message to print
 * @param {string} color - Color key from COLORS
 */
function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

/**
 * Print success message
 * @param {string} message - Message to print
 */
function success(message) {
  log(`✅ ${message}`, 'green');
}

/**
 * Print warning message
 * @param {string} message - Message to print
 */
function warn(message) {
  log(`⚠️  ${message}`, 'yellow');
}

/**
 * Print error message
 * @param {string} message - Message to print
 */
function error(message) {
  log(`❌ ${message}`, 'red');
}

/**
 * Print info message
 * @param {string} message - Message to print
 */
function info(message) {
  log(`ℹ️  ${message}`, 'blue');
}

/**
 * Get the target directory for Copilot installation
 * @returns {string} Path to .github directory
 */
function getTargetDir() {
  return path.join(process.cwd(), '.github');
}

/**
 * Get the target directory for Claude Code installation
 * @returns {string} Path to .claude directory
 */
function getClaudeTargetDir() {
  return path.join(process.cwd(), '.claude');
}

/**
 * Strip GitHub Copilot frontmatter from a prompt file
 * Removes the ---\nagent: ...\ndescription: ...\n--- block
 * @param {string} content - File content
 * @returns {string} Content without Copilot frontmatter
 */
function stripCopilotFrontmatter(content) {
  return content.replace(/^---\n(?:[\s\S]*?\n)?---\n\n?/, '');
}

/**
 * Adapt path references in prompt content for Claude Code
 * @param {string} content - File content
 * @returns {string} Content with updated paths
 */
function adaptPathsForClaude(content) {
  return content
    .replace(/\.github\/copilot-instructions\.md/g, 'CLAUDE.md')
    .replace(/\.github\/prompts\/_partials\//g, '.claude/commands/_partials/');
}

/**
 * Copy a directory recursively
 * @param {string} src - Source directory
 * @param {string} dest - Destination directory
 * @param {Object} options - Copy options
 * @param {boolean} options.force - Overwrite existing files
 * @param {boolean} options.dryRun - Only show what would be copied
 * @param {(name: string) => string} [options.renameFile] - Optional file rename function
 * @param {(content: string) => string} [options.transformContent] - Optional content transform
 * @returns {{ written: number, planned: number }} Number of written/planned files
 */
function copyDir(src, dest, options = {}) {
  const {
    force = false,
    dryRun = false,
    renameFile = (name) => name,
    transformContent = null,
  } = options;
  const totals = { written: 0, planned: 0 };

  if (!fs.existsSync(src)) {
    return totals;
  }

  if (!dryRun && !fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);

    if (entry.isDirectory()) {
      const nested = copyDir(srcPath, path.join(dest, entry.name), options);
      totals.written += nested.written;
      totals.planned += nested.planned;
    } else {
      const destName = renameFile(entry.name);
      const destPath = path.join(dest, destName);
      const exists = fs.existsSync(destPath);

      if (exists && !force) {
        warn(`Skipping existing file: ${path.relative(process.cwd(), destPath)}`);
        continue;
      }

      totals.planned++;

      if (dryRun) {
        info(`Would copy: ${path.relative(process.cwd(), destPath)}`);
      } else {
        if (transformContent) {
          const rawContent = fs.readFileSync(srcPath, 'utf-8');
          fs.writeFileSync(destPath, transformContent(rawContent));
        } else {
          fs.copyFileSync(srcPath, destPath);
        }
        totals.written++;
      }
    }
  }

  return totals;
}

function getInstallScope(options = {}) {
  const {
    promptsOnly = false,
    partialsOnly = false,
    skillsOnly = false,
    instructionsOnly = false,
  } = options;

  const hasSpecificFlag = promptsOnly || partialsOnly || skillsOnly || instructionsOnly;

  return {
    shouldInstallPrompts: !hasSpecificFlag || promptsOnly || partialsOnly,
    shouldInstallInstructions: !hasSpecificFlag || instructionsOnly,
    shouldInstallSkills: !hasSpecificFlag || skillsOnly,
  };
}

function getChangeCount(result, dryRun) {
  return dryRun ? result.planned : result.written;
}

function ensureConfigFile({ dryRun = false } = {}) {
  const configPath = path.join(process.cwd(), '.copilot-prompts.json');

  if (fs.existsSync(configPath)) {
    return { written: 0, planned: 0 };
  }

  if (dryRun) {
    info('Would create .copilot-prompts.json');
    return { written: 0, planned: 1 };
  }

  fs.writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2));
  success('Created .copilot-prompts.json config file');
  return { written: 1, planned: 1 };
}

function installCopilotInstructions({ targetDir, dryRun = false } = {}) {
  const result = { written: 0, planned: 0 };
  const copilotInstructionsPath = path.join(targetDir, 'copilot-instructions.md');
  const templatePath = path.join(TEMPLATES_DIR, 'copilot-instructions.md');

  if (!fs.existsSync(templatePath)) {
    return result;
  }

  const templateContent = fs.readFileSync(templatePath, 'utf-8');

  if (fs.existsSync(copilotInstructionsPath)) {
    const existingContent = fs.readFileSync(copilotInstructionsPath, 'utf-8');
    const marker = '## 🔄 Copilot Agent Workflow';

    if (existingContent.includes(marker)) {
      info('copilot-instructions.md already contains key sections');
      return result;
    }

    result.planned++;
    if (dryRun) {
      info('Would append key sections to existing copilot-instructions.md');
      return result;
    }

    const sectionsToAppend = templateContent.split('\n').slice(4).join('\n');
    const newContent = `${existingContent}\n\n<!-- Added by copilot-prompts-kit -->\n${sectionsToAppend}`;
    fs.writeFileSync(copilotInstructionsPath, newContent);
    success('Appended key sections to existing copilot-instructions.md');
    result.written++;
    return result;
  }

  result.planned++;
  if (dryRun) {
    info('Would create copilot-instructions.md');
    return result;
  }

  fs.writeFileSync(copilotInstructionsPath, templateContent);
  success('Created copilot-instructions.md with key sections');
  result.written++;
  return result;
}

function getAgentsTemplateBody(templateContent) {
  const lines = templateContent.split('\n');
  const dividerIndex = lines.indexOf('---');

  if (dividerIndex === -1) {
    return templateContent;
  }

  return lines.slice(dividerIndex + 1).join('\n').trimStart();
}

function installAgentsFile(options = {}) {
  const {
    templatePath,
    force = false,
    append = false,
    dryRun = false,
  } = options;

  const result = { written: 0, planned: 0 };
  const agentsPath = path.join(process.cwd(), 'AGENTS.md');

  if (!fs.existsSync(templatePath)) {
    return result;
  }

  const agentsExists = fs.existsSync(agentsPath);

  if (!agentsExists || force) {
    result.planned++;
    if (dryRun) {
      info(agentsExists ? 'Would update AGENTS.md in project root' : 'Would create AGENTS.md in project root');
      return result;
    }

    fs.copyFileSync(templatePath, agentsPath);
    success(agentsExists ? 'Updated AGENTS.md in project root' : 'Created AGENTS.md in project root');
    result.written++;
    return result;
  }

  if (!append) {
    info('AGENTS.md already exists in project root (use --force to overwrite or --append to merge)');
    return result;
  }

  const existingContent = fs.readFileSync(agentsPath, 'utf-8');
  const mergeMarker = '## 🔄 Agent Workflow (Complex Tasks)';

  if (existingContent.includes(mergeMarker)) {
    info('AGENTS.md already contains workflow sections');
    return result;
  }

  result.planned++;
  if (dryRun) {
    info('Would append missing sections to AGENTS.md');
    return result;
  }

  const templateContent = fs.readFileSync(templatePath, 'utf-8');
  const templateBody = getAgentsTemplateBody(templateContent);
  const mergedContent = `${existingContent}\n\n<!-- Added by copilot-prompts-kit (--append) -->\n\n${templateBody}`;
  fs.writeFileSync(agentsPath, mergedContent);
  success('Appended missing sections to AGENTS.md');
  result.written++;
  return result;
}

function installGitBasedTarget(options = {}, target = 'copilot') {
  const {
    force = false,
    append = false,
    dryRun = false,
  } = options;
  const isCodex = target === 'codex';
  const targetDir = getTargetDir();
  const scope = getInstallScope(options);
  let totalChanges = 0;

  log(isCodex ? '\n⚡ Codex Installer\n' : '\n📦 Copilot Prompts Kit Installer\n', 'bright');

  if (dryRun) {
    info('Dry run mode - no files will be copied\n');
  }

  if (scope.shouldInstallPrompts) {
    info('Installing prompts...');
    const result = copyDir(path.join(TEMPLATES_DIR, 'prompts'), path.join(targetDir, 'prompts'), { force, dryRun });
    totalChanges += getChangeCount(result, dryRun);

    if (!dryRun && result.written > 0) {
      success(`Installed ${result.written} prompt files`);
    }
  }

  if (scope.shouldInstallInstructions) {
    info('Installing instructions...');
    const result = copyDir(path.join(TEMPLATES_DIR, 'instructions'), path.join(targetDir, 'instructions'), { force, dryRun });
    totalChanges += getChangeCount(result, dryRun);

    if (!dryRun && result.written > 0) {
      success(`Installed ${result.written} instruction files`);
    }
  }

  if (scope.shouldInstallSkills) {
    info('Installing skills...');
    const result = copyDir(path.join(TEMPLATES_DIR, 'skills'), path.join(targetDir, 'skills'), { force, dryRun });
    totalChanges += getChangeCount(result, dryRun);

    if (!dryRun && result.written > 0) {
      success(`Installed ${result.written} skill files`);
    }
  }

  const configResult = ensureConfigFile({ dryRun });
  totalChanges += getChangeCount(configResult, dryRun);

  if (scope.shouldInstallInstructions && !isCodex) {
    const copilotInstructionsResult = installCopilotInstructions({ targetDir, dryRun });
    totalChanges += getChangeCount(copilotInstructionsResult, dryRun);
  }

  if (scope.shouldInstallInstructions) {
    const agentsTemplatePath = isCodex
      ? path.join(TEMPLATES_DIR, 'codex', 'AGENTS.md')
      : path.join(TEMPLATES_DIR, 'AGENTS.md');
    const agentsResult = installAgentsFile({ templatePath: agentsTemplatePath, force, append, dryRun });
    totalChanges += getChangeCount(agentsResult, dryRun);
  }

  console.log('');
  if (dryRun) {
    info(`Dry run complete. ${totalChanges} files would be installed.`);
  } else if (totalChanges > 0) {
    success(`Installation complete! ${totalChanges} files installed.`);
    console.log('');
    info('Next steps:');
    console.log('  1. Update .copilot-prompts.json with your Jira project key');
    if (isCodex) {
      console.log('  2. Review AGENTS.md in the project root');
      console.log('  3. Run Codex from this project root');
    } else {
      console.log('  2. Configure Atlassian MCP in VS Code');
      console.log('  3. Run prompts via Command Palette > "GitHub Copilot: Run Prompt"');
    }
  } else {
    warn('No new files installed. Use --force to overwrite existing files.');
  }
  console.log('');
}

/**
 * Install prompts to target directory
 * @param {Object} options - Install options
 */
function install(options = {}) {
  installGitBasedTarget(options, 'copilot');
}

/**
 * Install files for Codex
 * @param {Object} options - Install options
 */
function installCodex(options = {}) {
  installGitBasedTarget(options, 'codex');
}

/**
 * Install Claude Code files (CLAUDE.md + .claude/commands/)
 * @param {Object} options - Install options
 */
function installClaude(options = {}) {
  const { force = false, dryRun = false } = options;
  const scope = getInstallScope(options);
  const claudeDir = getClaudeTargetDir();
  const githubDir = getTargetDir();
  let totalChanges = 0;

  log('\n🤖 Claude Code Installer\n', 'bright');

  if (dryRun) {
    info('Dry run mode - no files will be copied\n');
  }

  if (scope.shouldInstallPrompts) {
    info('Installing slash commands...');
    const result = copyDir(path.join(TEMPLATES_DIR, 'prompts'), path.join(claudeDir, 'commands'), {
      force,
      dryRun,
      renameFile: (name) => name.replace(/\.prompt\.md$/, '.md'),
      transformContent: (content) => adaptPathsForClaude(stripCopilotFrontmatter(content)),
    });
    totalChanges += getChangeCount(result, dryRun);

    if (!dryRun && result.written > 0) {
      success(`Installed ${result.written} command files to .claude/commands/`);
    }
  }

  if (scope.shouldInstallInstructions) {
    info('Installing instructions...');
    const result = copyDir(path.join(TEMPLATES_DIR, 'instructions'), path.join(githubDir, 'instructions'), { force, dryRun });
    totalChanges += getChangeCount(result, dryRun);

    if (!dryRun && result.written > 0) {
      success(`Installed ${result.written} instruction files`);
    }
  }

  if (scope.shouldInstallSkills) {
    info('Installing skills...');
    const result = copyDir(path.join(TEMPLATES_DIR, 'skills'), path.join(githubDir, 'skills'), { force, dryRun });
    totalChanges += getChangeCount(result, dryRun);

    if (!dryRun && result.written > 0) {
      success(`Installed ${result.written} skill files`);
    }
  }

  if (scope.shouldInstallInstructions) {
    const claudeMdPath = path.join(process.cwd(), 'CLAUDE.md');
    const claudeMdTemplate = path.join(TEMPLATES_DIR, 'claude', 'CLAUDE.md');

    if (fs.existsSync(claudeMdTemplate)) {
      const exists = fs.existsSync(claudeMdPath);
      if (exists && !force) {
        info('CLAUDE.md already exists (use --force to overwrite)');
      } else {
        totalChanges += 1;
        if (dryRun) {
          info(exists ? 'Would update CLAUDE.md' : 'Would create CLAUDE.md');
        } else {
          fs.copyFileSync(claudeMdTemplate, claudeMdPath);
          success(exists ? 'Updated CLAUDE.md' : 'Created CLAUDE.md');
        }
      }
    }
  }

  const configResult = ensureConfigFile({ dryRun });
  totalChanges += getChangeCount(configResult, dryRun);

  console.log('');
  if (dryRun) {
    info(`Dry run complete. ${totalChanges} files would be installed.`);
  } else if (totalChanges > 0) {
    success(`Installation complete! ${totalChanges} files installed.`);
    console.log('');
    info('Next steps:');
    console.log('  1. Update .copilot-prompts.json with your Jira project key');
    console.log('  2. Configure Atlassian MCP in Claude Code settings');
    console.log('  3. Run slash commands with /analyze-ticket, /work-ticket, etc.');
  } else {
    warn('No new files installed. Use --force to overwrite existing files.');
  }
  console.log('');
}

/**
 * List available prompts
 */
function list() {
  log('\n📋 Available Prompts\n', 'bright');

  const promptsDir = path.join(TEMPLATES_DIR, 'prompts');
  
  if (!fs.existsSync(promptsDir)) {
    error('Templates directory not found');
    return;
  }

  const prompts = fs.readdirSync(promptsDir)
    .filter(f => f.endsWith('.prompt.md'))
    .map(f => f.replace('.prompt.md', ''));

  log('Workflow Prompts:', 'cyan');
  const workflowPrompts = ['analyze-ticket', 'create-plan', 'work-ticket', 'prepare-pr', 'create-pr', 'finalize-pr'];
  workflowPrompts.forEach((p, i) => {
    if (prompts.includes(p)) {
      console.log(`  ${i + 1}. ${p}`);
    }
  });

  console.log('');
  log('Utility Prompts:', 'cyan');
  const utilityPrompts = prompts.filter(p => !workflowPrompts.includes(p));
  utilityPrompts.forEach(p => {
    console.log(`  • ${p}`);
  });

  console.log('');
  log('Partials:', 'cyan');
  const partialsDir = path.join(promptsDir, '_partials');
  if (fs.existsSync(partialsDir)) {
    const partials = fs.readdirSync(partialsDir)
      .filter(f => f.endsWith('.md') && f !== 'README.md');
    partials.forEach(p => {
      console.log(`  • ${p.replace('.md', '')}`);
    });
  }

  console.log('');
  log('Skills:', 'cyan');
  const skillsDir = path.join(TEMPLATES_DIR, 'skills');
  if (fs.existsSync(skillsDir)) {
    const skills = fs.readdirSync(skillsDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);
    skills.forEach(s => {
      console.log(`  • ${s}`);
    });
  }
  console.log('');
}

/**
 * Show help message
 */
function showHelp() {
  log('\n📦 Copilot Prompts Kit\n', 'bright');
  console.log('Usage: copilot-prompts <command> [options]\n');
  
  log('Commands:', 'cyan');
  console.log('  install     Install prompts (default target: copilot)');
  console.log('  list        List available prompts');
  console.log('  update      Update existing prompts (alias for install --force)');
  console.log('  help        Show this help message');
  
  console.log('');
  log('Options:', 'cyan');
  console.log('  --force, -f         Overwrite existing files');
  console.log('  --target <name>     Target installer: copilot | claude | codex');
  console.log('  --claude            Install for Claude Code (.claude/commands/ + CLAUDE.md)');
  console.log('  --codex             Install for Codex (AGENTS.md + shared .github files)');
  console.log('  --append            Append missing AGENTS.md sections instead of overwriting');
  console.log('  --prompts-only      Only install prompts (no instructions/skills)');
  console.log('  --instructions-only Only install instructions');
  console.log('  --partials-only     Only install partials');
  console.log('  --skills-only       Only install skills');
  console.log('  --dry-run           Show what would be installed');

  console.log('');
  log('Examples:', 'cyan');
  console.log('  npx copilot-prompts install              # GitHub Copilot');
  console.log('  npx copilot-prompts install --target codex');
  console.log('  npx copilot-prompts install --target=claude');
  console.log('  npx copilot-prompts install --claude     # Claude Code');
  console.log('  npx copilot-prompts install --codex      # Codex');
  console.log('  npx copilot-prompts install --force');
  console.log('  npx copilot-prompts install --append --instructions-only');
  console.log('  npx copilot-prompts install --claude --force');
  console.log('  npx copilot-prompts install --codex --force');
  console.log('  npx copilot-prompts install --prompts-only');
  console.log('  npx copilot-prompts list');
  console.log('');
}

/**
 * Parse command line arguments
 * @returns {Object} Parsed arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  const flags = args.slice(1);

  let target = null;
  for (let i = 0; i < flags.length; i++) {
    const arg = flags[i];
    if (arg === '--target') {
      const value = flags[i + 1];
      if (value && !value.startsWith('-')) {
        target = value;
        i++;
      } else {
        target = '';
      }
    } else if (arg.startsWith('--target=')) {
      target = arg.split('=').slice(1).join('=');
    }
  }

  const options = {
    force: flags.includes('--force') || flags.includes('-f'),
    promptsOnly: flags.includes('--prompts-only'),
    partialsOnly: flags.includes('--partials-only'),
    skillsOnly: flags.includes('--skills-only'),
    instructionsOnly: flags.includes('--instructions-only'),
    dryRun: flags.includes('--dry-run'),
    claude: flags.includes('--claude'),
    codex: flags.includes('--codex'),
    append: flags.includes('--append'),
    target,
  };
  
  return { command, options };
}

function resolveInstallTarget(options = {}) {
  const legacyTargets = [];

  if (options.claude) {
    legacyTargets.push('claude');
  }
  if (options.codex) {
    legacyTargets.push('codex');
  }

  let explicitTarget = null;
  if (options.target !== null && options.target !== undefined) {
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

  if (explicitTarget && legacyTargets.length > 0 && legacyTargets[0] !== explicitTarget) {
    error(`Conflicting target flags: --target ${explicitTarget} and --${legacyTargets[0]}.`);
    process.exit(1);
  }

  if (explicitTarget) {
    return explicitTarget;
  }

  if (legacyTargets.length === 1) {
    return legacyTargets[0];
  }

  return 'copilot';
}

/**
 * Main CLI entry point
 */
function main() {
  const { command, options } = parseArgs();
  const target = (command === 'install' || command === 'update')
    ? resolveInstallTarget(options)
    : null;

  switch (command) {
    case 'install':
      if (target === 'claude') {
        installClaude(options);
      } else if (target === 'codex') {
        installCodex(options);
      } else {
        install(options);
      }
      break;
    case 'update':
      if (target === 'claude') {
        installClaude({ ...options, force: true });
      } else if (target === 'codex') {
        installCodex({ ...options, force: true });
      } else {
        install({ ...options, force: true });
      }
      break;
    case 'list':
      list();
      break;
    case 'help':
    case '--help':
    case '-h':
      showHelp();
      break;
    default:
      error(`Unknown command: ${command}`);
      showHelp();
      process.exit(1);
  }
}

main();
