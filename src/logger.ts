/**
 * Color key.
 *
 * @remarks TODO(tsdoc): verify this generated summary.
 */
export type ColorKey = 'reset' | 'bright' | 'green' | 'yellow' | 'blue' | 'red' | 'cyan';

const COLORS: Record<ColorKey, string> = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

/**
 * Log.
 *
 * @remarks TODO(tsdoc): verify this generated summary.
 *
 * @param message - TODO(tsdoc): describe message.
 * @param color - TODO(tsdoc): describe color (optional).
 */
export function log(message: string, color: ColorKey = 'reset'): void {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

/**
 * Success.
 *
 * @remarks TODO(tsdoc): verify this generated summary.
 *
 * @param message - TODO(tsdoc): describe message.
 */
export function success(message: string): void {
  log(`✅ ${message}`, 'green');
}

/**
 * Warn.
 *
 * @remarks TODO(tsdoc): verify this generated summary.
 *
 * @param message - TODO(tsdoc): describe message.
 */
export function warn(message: string): void {
  log(`⚠️  ${message}`, 'yellow');
}

/**
 * Error.
 *
 * @remarks TODO(tsdoc): verify this generated summary.
 *
 * @param message - TODO(tsdoc): describe message.
 */
export function error(message: string): void {
  log(`❌ ${message}`, 'red');
}

/**
 * Info.
 *
 * @remarks TODO(tsdoc): verify this generated summary.
 *
 * @param message - TODO(tsdoc): describe message.
 */
export function info(message: string): void {
  log(`ℹ️  ${message}`, 'blue');
}
