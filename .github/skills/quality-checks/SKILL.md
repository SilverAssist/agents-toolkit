---
name: quality-checks
description: Run and troubleshoot code quality tools for Silver Assist WordPress plugins. Covers PHPCS (WordPress Coding Standards), PHPStan (static analysis level 8), PHPUnit test execution, the unified quality check script, and CI/CD integration. Use when fixing code style errors, running quality checks, or troubleshooting CI failures.
---

# Silver Assist — Quality Checks

This skill covers running, configuring, and troubleshooting the code quality tools used across all Silver Assist WordPress plugins.

## When to Use

- Running PHPCS, PHPStan, or PHPUnit checks
- Fixing code style errors or warnings
- Troubleshooting CI/CD quality check failures
- Configuring quality tool settings
- Understanding PHPCS rules and exclusions
- Resolving PHPStan level 8 type errors

## Prerequisites

- `composer install` completed in the plugin directory
- PHP 8.2+ available
- For PHPUnit: WordPress Test Suite installed (or `--skip-wp-setup` for local)

---

## Quick Reference

```bash
# Auto-fix formatting.
vendor/bin/phpcbf

# Check code standards (must pass with 0 errors).
vendor/bin/phpcs

# Static analysis (must pass level 8).
vendor/bin/phpstan analyse --memory-limit=1G

# Run tests.
vendor/bin/phpunit

# Run all via composer scripts.
composer test

# Run all via quality script.
./scripts/run-quality-checks.sh all

# Quick local checks (skip WordPress Test Suite setup).
./scripts/run-quality-checks.sh --skip-wp-setup phpcs phpstan
```

---

## PHPCS (PHP_CodeSniffer)

### Configuration

File: `phpcs.xml` — standard across all Silver Assist plugins.

**Base Standard**: `WordPress-Extra` with these exclusions:
- `Generic.Arrays.DisallowShortArraySyntax` — short arrays allowed (`[]` not `array()`)
- `WordPress.Files.FileName.NotHyphenatedLowercase` — PSR-4 PascalCase filenames
- `WordPress.Files.FileName.InvalidClassFileName` — PSR-4 class filenames
- `Generic.Functions.OpeningFunctionBraceKernighanRitchie` — K&R brace style allowed
- `Generic.Classes.OpeningBraceSameLine` — same-line braces allowed

**Additional Standards Enforced**:
- `WordPress-Docs` — PHPDoc coverage
- `WordPress.NamingConventions.PrefixAllGlobals` — plugin-specific prefixes
- `Generic.CodeAnalysis.UnusedFunctionParameter`
- `Generic.Commenting.Todo`
- PHP compatibility: `8.2-`
- Min WP version: `6.5`

### Common Commands

```bash
# Auto-fix what can be fixed.
vendor/bin/phpcbf

# Check all files.
vendor/bin/phpcs

# Check specific file.
vendor/bin/phpcs includes/Core/Plugin.php

# Check with summary report.
vendor/bin/phpcs --report=summary

# Ignore warnings (for CI - only fail on errors).
vendor/bin/phpcs --runtime-set ignore_warnings_on_exit 1

# Show only errors (suppress warnings).
vendor/bin/phpcs --warning-severity=0
```

### Common PHPCS Errors and Fixes

#### 1. Missing global variable prefix

```php
// ❌ ERROR: Non-prefixed global variable.
$autoload_path = PLUGIN_PATH . 'vendor/autoload.php';

// ✅ FIX: Add plugin prefix.
$plugin_prefix_autoload_path = PLUGIN_PREFIX_PATH . 'vendor/autoload.php';
```

#### 2. Inline comment missing punctuation

```php
// ❌ ERROR: Comment missing period.
// Initialize the component

// ✅ FIX: Add period.
// Initialize the component.
```

#### 3. Double quotes without interpolation

```php
// ❌ ERROR: Unnecessary double quotes.
$status = "active";

// ✅ FIX: Use single quotes.
$status = 'active';
```

#### 4. Missing PHPDoc

```php
// ❌ ERROR: Missing doc comment.
public function process(): void {

// ✅ FIX: Add PHPDoc.
/**
 * Process the request.
 *
 * @return void
 */
public function process(): void {
```

#### 5. Unordered sprintf placeholders

```php
// ❌ ERROR: Non-positional placeholders with multiple args.
sprintf( __( 'Form "%s" has %d submissions', 'text-domain' ), $name, $count );

// ✅ FIX: Use positional placeholders with translator comment.
sprintf(
    /* translators: %1$s: form name, %2$d: submission count */
    __( 'Form "%1$s" has %2$d submissions', 'text-domain' ),
    $name,
    $count
);
```

#### 6. Missing backslash for WordPress functions

```php
// ❌ ERROR in namespaced code (may cause issues).
add_action( 'init', [ $this, 'init' ] );

// ✅ FIX: Backslash prefix.
\add_action( 'init', [ $this, 'init' ] );
```

### PHPCS in CI/CD

**CRITICAL**: PHPCS warnings (even with 0 errors) cause exit code 1/2 under `bash -e`. Always use:

```bash
vendor/bin/phpcs --runtime-set ignore_warnings_on_exit 1
```

This ensures the step only fails on actual errors, not warnings.

---

## PHPStan (Static Analysis)

### Configuration

File: `phpstan.neon`

```yaml
includes:
    - vendor/szepeviktor/phpstan-wordpress/extension.neon

parameters:
    level: 8
    paths:
        - includes
    bootstrapFiles:
        - plugin-main-file.php
    scanDirectories:
        - vendor
    excludePaths:
        - tests/*
        - build/*
```

### Level 8 Requirements

Level 8 is the strictest level. It requires:
- No unused variables
- Strict type checking on all operations
- Full PHPDoc coverage with accurate types
- No `mixed` types without explicit reason
- Correct nullable handling
- Accurate return types

### Common Commands

```bash
# Standard analysis.
vendor/bin/phpstan analyse --memory-limit=1G

# Analyze specific directory.
vendor/bin/phpstan analyse includes/Service/ --memory-limit=1G --no-progress

# Generate baseline (accept existing errors temporarily).
vendor/bin/phpstan analyse --generate-baseline

# Clear cache (if results seem stale).
vendor/bin/phpstan clear-result-cache
```

### Common PHPStan Errors and Fixes

#### 1. Nullable property access

```php
// ❌ ERROR: Cannot call method on possibly null value.
$this->service->process();

// ✅ FIX: Null guard.
if ( ! $this->service ) {
    return;
}
$this->service->process();

// ✅ Alternative: Null-safe operator.
$this->service?->process();
```

#### 2. Missing return type

```php
// ❌ ERROR: Method has no return type.
public function get_data() {

// ✅ FIX: Add return type.
/**
 * Get data.
 *
 * @return array<string, mixed>
 */
public function get_data(): array {
```

#### 3. PHPDoc/code type mismatch

```php
// ❌ ERROR: PHPDoc tag @param has invalid type.
/** @param array $items */
public function process( array $items ): void {

// ✅ FIX: Be specific in PHPDoc.
/** @param array<int, string> $items */
public function process( array $items ): void {
```

#### 4. WordPress function return types

```php
// ❌ ERROR: get_option returns mixed.
$value = \get_option( 'key' );
$this->method_expecting_string( $value );

// ✅ FIX: Type assertion.
$value = \get_option( 'key', '' );
if ( is_string( $value ) ) {
    $this->method_expecting_string( $value );
}
```

### Memory Issues

PHPStan defaults to 128MB which is insufficient for most plugins:

```bash
# ❌ Crashes at default memory.
vendor/bin/phpstan analyse

# ✅ Increase memory.
vendor/bin/phpstan analyse --memory-limit=1G

# ✅ Or via composer script (already configured).
composer phpstan
```

---

## PHPUnit

### Quick Commands

```bash
# Run all tests.
vendor/bin/phpunit

# Run specific suite.
vendor/bin/phpunit --testsuite unit
vendor/bin/phpunit --testsuite integration

# Run specific file.
vendor/bin/phpunit tests/Unit/Core/PluginTest.php

# Run specific method.
vendor/bin/phpunit --filter testMethodName

# With coverage.
vendor/bin/phpunit --coverage-html coverage/
vendor/bin/phpunit --coverage-text

# Human-readable output.
vendor/bin/phpunit --testdox
```

### WordPress Test Suite Required

PHPUnit tests extend `WP_UnitTestCase` which requires the WordPress Test Suite. If not installed:

```
Warning: WordPress Test Suite not found. Tests will run with limited functionality.
```

Install via:

```bash
bash scripts/install-wp-tests.sh wordpress_test root 'root' localhost latest true
```

See the **testing** skill for full details on test patterns and bootstrap.

---

## Quality Check Script

File: `scripts/run-quality-checks.sh`

This script centralizes all quality checks for consistent execution.

### Usage

```bash
# Run all checks (with WordPress Test Suite setup).
./scripts/run-quality-checks.sh all

# Skip WP setup (faster for local development).
./scripts/run-quality-checks.sh --skip-wp-setup all

# Run specific checks only.
./scripts/run-quality-checks.sh phpcs phpstan
./scripts/run-quality-checks.sh phpunit
```

### Script Pattern

**CRITICAL**: All check functions must return proper exit codes:

```bash
run_phpcs() {
    print_header "🔍 Running PHPCS"

    cd "$PROJECT_ROOT"

    # ✅ CORRECT: Capture exit code and return appropriate value.
    if vendor/bin/phpcs --warning-severity=0; then
        print_success "PHPCS passed - No errors found"
        return 0
    else
        print_error "PHPCS failed - Code style errors found"
        return 1
    fi
}
```

---

## Pre-PR Checklist (MANDATORY)

Before every commit/PR, run these checks in order:

```bash
# 1. Auto-fix formatting.
vendor/bin/phpcbf

# 2. Check standards (must be 0 errors).
vendor/bin/phpcs

# 3. Static analysis (must pass level 8).
vendor/bin/phpstan analyse --memory-limit=1G

# 4. Run tests (must pass all).
vendor/bin/phpunit

# 5. Update translations.
wp i18n make-pot . languages/plugin-text-domain.pot --domain=plugin-text-domain
```

---

## Troubleshooting

### PHPCS: "phpcs: command not found"

```bash
# Install via composer.
composer install

# Use vendor path.
vendor/bin/phpcs
```

### PHPCS: warnings cause CI failure

PHPCS exit codes: 0 = clean, 1 = warnings, 2 = errors. Under `bash -e` (CI), exit code 1 aborts.

**Fix**: Add `--runtime-set ignore_warnings_on_exit 1` to CI scripts.

### PHPStan: "Allowed memory size exhausted"

```bash
vendor/bin/phpstan analyse --memory-limit=1G
# or
php -d memory_limit=1G vendor/bin/phpstan analyse
```

### PHPStan: stale results after code changes

```bash
vendor/bin/phpstan clear-result-cache
vendor/bin/phpstan analyse --memory-limit=1G
```

### PHPUnit: "Class WP_UnitTestCase not found"

The WordPress Test Suite is not installed. Either:
1. Install it: `bash scripts/install-wp-tests.sh wordpress_test root 'root' localhost latest true`
2. Run in CI where it's automatically set up
3. Use `--skip-wp-setup` flag with the quality check script for local non-test checks

### PHPCBF: "No fixable errors were found"

This is success — all auto-fixable issues are already resolved.

---

## CI/CD Integration

### Workflow Strategy

| Workflow | WordPress Tests | Time | Purpose |
|----------|----------------|------|---------|
| `ci.yml` | ✅ Yes | ~8-10 min | Full integration testing on PRs |
| `release.yml` | ✅ Yes | ~10-12 min | Exhaustive validation before release |
| `dependency-updates.yml` | ❌ No | ~2-3 min | Fast Composer package validation |

### Quality Checks in Release Workflow

The release workflow runs PHPCS and PHPStan before building:

```yaml
- name: Code quality
  run: |
    HAS_CHECKS=false
    if [ -f phpcs.xml ] || [ -f .phpcs.xml.dist ] || [ -f phpcs.xml.dist ]; then
      echo "▶ PHPCS"
      vendor/bin/phpcs --runtime-set ignore_warnings_on_exit 1
      HAS_CHECKS=true
    fi
    if [ -f phpstan.neon ] || [ -f phpstan.neon.dist ]; then
      echo "▶ PHPStan"
      vendor/bin/phpstan analyse --no-progress
      HAS_CHECKS=true
    fi
    if [ "$HAS_CHECKS" = false ]; then
      echo "ℹ️ No quality tool configs found — skipping"
    fi
```
