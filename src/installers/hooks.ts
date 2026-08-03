import fs from 'node:fs';
import path from 'node:path';

import { TEMPLATES_DIR } from '../constants.js';
import { success, warn } from '../logger.js';
import { copyDir } from '../copy/index.js';
import type { InstallResult } from '../types.js';

interface InstallHooksOptions {
  targetDir: string;
  force?: boolean;
  dryRun?: boolean;
  global?: boolean;
}

function finalizeHookConfigs(hooksDest: string, isGlobal: boolean): void {
  const cwd = isGlobal ? hooksDest : path.relative(process.cwd(), hooksDest).split(path.sep).join('/');

  const jsonFiles = fs.readdirSync(hooksDest).filter((f) => f.endsWith('.json'));
  for (const file of jsonFiles) {
    const filePath = path.join(hooksDest, file);
    const config = JSON.parse(fs.readFileSync(filePath, 'utf-8')) as {
      version?: number;
      hooks?: Record<string, Array<{ cwd?: string }>>;
    };
    config.version = 1;
    for (const events of Object.values(config.hooks ?? {})) {
      for (const entry of events) {
        entry.cwd = cwd;
      }
    }
    fs.writeFileSync(filePath, JSON.stringify(config, null, 2) + '\n');
  }
}

/**
 * Install hooks.
 *
 * @remarks TODO(tsdoc): verify this generated summary.
 *
 * @param options - TODO(tsdoc): describe options.
 * @returns TODO(tsdoc): describe the return value.
 */
export function installHooks({
  targetDir,
  force = false,
  dryRun = false,
  global: isGlobal = false,
}: InstallHooksOptions): InstallResult {
  const hooksSrc = path.join(TEMPLATES_DIR, 'shared', 'hooks');
  const hooksDest = path.join(targetDir, 'hooks');

  if (!fs.existsSync(hooksSrc)) {
    warn('No hooks templates found — skipping');
    return { written: 0, planned: 0 };
  }

  const result = copyDir(hooksSrc, hooksDest, { force, dryRun });

  if (!dryRun) {
    const scriptsDir = path.join(hooksDest, 'scripts');
    if (fs.existsSync(scriptsDir)) {
      for (const script of fs.readdirSync(scriptsDir).filter((f) => f.endsWith('.sh'))) {
        fs.chmodSync(path.join(scriptsDir, script), 0o755);
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
