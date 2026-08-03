import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { success } from '../logger.js';
import type { InstallFilters, Lockfile, LockfileEntry, SkillMeta } from '../types.js';

/** Filename of the skill lockfile written at the project root. */
export const LOCKFILE_NAME = 'agents-toolkit-lock.json';

/** Computes a SHA-256 hex digest of SKILL.md, or null if the file is absent. */
export function computeSkillHash(skillDir: string): string | null {
  const skillMdPath = path.join(skillDir, 'SKILL.md');
  if (!fs.existsSync(skillMdPath)) return null;
  const content = fs.readFileSync(skillMdPath, 'utf-8');
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Parses and validates the lockfile at the given directory.
 *
 * @param cwd - Directory to look in (defaults to `process.cwd()`).
 * @returns The parsed lockfile, or `null` if absent, unreadable, or structurally invalid.
 */
export function readLockfile(cwd = process.cwd()): Lockfile | null {
  const lockPath = path.join(cwd, LOCKFILE_NAME);
  if (!fs.existsSync(lockPath)) return null;
  try {
    const raw: unknown = JSON.parse(fs.readFileSync(lockPath, 'utf-8'));
    if (typeof raw !== 'object' || raw === null) return null;
    const obj = raw as Record<string, unknown>;

    // Validate required top-level fields before trusting the rest of the structure.
    if (obj['version'] !== 1) return null;
    if (typeof obj['packageVersion'] !== 'string') return null;

    // Validate config shape — restore/status dereference config.stack and config.tracker directly.
    const config = obj['config'];
    if (typeof config !== 'object' || config === null) return null;
    const cfg = config as Record<string, unknown>;
    if (typeof cfg['stack'] !== 'string' || typeof cfg['tracker'] !== 'string') return null;

    // Validate skills map — each entry must have an agents array of strings and a string/null hash.
    const skills = obj['skills'];
    if (typeof skills !== 'object' || skills === null) return null;
    for (const entry of Object.values(skills as Record<string, unknown>)) {
      if (typeof entry !== 'object' || entry === null) return null;
      const e = entry as Record<string, unknown>;
      const agents = e['agents'];
      if (!Array.isArray(agents)) return null;
      if (!(agents as unknown[]).every((a) => typeof a === 'string')) return null;
      const hash = e['computedHash'];
      if (hash !== null && typeof hash !== 'string') return null;
    }

    return raw as Lockfile;
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
