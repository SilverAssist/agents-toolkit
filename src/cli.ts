#!/usr/bin/env node

import { resolveFilters } from './config/index.js';
import { error } from './logger.js';
import {
  install,
  installClaude,
  installCodex,
  restore,
  status,
  list,
  showHelp,
  parseArgs,
  resolveInstallTarget,
} from './commands/index.js';

function main(): void {
  const { command, options } = parseArgs();
  const isInstallCommand = command === 'install' || command === 'update';
  const target = isInstallCommand ? resolveInstallTarget(options) : null;
  const filters = isInstallCommand ? resolveFilters(options) : { stack: 'all', tracker: 'all' };
  const installOptions = { ...options, filters };

  switch (command) {
    case 'install':
      if (target === 'claude') installClaude(installOptions);
      else if (target === 'codex') installCodex(installOptions);
      else install(installOptions);
      break;
    case 'restore':
      restore(options);
      break;
    case 'status':
      status();
      break;
    case 'update':
      if (target === 'claude') installClaude({ ...installOptions, force: true });
      else if (target === 'codex') installCodex({ ...installOptions, force: true });
      else install({ ...installOptions, force: true });
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
