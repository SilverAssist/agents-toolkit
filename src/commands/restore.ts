import path from 'node:path';

import { VERSION } from '../index.js';
import { log, info, warn, error, success } from '../logger.js';
import { getAgentsSkillsDir } from '../paths.js';
import { installSkillsStandard } from '../copy/index.js';
import { computeSkillHash, readLockfile, LOCKFILE_NAME } from '../lockfile/index.js';
import { shouldIncludeFile } from '../filter/index.js';
import type { FileCategoryKey } from '../filter/index.js';
import type { InstallFilters } from '../types.js';

interface RestoreOptions {
  dryRun?: boolean;
  copy?: boolean;
}

export function restore(options: RestoreOptions = {}): void {
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

  if (dryRun) info('Dry run mode - no files will be restored\n');

  const stack = lockfile.config.stack;
  const tracker = lockfile.config.tracker;
  const filters: InstallFilters = { stack, tracker };
  const makeFilter =
    (category: FileCategoryKey) =>
    (name: string): boolean => {
      const basename = name.replace(/\.(prompt\.md|instructions\.md|md)$/, '');
      return shouldIncludeFile(basename, category, filters);
    };

  const agentDirs = new Set<string>();
  for (const meta of Object.values(lockfile.skills)) {
    for (const agentDir of meta.agents) {
      agentDirs.add(agentDir);
    }
  }

  let totalRestored = 0;
  for (const agentDir of agentDirs) {
    const agentSkillsDir = path.join(process.cwd(), agentDir);
    const result = installSkillsStandard({
      isGlobal: false,
      agentSkillsDir,
      force: true,
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

  const canonicalDir = getAgentsSkillsDir(false);
  let allMatch = true;
  for (const [name, meta] of Object.entries(lockfile.skills)) {
    const canonicalSkillDir = path.join(canonicalDir, name);
    const hash = computeSkillHash(canonicalSkillDir);
    if (hash !== meta.computedHash) {
      warn(
        `Hash mismatch for skill "${name}" — expected ${meta.computedHash?.slice(0, 12)}… got ${hash?.slice(0, 12)}…`,
      );
      allMatch = false;
    }
  }

  console.log('');
  if (allMatch) {
    success(`Restored ${Object.keys(lockfile.skills).length} skills successfully.`);
  } else {
    warn('Restored with hash mismatches. Run "update" to refresh the lockfile.');
  }
  console.log('');
}
