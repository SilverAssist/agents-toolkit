import { fileURLToPath } from 'node:url';
import path from 'node:path';

/**
 * Templates dir.
 *
 * @remarks TODO(tsdoc): verify this generated summary.
 */
export const TEMPLATES_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'templates');
