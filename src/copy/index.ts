import fs from 'node:fs';
import path from 'node:path';

import { TEMPLATES_DIR } from '../constants.js';
import { info, warn } from '../logger.js';
import { getAgentsSkillsDir } from '../paths.js';
import type { CopyOptions, InstallResult, SkillInstallResult } from '../types.js';

/**
 * Recursively copies `src` into `dest`, applying optional rename, transform, and filter callbacks.
 *
 * @param src - Source directory.
 * @param dest - Destination directory (created if absent).
 * @param options - Copy options: force, dryRun, renameFile, transformContent, filter, dirFilter, partialsFilter.
 * @returns Written and planned change counts.
 */
export function copyDir(src: string, dest: string, options: CopyOptions = {}): InstallResult {
  const {
    force = false,
    dryRun = false,
    renameFile = (name: string) => name,
    transformContent,
    filter,
    dirFilter,
    partialsFilter,
  } = options;
  const totals: InstallResult = { written: 0, planned: 0 };

  if (!fs.existsSync(src)) return totals;

  if (!dryRun && !fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);

    if (entry.isDirectory()) {
      if (dirFilter !== undefined && !dirFilter(entry.name)) continue;

      const nestedOptions: CopyOptions = { ...options };
      if (entry.name === '_partials' && partialsFilter !== undefined) {
        nestedOptions.filter = partialsFilter;
      }
      const nested = copyDir(srcPath, path.join(dest, entry.name), nestedOptions);
      totals.written += nested.written;
      totals.planned += nested.planned;
    } else {
      if (filter !== undefined && !filter(entry.name)) continue;

      const destName = renameFile(entry.name);
      const destPath = path.join(dest, destName);

      if (fs.existsSync(destPath) && !force) {
        warn(`Skipping existing file: ${path.relative(process.cwd(), destPath)}`);
        continue;
      }

      totals.planned++;

      if (dryRun) {
        info(`Would copy: ${path.relative(process.cwd(), destPath)}`);
      } else {
        if (transformContent !== undefined) {
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

/**
 * Appends managed skill directory entries to `.gitignore` if not already present.
 *
 * @param cwd - Project root directory.
 */
export function appendSkillsToGitignore(cwd: string): void {
  const gitignorePath = path.join(cwd, '.gitignore');
  const block = [
    '',
    '# agents-toolkit managed — regenerate with: npx @silverassist/agents-toolkit restore',
    '.agents/skills/',
    '.github/skills/',
    '.claude/skills/',
  ].join('\n');

  const existing = fs.existsSync(gitignorePath) ? fs.readFileSync(gitignorePath, 'utf-8') : '';

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

interface LinkSkillOptions {
  dryRun?: boolean;
  force?: boolean;
  copy?: boolean;
}

/**
 * Creates a symlink from an agent's skills directory to the canonical store entry,
 * falling back to a file copy when symlinks are unsupported.
 *
 * @param canonicalSkillDir - Skill folder in the canonical `.agents/skills/` store.
 * @param agentSkillLinkPath - Target path in the agent's skills directory.
 * @param options - `dryRun`, `force`, and `copy` (force a real copy instead of a symlink).
 * @returns Written and planned change counts.
 */
export function linkSkill(
  canonicalSkillDir: string,
  agentSkillLinkPath: string,
  options: LinkSkillOptions = {},
): InstallResult {
  const { dryRun = false, force = false, copy = false } = options;
  const totals: InstallResult = { written: 0, planned: 0 };

  const relTarget = path.relative(path.dirname(agentSkillLinkPath), canonicalSkillDir);
  const rel = (p: string) => path.relative(process.cwd(), p);

  let existing: fs.Stats | null = null;
  try {
    existing = fs.lstatSync(agentSkillLinkPath);
  } catch {
    // path does not exist — existing stays null
  }

  if (existing !== null) {
    if (existing.isSymbolicLink() && !copy) {
      const current = fs.readlinkSync(agentSkillLinkPath);
      if (path.resolve(path.dirname(agentSkillLinkPath), current) === path.resolve(canonicalSkillDir)) {
        return totals;
      }
    }
    if (!force) {
      warn(`Skipping existing skill: ${rel(agentSkillLinkPath)}`);
      return totals;
    }
    if (!dryRun) fs.rmSync(agentSkillLinkPath, { recursive: true, force: true });
  }

  totals.planned++;

  if (dryRun) {
    info(
      copy ? `Would copy skill: ${rel(agentSkillLinkPath)}` : `Would link: ${rel(agentSkillLinkPath)} -> ${relTarget}`,
    );
    return totals;
  }

  fs.mkdirSync(path.dirname(agentSkillLinkPath), { recursive: true });

  const doCopy = () => copyDir(canonicalSkillDir, agentSkillLinkPath, { force: true });

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

interface InstallSkillsParams {
  isGlobal: boolean;
  agentSkillsDir: string;
  force?: boolean;
  dryRun?: boolean;
  copy?: boolean;
  dirFilter?: (name: string) => boolean;
}

/**
 * Installs skills following the `npx skills` standard: copies each skill once into the
 * canonical `.agents/skills/` store, then symlinks the agent’s skills directory entries to it.
 *
 * @param options - `isGlobal`, `agentSkillsDir`, `force`, `dryRun`, `copy`, and `dirFilter`.
 * @returns Change counts plus a map of installed skill names to their canonical directories.
 */
export function installSkillsStandard({
  isGlobal,
  agentSkillsDir,
  force = false,
  dryRun = false,
  copy = false,
  dirFilter,
}: InstallSkillsParams): SkillInstallResult {
  const totals: SkillInstallResult = { written: 0, planned: 0, installedSkills: {} };
  const skillsSrc = path.join(TEMPLATES_DIR, 'shared', 'skills');
  const canonicalDir = getAgentsSkillsDir(isGlobal);

  if (!fs.existsSync(skillsSrc)) return totals;

  const canonicalResult = copyDir(skillsSrc, canonicalDir, {
    force,
    dryRun,
    ...(dirFilter !== undefined ? { dirFilter } : {}),
  });
  totals.written += canonicalResult.written;
  totals.planned += canonicalResult.planned;

  const entries = fs.readdirSync(skillsSrc, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (dirFilter !== undefined && !dirFilter(entry.name)) continue;

    const canonicalSkillDir = path.join(canonicalDir, entry.name);
    const agentSkillLinkPath = path.join(agentSkillsDir, entry.name);
    const linkResult = linkSkill(canonicalSkillDir, agentSkillLinkPath, { dryRun, force, copy });
    totals.written += linkResult.written;
    totals.planned += linkResult.planned;
    totals.installedSkills[entry.name] = { canonicalDir: canonicalSkillDir };
  }

  return totals;
}
