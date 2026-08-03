import fs from 'node:fs';
import path from 'node:path';

import { TEMPLATES_DIR } from '../constants.js';
import { info, success } from '../logger.js';
import type { InstallResult } from '../types.js';

/**
 * Installs or appends `copilot-instructions.md` in the target directory.
 *
 * @param options - Target directory and `dryRun` flag.
 * @returns Written and planned change counts.
 */
export function installCopilotInstructions(
  options: { targetDir: string; dryRun?: boolean } = { targetDir: '' },
): InstallResult {
  const { targetDir, dryRun = false } = options;
  const result: InstallResult = { written: 0, planned: 0 };
  const copilotInstructionsPath = path.join(targetDir, 'copilot-instructions.md');
  const templatePath = path.join(TEMPLATES_DIR, 'agents', 'copilot-instructions.md');

  if (!fs.existsSync(templatePath)) return result;

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
    fs.writeFileSync(
      copilotInstructionsPath,
      `${existingContent}\n\n<!-- Added by agents-toolkit -->\n${sectionsToAppend}`,
    );
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
