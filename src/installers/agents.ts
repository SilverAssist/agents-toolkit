import fs from 'node:fs';
import path from 'node:path';

import { info, success } from '../logger.js';
import type { InstallResult } from '../types.js';

function getAgentsTemplateBody(templateContent: string): string {
  const lines = templateContent.split('\n');
  const dividerIndex = lines.indexOf('---');
  if (dividerIndex === -1) return templateContent;
  return lines
    .slice(dividerIndex + 1)
    .join('\n')
    .trimStart();
}

interface InstallAgentsFileOptions {
  templatePath: string;
  force?: boolean;
  append?: boolean;
  dryRun?: boolean;
}

export function installAgentsFile({
  templatePath,
  force = false,
  append = false,
  dryRun = false,
}: InstallAgentsFileOptions): InstallResult {
  const result: InstallResult = { written: 0, planned: 0 };
  const agentsPath = path.join(process.cwd(), 'AGENTS.md');

  if (!fs.existsSync(templatePath)) return result;

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
  fs.writeFileSync(agentsPath, `${existingContent}\n\n<!-- Added by agents-toolkit (--append) -->\n\n${templateBody}`);
  success('Appended missing sections to AGENTS.md');
  result.written++;
  return result;
}
