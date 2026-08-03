import { fileURLToPath } from 'node:url';
import path from 'node:path';

export const TEMPLATES_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'templates');
