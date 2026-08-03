/** ANSI color key used by logging helpers. */
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
 * Prints a message to the console with an optional ANSI color.
 *
 * @param message - The text to print.
 * @param color - ANSI color key (default: `'reset'`).
 */
export function log(message: string, color: ColorKey = 'reset'): void {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

/** Prints a green ✅ success message. */
export function success(message: string): void {
  log(`✅ ${message}`, 'green');
}

/** Prints a yellow ⚠️ warning message. */
export function warn(message: string): void {
  log(`⚠️  ${message}`, 'yellow');
}

/** Prints a red ❌ error message. */
export function error(message: string): void {
  log(`❌ ${message}`, 'red');
}

/** Prints a blue ℹ️ informational message. */
export function info(message: string): void {
  log(`ℹ️  ${message}`, 'blue');
}
