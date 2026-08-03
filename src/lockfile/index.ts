import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { success } from '../logger.js';
import type { InstallFilters, Lockfile, LockfileEntry, SkillMeta } from '../types.js';

/**
 * Lockfile name.
 *
 * @remarks TODO(tsdoc): verify this generated summary.
 */
export const LOCKFILE_NAME = 'agents-toolkit-lock.json';

/** Computes a SHA-256 hex digest of SKILL.md, or null if the file is absent. */
export function computeSkillHash(skillDir: string): string | null {
  const skillMdPath = path.join(skillDir, 'SKILL.md');
  if (!fs.existsSync(skillMdPath)) return null;
  const content = fs.readFileSync(skillMdPath, 'utf-8');
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Reads the lockfile.
 *
 * @remarks TODO(tsdoc): verify this generated summary.
 *
 * @param cwd - TODO(tsdoc): describe cwd (optional).
 * @returns TODO(tsdoc): describe the return value.
 */
export function readLockfile(cwd = process.cwd()): Lockfile | null {
  const lockPath = path.join(cwd, LOCKFILE_NAME);
  if (!fs.existsSync(lockPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(lockPath, 'utf-8')) as Lockfile;
  } catch {
    return null;
  }
}

interface WriteLockfileParams {
  skills: Record<string, SkillMeta>;
  config: InstallFilters;
  packageVersion: string;
  cwd?: string;
}

/** Merges new skill entries with any existing lockfile so successive multi-target installs accumulate entries. */
export function writeLockfile({ skills, config, packageVersion, cwd = process.cwd() }: WriteLockfileParams): void {
  const lockPath = path.join(cwd, LOCKFILE_NAME);

  const existing = readLockfile(cwd);
  const mergedSkills: Record<string, LockfileEntry> = Object.assign({}, existing?.skills ?? {});

  for (const [name, meta] of Object.entries(skills)) {
    const prev: LockfileEntry | undefined = mergedSkills[name];
    const prevAgents = prev?.agents ?? [];
    const allAgents = Array.from(new Set([...prevAgents, ...meta.agents]));
    mergedSkills[name] = {
      source: '@silverassist/agents-toolkit',
      packageVersion,
      computedHash: meta.computedHash,
      agents: allAgents,
    };
  }

  const lockfile: Lockfile = { version: 1, packageVersion, config, skills: mergedSkills };
  fs.writeFileSync(lockPath, JSON.stringify(lockfile, null, 2) + '\n', 'utf-8');
  success(`Wrote ${LOCKFILE_NAME}`);
}
