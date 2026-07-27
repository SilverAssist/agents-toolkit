#!/usr/bin/env node

/**
 * CLI tool for installing and managing AI agent prompts
 * @module agents-toolkit/cli
 */

import fs from 'fs';
import path from 'path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'url';
import { VERSION } from '../src/index.js';

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
  stack: 'all',
  tracker: 'all',
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
  },
  // Cheap-first model pins shipped with each prompt (see docs/subagent-cost-
  // optimization-plan.md §5.2G). Override per-project or per-user by editing
  // these values; the CLI substitutes them into `model:` frontmatter at
  // install time. Setting a value to null preserves the shipped default.
  models: {
    copilot: {
      cheap: 'Claude Haiku 4.5 (copilot)',
      smart: 'Claude Sonnet 4.5 (copilot)'
    },
    claude: {
      cheap: 'haiku',
      smart: 'sonnet'
    }
  }
};

/**
 * File categorization for stack/tracker filtering
 */
const FILE_CATEGORIES = {
  instructions: {
    react: ['caching', 'css-styling', 'react-components', 'seo-ai-optimization', 'server-actions', 'tests', 'tsdoc-standards', 'typescript'],
    wordpress: ['php-standards', 'wordpress-plugin-architecture', 'testing-standards'],
    universal: ['documentation-language', 'github-workflow'],
  },
  prompts: {
    react: [],
    wordpress: ['new-wp-component', 'new-wp-plugin', 'quality-check'],
    universal: [
      'analyze-ticket', 'work-ticket', 'analyze-github-issue', 'work-github-issue',
      'create-plan', 'create-pr', 'prepare-pr', 'finalize-pr',
      'create-github-pr', 'finalize-github-pr', 'resolve-github-reviews',
      'review-code', 'fix-issues', 'add-tests', 'prepare-github-release',
    ],
    jira: ['analyze-ticket', 'work-ticket', 'create-pr', 'finalize-pr'],
    github: ['analyze-github-issue', 'work-github-issue', 'create-github-pr', 'finalize-github-pr', 'resolve-github-reviews'],
  },
  partials: {
    react: ['release-node'],
    wordpress: ['release-wordpress'],
    jira: ['jira-integration'],
    github: ['github-integration'],
    universal: ['git-operations', 'pr-template', 'validations', 'documentation'],
  },
  skills: {
    react: ['component-architecture', 'nextjs-caching', 'testing-patterns', 'tsdoc-standards'],
    wordpress: ['create-component', 'plugin-creation', 'quality-checks', 'testing'],
    github: ['github-review-management', 'core-review'],
    universal: ['domain-driven-design', 'release-management', 'github-review-management', 'core-review'],
  },
};

/**
 * Determine if a file should be included based on stack/tracker filters
 * @param {string} filename - File basename without extension
 * @param {string} category - Category: instructions, prompts, partials, or skills
 * @param {{ stack: string, tracker: string }} filters - Active filters
 * @returns {boolean} Whether to include the file
 */
function shouldIncludeFile(filename, category, { stack, tracker }) {
  const cats = FILE_CATEGORIES[category];
  if (!cats) return true;

  if (cats.universal && cats.universal.includes(filename)) {
    if (tracker !== 'all' && cats.jira && cats.jira.includes(filename) && tracker !== 'jira') return false;
    if (tracker !== 'all' && cats.github && cats.github.includes(filename) && tracker !== 'github') return false;
    return true;
  }

  if (stack !== 'all') {
    if (cats.react && cats.react.includes(filename)) return stack === 'react';
    if (cats.wordpress && cats.wordpress.includes(filename)) return stack === 'wordpress';
  }

  if (tracker !== 'all') {
    if (cats.jira && cats.jira.includes(filename)) return tracker === 'jira';
    if (cats.github && cats.github.includes(filename)) return tracker === 'github';
  }

  return true;
}

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
 * Get the user home directory
 * @returns {string} Path to home directory
 */
function getHomeDir() {
  return process.env.HOME || process.env.USERPROFILE || '';
}

/**
 * Get the target directory for Copilot installation
 * @param {boolean} global - Install to user-level ~/.copilot/
 * @returns {string} Path to .github or ~/.copilot directory
 */
function getTargetDir(global = false) {
  if (global) {
    return path.join(getHomeDir(), '.copilot');
  }
  return path.join(process.cwd(), '.github');
}

/**
 * Get the target directory for Claude Code installation
 * @param {boolean} global - Install to user-level ~/.claude/
 * @returns {string} Path to .claude directory
 */
function getClaudeTargetDir(global = false) {
  if (global) {
    return path.join(getHomeDir(), '.claude');
  }
  return path.join(process.cwd(), '.claude');
}

/**
 * Get the canonical skills directory following the `npx skills` standard.
 * Skills live here once (single source of truth) and each agent's skills
 * directory symlinks to it.
 * @param {boolean} global - Use user-level ~/.agents/skills/
 * @returns {string} Path to .agents/skills directory
 */
function getAgentsSkillsDir(global = false) {
  const base = global ? getHomeDir() : process.cwd();
  return path.join(base, '.agents', 'skills');
}

/** Path to the project-level lockfile. */
const LOCKFILE_NAME = 'agents-toolkit-lock.json';

/**
 * Compute a hex-encoded SHA-256 hash of a skill's SKILL.md content.
 * Matches the algorithm used by `npx skills` (Vercel).
 * @param {string} skillDir - Absolute path to the skill directory
 * @returns {string|null} Hex hash string, or null if SKILL.md is missing
 */
function computeSkillHash(skillDir) {
  const skillMdPath = path.join(skillDir, 'SKILL.md');
  if (!fs.existsSync(skillMdPath)) return null;
  const content = fs.readFileSync(skillMdPath, 'utf-8');
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Read and parse the project lockfile.
 * @param {string} [cwd] - Directory to look in (defaults to process.cwd())
 * @returns {Object|null} Parsed lockfile, or null if absent or invalid
 */
function readLockfile(cwd = process.cwd()) {
  const lockPath = path.join(cwd, LOCKFILE_NAME);
  if (!fs.existsSync(lockPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(lockPath, 'utf-8'));
  } catch {
    return null;
  }
}

/**
 * Write the project lockfile, merging new skills with any existing entries.
 * This preserves skills installed by a previous `install --target` run so that
 * running `install` followed by `install --claude` does not lose the first
 * target's entries in the lockfile.
 * @param {Object} params
 * @param {Record<string, {computedHash: string|null, agents: string[]}>} params.skills - Newly installed skills map
 * @param {{ stack: string, tracker: string }} params.config - Active install config
 * @param {string} params.packageVersion - Current package version
 * @param {string} [params.cwd] - Directory to write to (defaults to process.cwd())
 */
function writeLockfile({ skills, config, packageVersion, cwd = process.cwd() }) {
  const lockPath = path.join(cwd, LOCKFILE_NAME);

  // Merge with any existing lockfile so successive multi-target installs
  // (e.g. `install` then `install --claude`) accumulate entries.
  const existing = readLockfile(cwd);
  const mergedSkills = Object.assign({}, existing?.skills ?? {});

  for (const [name, meta] of Object.entries(skills)) {
    const prev = mergedSkills[name];
    // Merge agents arrays: union of previous and new agent dirs.
    const prevAgents = prev?.agents ?? [];
    const allAgents = Array.from(new Set([...prevAgents, ...meta.agents]));
    mergedSkills[name] = {
      source: '@silverassist/agents-toolkit',
      packageVersion,
      computedHash: meta.computedHash,
      agents: allAgents,
    };
  }

  const lockfile = {
    version: 1,
    packageVersion,
    config,
    skills: mergedSkills,
  };
  fs.writeFileSync(lockPath, JSON.stringify(lockfile, null, 2) + '\n', 'utf-8');
  success(`Wrote ${LOCKFILE_NAME}`);
}

/**
 * Append skills-managed entries to .gitignore if not already present.
 * Never runs during dry-run or global installs.
 * @param {string} cwd - Project root directory
 */
function appendSkillsToGitignore(cwd) {
  const gitignorePath = path.join(cwd, '.gitignore');
  const block = [
    '',
    '# agents-toolkit managed — regenerate with: npx @silverassist/agents-toolkit restore',
    '.agents/skills/',
    '.github/skills/',
    '.claude/skills/',
  ].join('\n');

  let existing = '';
  if (fs.existsSync(gitignorePath)) {
    existing = fs.readFileSync(gitignorePath, 'utf-8');
  }

  // Only append if none of the three managed paths are already present.
  if (
    existing.includes('.agents/skills/') ||
    existing.includes('.github/skills/') ||
    existing.includes('.claude/skills/')
  ) {
    return;
  }

  fs.writeFileSync(gitignorePath, existing + block + '\n', 'utf-8');
  info('Updated .gitignore with agents-toolkit managed paths');
}

/**
 * Link a single skill from the canonical store into an agent's skills
 * directory, following the `npx skills` standard (symlink with copy fallback).
 * @param {string} canonicalSkillDir - Absolute path to the canonical skill folder
 * @param {string} agentSkillLinkPath - Absolute path where the agent expects the skill
 * @param {Object} options - Link options
 * @param {boolean} [options.dryRun] - Only report what would happen
 * @param {boolean} [options.force] - Replace an existing non-matching entry
 * @param {boolean} [options.copy] - Force a copy instead of a symlink
 * @returns {{ written: number, planned: number }} Change counters
 */
function linkSkill(canonicalSkillDir, agentSkillLinkPath, options = {}) {
  const { dryRun = false, force = false, copy = false } = options;
  const totals = { written: 0, planned: 0 };

  const relTarget = path.relative(path.dirname(agentSkillLinkPath), canonicalSkillDir);
  const rel = (p) => path.relative(process.cwd(), p);

  // Inspect any existing entry at the link path.
  let existing = null;
  try {
    existing = fs.lstatSync(agentSkillLinkPath);
  } catch {
    existing = null;
  }

  if (existing) {
    // Already a symlink pointing at our canonical store — nothing to do.
    if (existing.isSymbolicLink()) {
      const current = fs.readlinkSync(agentSkillLinkPath);
      const resolved = path.resolve(path.dirname(agentSkillLinkPath), current);
      if (resolved === path.resolve(canonicalSkillDir) && !copy) {
        return totals;
      }
    }
    if (!force) {
      warn(`Skipping existing skill: ${rel(agentSkillLinkPath)}`);
      return totals;
    }
    if (!dryRun) {
      fs.rmSync(agentSkillLinkPath, { recursive: true, force: true });
    }
  }

  totals.planned++;

  if (dryRun) {
    info(copy ? `Would copy skill: ${rel(agentSkillLinkPath)}` : `Would link: ${rel(agentSkillLinkPath)} -> ${relTarget}`);
    return totals;
  }

  fs.mkdirSync(path.dirname(agentSkillLinkPath), { recursive: true });

  const doCopy = () => {
    copyDir(canonicalSkillDir, agentSkillLinkPath, { force: true });
  };

  if (copy) {
    doCopy();
  } else {
    try {
      fs.symlinkSync(relTarget, agentSkillLinkPath, 'dir');
    } catch {
      // Symlinks unsupported (e.g. Windows without developer mode) — copy instead.
      doCopy();
    }
  }

  totals.written++;
  return totals;
}

/**
 * Install skills following the `npx skills` standard: copy each skill once
 * into the canonical .agents/skills store, then symlink the agent's skills
 * directory entries to that store.
 * @param {Object} params - Install parameters
 * @param {boolean} params.isGlobal - Install at user level
 * @param {string} params.agentSkillsDir - Agent skills dir (.claude/skills or .github/skills)
 * @param {boolean} [params.force] - Overwrite existing files/links
 * @param {boolean} [params.dryRun] - Only report planned changes
 * @param {boolean} [params.copy] - Copy instead of symlink
 * @param {(name: string) => boolean} [params.dirFilter] - Skill folder filter
 * @returns {{ written: number, planned: number, installedSkills: Record<string, { canonicalDir: string }> }} Aggregated change counters and installed skill metadata
 */
function installSkillsStandard({ isGlobal, agentSkillsDir, force = false, dryRun = false, copy = false, dirFilter = null }) {
  const totals = { written: 0, planned: 0, installedSkills: {} };
  const skillsSrc = path.join(TEMPLATES_DIR, 'shared', 'skills');
  const canonicalDir = getAgentsSkillsDir(isGlobal);

  if (!fs.existsSync(skillsSrc)) {
    return totals;
  }

  // 1. Populate the canonical store once (filtered by stack).
  const canonicalResult = copyDir(skillsSrc, canonicalDir, { force, dryRun, dirFilter });
  totals.written += canonicalResult.written;
  totals.planned += canonicalResult.planned;

  // 2. Symlink each included skill folder into the agent's skills directory.
  const entries = fs.readdirSync(skillsSrc, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (dirFilter && !dirFilter(entry.name)) continue;

    const canonicalSkillDir = path.join(canonicalDir, entry.name);
    const agentSkillLinkPath = path.join(agentSkillsDir, entry.name);
    const linkResult = linkSkill(canonicalSkillDir, agentSkillLinkPath, { dryRun, force, copy });
    totals.written += linkResult.written;
    totals.planned += linkResult.planned;

    // Track for lockfile even during dry-run (so callers know what would be installed).
    totals.installedSkills[entry.name] = { canonicalDir: canonicalSkillDir };
  }

  return totals;
}

/**
 * Strip GitHub Copilot frontmatter from a prompt file.
 * Removes the ---\nagent: ...\ndescription: ...\n--- block wholesale.
 * Prefer {@link transformFrontmatterForClaude} for the Claude install path so
 * `model:` pins survive as Claude aliases.
 * @param {string} content - File content
 * @returns {string} Content without Copilot frontmatter
 */
function stripCopilotFrontmatter(content) {
  return content.replace(/^---\n(?:[\s\S]*?\n)?---\n\n?/, '');
}

/**
 * Extract the first Claude model alias from a Copilot frontmatter block.
 * Recognized substrings (case-insensitive, first match wins):
 *   - "haiku"  → "haiku"
 *   - "sonnet" → "sonnet"
 *   - "opus"   → "opus"
 * Non-Claude entries (e.g. `GPT-5 mini (copilot)`) are ignored so the fallback
 * chain "Claude Haiku 4.5 (copilot)" → "GPT-5 mini (copilot)" collapses to
 * `haiku` when copied into a Claude Code target.
 * @param {string} frontmatterBody - Raw frontmatter body without --- delimiters
 * @returns {string|null} Claude alias or null if none matched
 */
function extractClaudeAlias(frontmatterBody) {
  const scalarMatch = frontmatterBody.match(/^model:[ \t]+([^\n]+)$/m);
  const arrayMatch = frontmatterBody.match(/^model:[ \t]*\n((?:[ \t]*-[ \t]*[^\n]+\n?)+)/m);

  const values = [];
  if (scalarMatch && scalarMatch[1].trim()) {
    values.push(scalarMatch[1].trim());
  } else if (arrayMatch) {
    for (const line of arrayMatch[1].split('\n')) {
      const item = line.match(/^[ \t]*-[ \t]*(.+?)[ \t]*$/);
      if (item) values.push(item[1]);
    }
  }

  for (const value of values) {
    if (/haiku/i.test(value)) return 'haiku';
    if (/sonnet/i.test(value)) return 'sonnet';
    if (/opus/i.test(value)) return 'opus';
  }
  return null;
}

/**
 * Transform Copilot prompt frontmatter into Claude Code frontmatter.
 * - Strips Copilot-only fields (`agent`, `description`, `tools`).
 * - Reads the `model:` block (scalar or prioritized array) and remaps the
 *   first recognized Copilot vendor-qualified name to a Claude alias via
 *   {@link extractClaudeAlias}.
 * - If a Claude alias survives, emits `---\nmodel: <alias>\n---\n\n` before
 *   the body; otherwise strips the frontmatter entirely so Claude falls back
 *   to the inherited session model.
 * Optionally overrides the resolved alias with a user-configured value from
 * `.agents-toolkit.json` `models.claude.{cheap,smart}` (M4 config surface).
 * @param {string} content - Original file content (Copilot .prompt.md)
 * @param {Object} [options] - Transform options
 * @param {{ cheap?: string, smart?: string }} [options.claudeModels] - Aliases
 *   from `.agents-toolkit.json` `models.claude.{cheap,smart}`. When present,
 *   `haiku` is remapped to `models.claude.cheap` and `sonnet`/`opus` to
 *   `models.claude.smart`.
 * @param {boolean} [options.stripModel] - When true, drops the `model:` line
 *   even if a Claude alias survives (honours `--model-pins off`).
 * @returns {string} Content with Claude-compatible frontmatter
 */
function transformFrontmatterForClaude(content, options = {}) {
  const { claudeModels, stripModel = false } = options;
  const match = content.match(/^---\n([\s\S]*?)\n---\n\n?/);
  if (!match) return content;

  const frontmatterBody = match[1];
  const body = content.slice(match[0].length);

  if (stripModel) return body;

  const alias = extractClaudeAlias(frontmatterBody);
  if (!alias) return body;

  let resolved = alias;
  if (claudeModels) {
    if (alias === 'haiku' && claudeModels.cheap) resolved = claudeModels.cheap;
    else if ((alias === 'sonnet' || alias === 'opus') && claudeModels.smart) resolved = claudeModels.smart;
  }
  return `---\nmodel: ${resolved}\n---\n\n${body}`;
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
 * @param {(name: string) => boolean} [options.filter] - Optional file filter function
 * @returns {{ written: number, planned: number }} Number of written/planned files
 */
function copyDir(src, dest, options = {}) {
  const {
    force = false,
    dryRun = false,
    renameFile = (name) => name,
    transformContent = null,
    filter = null,
    dirFilter = null,
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
      if (dirFilter && !dirFilter(entry.name)) {
        continue;
      }
      const nestedOptions = { ...options };
      if (entry.name === '_partials' && options.partialsFilter) {
        nestedOptions.filter = options.partialsFilter;
      }
      const nested = copyDir(srcPath, path.join(dest, entry.name), nestedOptions);
      totals.written += nested.written;
      totals.planned += nested.planned;
    } else {
      if (filter && !filter(entry.name)) {
        continue;
      }

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

function getChangeCount(result, dryRun) {
  return dryRun ? result.planned : result.written;
}

/**
 * Finalize installed hook configs so Copilot can resolve the script command.
 * Copilot runs a hook `command` from the workspace root by default, not from
 * the hooks directory, so the relative `scripts/<name>.sh` command needs a
 * `cwd` pointing at the actual hooks dir. Also ensures the required
 * `version: 1` field is present.
 * @param {string} hooksDest - Absolute path to the installed hooks directory
 * @param {boolean} isGlobal - Whether this is a global (~/.copilot) install
 */
function finalizeHookConfigs(hooksDest, isGlobal) {
  // Global installs have no workspace anchor → use the absolute hooks path.
  // Project installs use a path relative to the workspace root so the config
  // stays portable/committable across machines and teammates.
  const cwd = isGlobal
    ? hooksDest
    : path.relative(process.cwd(), hooksDest).split(path.sep).join('/');

  const jsonFiles = fs.readdirSync(hooksDest).filter((f) => f.endsWith('.json'));
  for (const file of jsonFiles) {
    const filePath = path.join(hooksDest, file);
    const config = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    config.version = 1;
    for (const events of Object.values(config.hooks || {})) {
      for (const entry of events) {
        entry.cwd = cwd;
      }
    }
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2) + '\n');
  }
}

function installHooks({ targetDir, force = false, dryRun = false, global: isGlobal = false }) {
  const hooksSrc = path.join(TEMPLATES_DIR, 'shared', 'hooks');
  const hooksDest = path.join(targetDir, 'hooks');

  if (!fs.existsSync(hooksSrc)) {
    warn('No hooks templates found — skipping');
    return { written: 0, skipped: 0, planned: 0 };
  }

  // Copy hook JSON configs and scripts
  const result = copyDir(hooksSrc, hooksDest, { force, dryRun });

  // Make scripts executable and finalize configs (non-dry-run only)
  if (!dryRun) {
    const scriptsDir = path.join(hooksDest, 'scripts');
    if (fs.existsSync(scriptsDir)) {
      const scripts = fs.readdirSync(scriptsDir).filter(f => f.endsWith('.sh'));
      for (const script of scripts) {
        const scriptPath = path.join(scriptsDir, script);
        fs.chmodSync(scriptPath, 0o755);
      }
    }
    if (fs.existsSync(hooksDest)) {
      finalizeHookConfigs(hooksDest, isGlobal);
    }
  }

  if (!dryRun && result.written > 0) {
    success(`Installed ${result.written} hook files`);
  }

  return result;
}

function ensureConfigFile({ dryRun = false, global = false } = {}) {
  const configDir = global ? getHomeDir() : process.cwd();
  const configPath = path.join(configDir, '.agents-toolkit.json');

  if (fs.existsSync(configPath)) {
    return { written: 0, planned: 0 };
  }

  if (dryRun) {
    info(`Would create ${global ? '~' : '.'}/.agents-toolkit.json`);
    return { written: 0, planned: 1 };
  }

  fs.writeFileSync(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2));
  success(`Created ${global ? '~' : '.'}/.agents-toolkit.json config file`);
  return { written: 1, planned: 1 };
}

function installCopilotInstructions({ targetDir, dryRun = false } = {}) {
  const result = { written: 0, planned: 0 };
  const copilotInstructionsPath = path.join(targetDir, 'copilot-instructions.md');
  const templatePath = path.join(TEMPLATES_DIR, 'agents', 'copilot-instructions.md');

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
    const newContent = `${existingContent}\n\n<!-- Added by agents-toolkit -->\n${sectionsToAppend}`;
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
  const mergedContent = `${existingContent}\n\n<!-- Added by agents-toolkit (--append) -->\n\n${templateBody}`;
  fs.writeFileSync(agentsPath, mergedContent);
  success('Appended missing sections to AGENTS.md');
  result.written++;
  return result;
}

/**
 * Rewrite Copilot / Codex prompt frontmatter to honour user-configured model
 * pins from `.agents-toolkit.json` `models.copilot.{cheap,smart}` or strip
 * the pins entirely when `--model-pins off`.
 *
 * The shipped defaults are:
 *   - cheap tier: `Claude Haiku 4.5 (copilot)` → `GPT-5 mini (copilot)`
 *   - smart tier: `Claude Sonnet 4.5 (copilot)` → `GPT-5 (copilot)`
 *
 * The tier of a given prompt is inferred from the first entry in its `model:`
 * array (`*Haiku*` = cheap, `*Sonnet*`/`*Opus*` = smart). When the resolved
 * cheap/smart matches the shipped default, the content is returned unchanged
 * (fast path — no rewrite for the common case).
 *
 * When `stripModel` is true (`--model-pins off`), the entire `model:` block
 * (scalar line or block-scalar array) is removed from the frontmatter so
 * every prompt falls back to Copilot's picker default.
 *
 * @param {string} content - Original .prompt.md content
 * @param {Object} [options] - Transform options
 * @param {{cheap:string,smart:string}} [options.copilotModels] - Resolved user
 *   overrides. Defaults to the shipped values.
 * @param {boolean} [options.stripModel] - When true, drop `model:` entirely.
 * @returns {string} Content with rewritten (or stripped) frontmatter
 */
function transformFrontmatterForCopilot(content, options = {}) {
  const { copilotModels, stripModel = false } = options;
  const match = content.match(/^---\n([\s\S]*?)\n---\n(\n?)/);
  if (!match) return content;

  const frontmatterBody = match[1];
  const trailingBlank = match[2];
  const body = content.slice(match[0].length);

  const arrayBlockRegex = /^model:[ \t]*\n((?:[ \t]*-[ \t]*[^\n]+\n?)+)/m;
  const scalarBlockRegex = /^model:[ \t]+[^\n]+\n?/m;
  const arrayBlockMatch = frontmatterBody.match(arrayBlockRegex);
  const scalarBlockMatch = arrayBlockMatch ? null : frontmatterBody.match(scalarBlockRegex);

  if (stripModel) {
    let stripped = frontmatterBody;
    if (arrayBlockMatch) {
      stripped = stripped.replace(arrayBlockRegex, '').replace(/\n{2,}/g, '\n').replace(/\n+$/, '');
    } else if (scalarBlockMatch) {
      stripped = stripped.replace(scalarBlockRegex, '').replace(/\n{2,}/g, '\n').replace(/\n+$/, '');
    } else {
      return content;
    }
    return `---\n${stripped}\n---\n${trailingBlank}${body}`;
  }

  if (!arrayBlockMatch && !scalarBlockMatch) return content;
  if (!copilotModels) return content;

  const shippedCheap = DEFAULT_CONFIG.models.copilot.cheap;
  const shippedSmart = DEFAULT_CONFIG.models.copilot.smart;
  if (copilotModels.cheap === shippedCheap && copilotModels.smart === shippedSmart) {
    return content;
  }

  const values = [];
  if (arrayBlockMatch) {
    for (const line of arrayBlockMatch[1].split('\n')) {
      const item = line.match(/^[ \t]*-[ \t]*(.+?)[ \t]*$/);
      if (item) values.push(item[1]);
    }
  } else {
    values.push(scalarBlockMatch[0].replace(/^model:[ \t]+/, '').trim());
  }

  if (!values.length) return content;

  let tier = null;
  const primary = values[0];
  if (/haiku/i.test(primary)) tier = 'cheap';
  else if (/sonnet|opus/i.test(primary)) tier = 'smart';
  if (!tier) return content;

  const shipped = tier === 'cheap' ? shippedCheap : shippedSmart;
  const resolved = tier === 'cheap' ? copilotModels.cheap : copilotModels.smart;
  if (!resolved || resolved === shipped) return content;

  const rewritten = values.map((v) => (v === shipped ? resolved : v));
  const newBlock = rewritten.length === 1
    ? `model: ${rewritten[0]}`
    : `model:\n${rewritten.map((v) => `  - ${v}`).join('\n')}`;

  let newFrontmatter;
  if (arrayBlockMatch) {
    newFrontmatter = frontmatterBody.replace(arrayBlockRegex, `${newBlock}\n`).replace(/\n+$/, '');
  } else {
    newFrontmatter = frontmatterBody.replace(scalarBlockRegex, `${newBlock}\n`).replace(/\n+$/, '');
  }
  return `---\n${newFrontmatter}\n---\n${trailingBlank}${body}`;
}

function installGitBasedTarget(options = {}, target = 'copilot') {
  const {
    force = false,
    append = false,
    dryRun = false,
    copy = false,
    global: isGlobal = false,
    filters = { stack: 'all', tracker: 'all' },
    modelPins = 'on',
    models = DEFAULT_CONFIG.models,
  } = options;
  const isCodex = target === 'codex';
  const targetDir = getTargetDir(isGlobal);
  const scope = getInstallScope(options);
  let totalChanges = 0;
  /** @type {Record<string, { canonicalDir: string, agents: string[] }>} */
  const installedSkillsMap = {};

  const makeFilter = (category) => (name) => {
    const basename = name.replace(/\.(prompt\.md|instructions\.md|md)$/, '');
    return shouldIncludeFile(basename, category, filters);
  };

  const promptsFilter = makeFilter('prompts');
  const partialsFilter = makeFilter('partials');
  const shippedCopilot = DEFAULT_CONFIG.models.copilot;
  const copilotModels = models?.copilot || shippedCopilot;
  const copilotTransformNeeded = modelPins === 'off'
    || copilotModels.cheap !== shippedCopilot.cheap
    || copilotModels.smart !== shippedCopilot.smart;
  const copilotTransform = copilotTransformNeeded
    ? (content) => transformFrontmatterForCopilot(content, { copilotModels, stripModel: modelPins === 'off' })
    : undefined;

  log(isCodex ? '\n⚡ Codex Installer\n' : isGlobal ? '\n🌐 Agents Toolkit Global Installer\n' : '\n📦 Agents Toolkit Installer\n', 'bright');

  if (isGlobal) {
    info(`Target: ${targetDir}\n`);
  }

  if (dryRun) {
    info('Dry run mode - no files will be copied\n');
  }

  if (scope.shouldInstallPrompts) {
    info('Installing prompts...');
    const result = copyDir(path.join(TEMPLATES_DIR, 'shared', 'prompts'), path.join(targetDir, 'prompts'), { force, dryRun, filter: promptsFilter, partialsFilter, transformContent: copilotTransform });
    totalChanges += getChangeCount(result, dryRun);

    if (!dryRun && result.written > 0) {
      success(`Installed ${result.written} prompt files`);
    }
  }

  if (scope.shouldInstallInstructions) {
    info('Installing instructions...');
    const result = copyDir(path.join(TEMPLATES_DIR, 'shared', 'instructions'), path.join(targetDir, 'instructions'), { force, dryRun, filter: makeFilter('instructions') });
    totalChanges += getChangeCount(result, dryRun);

    if (!dryRun && result.written > 0) {
      success(`Installed ${result.written} instruction files`);
    }
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
    // Merge installed skills for lockfile (agent dir = .github/skills or ~/.copilot/skills).
    for (const [name, meta] of Object.entries(result.installedSkills)) {
      if (!installedSkillsMap[name]) {
        installedSkillsMap[name] = { canonicalDir: meta.canonicalDir, agents: [] };
      }
      installedSkillsMap[name].agents.push(path.relative(process.cwd(), path.join(targetDir, 'skills')));
    }

    if (!dryRun && result.written > 0) {
      success(`Installed ${result.written} skill files/links`);
    }
  }

  if (scope.shouldInstallHooks) {
    info('Installing hooks...');
    const hooksResult = installHooks({ targetDir, force, dryRun, global: isGlobal });
    totalChanges += getChangeCount(hooksResult, dryRun);
  }

  const configResult = ensureConfigFile({ dryRun, global: isGlobal });
  totalChanges += getChangeCount(configResult, dryRun);

  if (!isGlobal && scope.shouldInstallInstructions && !isCodex) {
    const copilotInstructionsResult = installCopilotInstructions({ targetDir, dryRun });
    totalChanges += getChangeCount(copilotInstructionsResult, dryRun);
  }

  if (!isGlobal && scope.shouldInstallInstructions) {
    const agentsTemplatePath = isCodex
      ? path.join(TEMPLATES_DIR, 'agents', 'AGENTS.codex.md')
      : path.join(TEMPLATES_DIR, 'agents', 'AGENTS.md');
    const agentsResult = installAgentsFile({ templatePath: agentsTemplatePath, force, append, dryRun });
    totalChanges += getChangeCount(agentsResult, dryRun);
  }

  // Write lockfile and update .gitignore for project (non-global, non-dry-run) installs.
  if (!isGlobal && !dryRun && scope.shouldInstallSkills && Object.keys(installedSkillsMap).length > 0) {
    const skillsForLock = {};
    for (const [name, meta] of Object.entries(installedSkillsMap)) {
      skillsForLock[name] = {
        computedHash: computeSkillHash(meta.canonicalDir),
        agents: meta.agents,
      };
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
      console.log(`  1. Update ~/.agents-toolkit.json with your defaults`);
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
  const {
    force = false,
    dryRun = false,
    copy = false,
    global: isGlobal = false,
    filters = { stack: 'all', tracker: 'all' },
    modelPins = 'on',
    models = DEFAULT_CONFIG.models,
    noAgentOverrides = false,
  } = options;
  const scope = getInstallScope(options);
  const claudeDir = getClaudeTargetDir(isGlobal);
  const githubDir = getTargetDir(isGlobal);
  let totalChanges = 0;
  /** @type {Record<string, { canonicalDir: string, agents: string[] }>} */
  const installedSkillsMap = {};

  const makeFilter = (category) => (name) => {
    const basename = name.replace(/\.(prompt\.md|instructions\.md|md)$/, '');
    return shouldIncludeFile(basename, category, filters);
  };

  const promptsFilter = makeFilter('prompts');
  const partialsFilter = makeFilter('partials');
  const claudeTransform = (content) => adaptPathsForClaude(
    transformFrontmatterForClaude(content, {
      claudeModels: models.claude,
      stripModel: modelPins === 'off',
    })
  );

  log('\n🤖 Claude Code Installer\n', 'bright');

  if (dryRun) {
    info('Dry run mode - no files will be copied\n');
  }

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

    if (!dryRun && result.written > 0) {
      success(`Installed ${result.written} command files to .claude/commands/`);
    }
  }

  // Install Claude Code subagent overrides (e.g. Explore.md → cheap tier).
  // Skipped when --no-agent-overrides is passed so users can keep Claude's
  // built-in defaults.
  if (scope.shouldInstallPrompts && !noAgentOverrides) {
    const agentsDir = path.join(TEMPLATES_DIR, 'shared', 'agents');
    if (fs.existsSync(agentsDir)) {
      info('Installing subagent overrides...');
      const result = copyDir(agentsDir, path.join(claudeDir, 'agents'), { force, dryRun });
      totalChanges += getChangeCount(result, dryRun);
      if (!dryRun && result.written > 0) {
        success(`Installed ${result.written} agent override(s) to .claude/agents/`);
      }
    }
  }

  if (scope.shouldInstallInstructions) {
    info('Installing instructions...');
    const result = copyDir(path.join(TEMPLATES_DIR, 'shared', 'instructions'), path.join(githubDir, 'instructions'), { force, dryRun, filter: makeFilter('instructions') });
    totalChanges += getChangeCount(result, dryRun);

    if (!dryRun && result.written > 0) {
      success(`Installed ${result.written} instruction files`);
    }
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
      if (!installedSkillsMap[name]) {
        installedSkillsMap[name] = { canonicalDir: meta.canonicalDir, agents: [] };
      }
      installedSkillsMap[name].agents.push(path.relative(process.cwd(), path.join(claudeDir, 'skills')));
    }

    if (!dryRun && result.written > 0) {
      success(`Installed ${result.written} skill files/links to .claude/skills/`);
    }
  }

  if (!isGlobal && scope.shouldInstallInstructions) {
    const claudeMdPath = path.join(process.cwd(), 'CLAUDE.md');
    const claudeMdTemplate = path.join(TEMPLATES_DIR, 'agents', 'CLAUDE.md');

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

  const configResult = ensureConfigFile({ dryRun, global: isGlobal });
  totalChanges += getChangeCount(configResult, dryRun);

  // Write lockfile and update .gitignore for project (non-global, non-dry-run) installs.
  if (!isGlobal && !dryRun && scope.shouldInstallSkills && Object.keys(installedSkillsMap).length > 0) {
    const skillsForLock = {};
    for (const [name, meta] of Object.entries(installedSkillsMap)) {
      skillsForLock[name] = {
        computedHash: computeSkillHash(meta.canonicalDir),
        agents: meta.agents,
      };
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

/**
 * Restore skills from the lockfile.
 * Reads agents-toolkit-lock.json, reinstalls all skills, and verifies hashes.
 * Restore always overwrites existing skill files — that is its purpose.
 * @param {Object} [options]
 * @param {boolean} [options.dryRun] - Only report planned changes
 * @param {boolean} [options.copy] - Copy instead of symlink
 */
function restore(options = {}) {
  const { dryRun = false, copy = false } = options;
  log('\n🔄 Agents Toolkit Restore\n', 'bright');

  const lockfile = readLockfile();
  if (!lockfile) {
    error(`No ${LOCKFILE_NAME} found. Run "install" first to generate it.`);
    process.exit(1);
  }

  if (lockfile.packageVersion !== VERSION) {
    warn(`Lockfile was created with v${lockfile.packageVersion}, current package is v${VERSION}.`);
    warn('Run "update" to refresh the lockfile for the current version.');
  }

  if (dryRun) {
    info('Dry run mode - no files will be restored\n');
  }

  const { stack = 'all', tracker = 'all' } = lockfile.config || {};
  const filters = { stack, tracker };
  const makeFilter = (category) => (name) => {
    const basename = name.replace(/\.(prompt\.md|instructions\.md|md)$/, '');
    return shouldIncludeFile(basename, category, filters);
  };

  // Determine which agent dirs were recorded in the lockfile.
  const agentDirs = new Set();
  for (const meta of Object.values(lockfile.skills || {})) {
    for (const agentDir of (meta.agents || [])) {
      agentDirs.add(agentDir);
    }
  }

  // Reinstall into each unique agent skills dir.
  let totalRestored = 0;
  for (const agentDir of agentDirs) {
    const agentSkillsDir = path.join(process.cwd(), agentDir);
    const result = installSkillsStandard({
      isGlobal: false,
      agentSkillsDir,
      force: true, // restore always overwrites — that is its purpose
      dryRun,
      copy,
      dirFilter: makeFilter('skills'),
    });
    totalRestored += dryRun ? result.planned : result.written;
  }

  if (dryRun) {
    info(`Dry run complete. ${totalRestored} files would be restored.`);
    return;
  }

  // Verify hashes match the lockfile.
  const canonicalDir = getAgentsSkillsDir(false);
  let allMatch = true;
  for (const [name, meta] of Object.entries(lockfile.skills || {})) {
    const canonicalSkillDir = path.join(canonicalDir, name);
    const hash = computeSkillHash(canonicalSkillDir);
    if (hash !== meta.computedHash) {
      warn(`Hash mismatch for skill "${name}" — expected ${meta.computedHash?.slice(0, 12)}… got ${hash?.slice(0, 12)}…`);
      allMatch = false;
    }
  }

  console.log('');
  if (allMatch) {
    success(`Restored ${Object.keys(lockfile.skills || {}).length} skills successfully.`);
  } else {
    warn(`Restored with hash mismatches. Run "update" to refresh the lockfile.`);
  }
  console.log('');
}

/**
 * Show the status of installed skills relative to the lockfile.
 * Exits with code 1 if any skill is missing or has a hash mismatch.
 */
function status() {
  log('\n📊 Agents Toolkit Status\n', 'bright');

  const lockfile = readLockfile();
  if (!lockfile) {
    error(`No ${LOCKFILE_NAME} found. Run "install" first to generate it.`);
    process.exit(1);
  }

  const canonicalDir = getAgentsSkillsDir(false);
  const skills = lockfile.skills || {};
  let hasIssues = false;

  if (Object.keys(skills).length === 0) {
    info('No skills recorded in lockfile.');
    return;
  }

  if (lockfile.packageVersion !== VERSION) {
    warn(`Lockfile package version: v${lockfile.packageVersion} — current: v${VERSION}`);
  }

  console.log('');
  const COL_NAME = 28;
  const COL_STATUS = 14;
  const header = `${'Skill'.padEnd(COL_NAME)} ${'Status'.padEnd(COL_STATUS)} Hash`;
  log(header, 'cyan');
  log('─'.repeat(header.length), 'cyan');

  for (const [name, meta] of Object.entries(skills)) {
    const canonicalSkillDir = path.join(canonicalDir, name);
    const hash = computeSkillHash(canonicalSkillDir);

    let statusLabel;
    let statusColor;

    if (hash === null) {
      statusLabel = 'missing';
      statusColor = 'red';
      hasIssues = true;
    } else if (hash !== meta.computedHash) {
      statusLabel = 'modified';
      statusColor = 'yellow';
      hasIssues = true;
    } else {
      statusLabel = 'up-to-date';
      statusColor = 'green';
    }

    const hashDisplay = hash ? hash.slice(0, 12) + '…' : '—';
    const line = `${name.padEnd(COL_NAME)} ${statusLabel.padEnd(COL_STATUS)} ${hashDisplay}`;
    log(line, statusColor);
  }

  console.log('');

  if (hasIssues) {
    warn('Some skills are out of sync. Run "restore" or "update" to fix.');
    process.exit(1);
  } else {
    success(`All ${Object.keys(skills).length} skills are up-to-date.`);
  }
  console.log('');
}

/**
 * List available prompts
 */
function list() {
  log('\n📋 Available Prompts\n', 'bright');

  const promptsDir = path.join(TEMPLATES_DIR, 'shared', 'prompts');
  
  if (!fs.existsSync(promptsDir)) {
    error('Templates directory not found');
    return;
  }

  const prompts = fs.readdirSync(promptsDir)
    .filter(f => f.endsWith('.prompt.md'))
    .map(f => f.replace('.prompt.md', ''));

  log('Workflow Prompts:', 'cyan');
  const workflowPrompts = ['analyze-ticket', 'create-plan', 'work-ticket', 'prepare-pr', 'create-pr', 'finalize-pr', 'analyze-github-issue', 'work-github-issue', 'create-github-pr', 'finalize-github-pr'];
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
  const skillsDir = path.join(TEMPLATES_DIR, 'shared', 'skills');
  if (fs.existsSync(skillsDir)) {
    const skills = fs.readdirSync(skillsDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);
    skills.forEach(s => {
      console.log(`  • ${s}`);
    });
  }

  console.log('');
  log('Hooks:', 'cyan');
  const hooksDir = path.join(TEMPLATES_DIR, 'shared', 'hooks');
  if (fs.existsSync(hooksDir)) {
    const hooks = fs.readdirSync(hooksDir)
      .filter(f => f.endsWith('.json'));
    hooks.forEach(h => {
      console.log(`  • ${h.replace('.json', '')}`);
    });
  }
  console.log('');
}

/**
 * Show help message
 */
function showHelp() {
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
  console.log('  --model-pins <val>  Ship `model:` frontmatter: on | off (default: on)');
  console.log('  --no-agent-overrides  Skip installing .claude/agents/ overrides (Claude only)');
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
 * Parse command line arguments
 * @returns {Object} Parsed arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  const flags = args.slice(1);

  let target = null;
  let stack = null;
  let tracker = null;
  let modelPins = null;
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
    } else if (arg === '--stack') {
      const value = flags[i + 1];
      if (value && !value.startsWith('-')) {
        stack = value;
        i++;
      } else {
        stack = '';
      }
    } else if (arg.startsWith('--stack=')) {
      stack = arg.split('=').slice(1).join('=');
    } else if (arg === '--tracker') {
      const value = flags[i + 1];
      if (value && !value.startsWith('-')) {
        tracker = value;
        i++;
      } else {
        tracker = '';
      }
    } else if (arg.startsWith('--tracker=')) {
      tracker = arg.split('=').slice(1).join('=');
    } else if (arg === '--model-pins') {
      const value = flags[i + 1];
      if (value && !value.startsWith('-')) {
        modelPins = value;
        i++;
      } else {
        modelPins = '';
      }
    } else if (arg.startsWith('--model-pins=')) {
      modelPins = arg.split('=').slice(1).join('=');
    }
  }

  const options = {
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
    modelPins,
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
 * Resolve stack and tracker filters from flags or config file
 * Resolution order: CLI flags > project config > global config > defaults
 * @param {Object} options - Parsed CLI options
 * @returns {{ stack: string, tracker: string }} Resolved filters
 */
function resolveFilters(options = {}) {
  const validStacks = ['react', 'wordpress', 'all'];
  const validTrackers = ['jira', 'github', 'all'];

  let stack = 'all';
  let tracker = 'all';

  // Check global config first (~/.agents-toolkit.json)
  const globalConfigPath = path.join(getHomeDir(), '.agents-toolkit.json');
  if (fs.existsSync(globalConfigPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(globalConfigPath, 'utf-8'));
      if (config.stack) stack = config.stack;
      if (config.tracker) tracker = config.tracker;
    } catch {
      // Ignore invalid config
    }
  }

  // Project config overrides global
  const configPath = path.join(process.cwd(), '.agents-toolkit.json');
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (config.stack) stack = config.stack;
      if (config.tracker) tracker = config.tracker;
    } catch {
      // Ignore invalid config
    }
  }

  if (options.stack !== null && options.stack !== undefined) {
    const value = options.stack.trim().toLowerCase();
    if (!value) {
      error('Missing value for --stack. Use react, wordpress, or all.');
      process.exit(1);
    }
    if (!validStacks.includes(value)) {
      error(`Invalid --stack value: ${options.stack}. Use react, wordpress, or all.`);
      process.exit(1);
    }
    stack = value;
  }

  if (options.tracker !== null && options.tracker !== undefined) {
    const value = options.tracker.trim().toLowerCase();
    if (!value) {
      error('Missing value for --tracker. Use jira, github, or all.');
      process.exit(1);
    }
    if (!validTrackers.includes(value)) {
      error(`Invalid --tracker value: ${options.tracker}. Use jira, github, or all.`);
      process.exit(1);
    }
    tracker = value;
  }

  return { stack, tracker };
}

/**
 * Read the `models` block and `modelPins` toggle from the resolved config
 * chain (global → project → CLI flag).
 * `--model-pins off` strips shipped `model:` frontmatter during install so
 * every prompt falls back to the agent's globally-configured default.
 * `--model-pins on` (default) keeps the shipped pins and applies any user
 * overrides from `.agents-toolkit.json` `models.{copilot,claude}.{cheap,smart}`.
 * @param {Object} [options] - Parsed CLI options
 * @returns {{ modelPins: 'on'|'off', models: { copilot: {cheap:string,smart:string}, claude: {cheap:string,smart:string} } }}
 */
function resolveModelSettings(options = {}) {
  const validPins = ['on', 'off'];
  let modelPins = 'on';
  const models = {
    copilot: { ...DEFAULT_CONFIG.models.copilot },
    claude: { ...DEFAULT_CONFIG.models.claude },
  };

  const applyConfigFile = (configPath) => {
    if (!fs.existsSync(configPath)) return;
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      if (config.modelPins && validPins.includes(config.modelPins)) {
        modelPins = config.modelPins;
      }
      if (config.models && typeof config.models === 'object') {
        for (const agent of ['copilot', 'claude']) {
          const agentModels = config.models[agent];
          if (agentModels && typeof agentModels === 'object') {
            if (typeof agentModels.cheap === 'string' && agentModels.cheap.trim()) {
              models[agent].cheap = agentModels.cheap.trim();
            }
            if (typeof agentModels.smart === 'string' && agentModels.smart.trim()) {
              models[agent].smart = agentModels.smart.trim();
            }
          }
        }
      }
    } catch {
      // Ignore invalid config.
    }
  };

  applyConfigFile(path.join(getHomeDir(), '.agents-toolkit.json'));
  applyConfigFile(path.join(process.cwd(), '.agents-toolkit.json'));

  if (options.modelPins !== null && options.modelPins !== undefined) {
    const value = options.modelPins.trim().toLowerCase();
    if (!value) {
      error('Missing value for --model-pins. Use on or off.');
      process.exit(1);
    }
    if (!validPins.includes(value)) {
      error(`Invalid --model-pins value: ${options.modelPins}. Use on or off.`);
      process.exit(1);
    }
    modelPins = value;
  }

  return { modelPins, models };
}

/**
 * Main CLI entry point
 */
function main() {
  const { command, options } = parseArgs();
  const target = (command === 'install' || command === 'update')
    ? resolveInstallTarget(options)
    : null;
  const filters = (command === 'install' || command === 'update')
    ? resolveFilters(options)
    : { stack: 'all', tracker: 'all' };
  const modelSettings = (command === 'install' || command === 'update')
    ? resolveModelSettings(options)
    : { modelPins: 'on', models: DEFAULT_CONFIG.models };
  const installOptions = { ...options, filters, ...modelSettings };

  switch (command) {
    case 'install':
      if (target === 'claude') {
        installClaude(installOptions);
      } else if (target === 'codex') {
        installCodex(installOptions);
      } else {
        install(installOptions);
      }
      break;
    case 'restore':
      restore(options);
      break;
    case 'status':
      status();
      break;
    case 'update':
      if (target === 'claude') {
        installClaude({ ...installOptions, force: true });
      } else if (target === 'codex') {
        installCodex({ ...installOptions, force: true });
      } else {
        install({ ...installOptions, force: true });
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
