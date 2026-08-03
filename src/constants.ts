import { fileURLToPath } from 'node:url';
import path from 'node:path';

/** Absolute path to the bundled `templates/` directory, resolved at runtime from `import.meta.url`. */
export const TEMPLATES_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'templates');
