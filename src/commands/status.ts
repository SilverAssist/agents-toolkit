import fs from 'node:fs';
import path from 'node:path';

import { TEMPLATES_DIR } from '../constants.js';
import { VERSION } from '../index.js';
import { log, info, warn, error, success } from '../logger.js';
import type { ColorKey } from '../logger.js';
import { getAgentsSkillsDir } from '../paths.js';
import { computeSkillHash, readLockfile, LOCKFILE_NAME } from '../lockfile/index.js';

/**
 * Status.
 *
 * @remarks TODO(tsdoc): verify this generated summary.
 */
export function status(): void {
  log('\n📊 Agents Toolkit Status\n', 'bright');

  const lockfile = readLockfile();
  if (!lockfile) {
    error(`No ${LOCKFILE_NAME} found. Run "install" first to generate it.`);
    process.exit(1);
  }

  const canonicalDir = getAgentsSkillsDir(false);
  const skills = lockfile.skills;
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

    let statusLabel: string;
    let statusColor: ColorKey;

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

    const hashDisplay = hash !== null ? `${hash.slice(0, 12)}…` : '—';
    log(`${name.padEnd(COL_NAME)} ${statusLabel.padEnd(COL_STATUS)} ${hashDisplay}`, statusColor);
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
 * List.
 *
 * @remarks TODO(tsdoc): verify this generated summary.
 */
export function list(): void {
  log('\n📋 Available Prompts\n', 'bright');

  const promptsDir = path.join(TEMPLATES_DIR, 'shared', 'prompts');

  if (!fs.existsSync(promptsDir)) {
    error('Templates directory not found');
    return;
  }

  const prompts = fs
    .readdirSync(promptsDir)
    .filter((f) => f.endsWith('.prompt.md'))
    .map((f) => f.replace('.prompt.md', ''));

  const workflowPrompts = [
    'analyze-ticket',
    'create-plan',
    'work-ticket',
    'prepare-pr',
    'create-pr',
    'finalize-pr',
    'analyze-github-issue',
    'work-github-issue',
    'create-github-pr',
    'finalize-github-pr',
  ];

  log('Workflow Prompts:', 'cyan');
  workflowPrompts.forEach((p, i) => {
    if (prompts.includes(p)) console.log(`  ${i + 1}. ${p}`);
  });

  console.log('');
  log('Utility Prompts:', 'cyan');
  prompts.filter((p) => !workflowPrompts.includes(p)).forEach((p) => console.log(`  • ${p}`));

  console.log('');
  log('Partials:', 'cyan');
  const partialsDir = path.join(promptsDir, '_partials');
  if (fs.existsSync(partialsDir)) {
    fs.readdirSync(partialsDir)
      .filter((f) => f.endsWith('.md') && f !== 'README.md')
      .forEach((p) => console.log(`  • ${p.replace('.md', '')}`));
  }

  console.log('');
  log('Skills:', 'cyan');
  const skillsDir = path.join(TEMPLATES_DIR, 'shared', 'skills');
  if (fs.existsSync(skillsDir)) {
    fs.readdirSync(skillsDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .forEach((d) => console.log(`  • ${d.name}`));
  }

  console.log('');
  log('Hooks:', 'cyan');
  const hooksDir = path.join(TEMPLATES_DIR, 'shared', 'hooks');
  if (fs.existsSync(hooksDir)) {
    fs.readdirSync(hooksDir)
      .filter((f) => f.endsWith('.json'))
      .forEach((h) => console.log(`  • ${h.replace('.json', '')}`));
  }
  console.log('');
}
