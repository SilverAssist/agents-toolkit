---
description: Run code quality checks (PHPCS, PHPStan, PHPUnit) on a Silver Assist WordPress plugin
agent: agent
tools:
  - run_in_terminal
  - read_file
  - replace_string_in_file
---

# Quality Check

Run the full quality check suite on the current Silver Assist plugin.

## Steps

1. **Detect the plugin** — Identify the plugin root directory from the current workspace or active file. Look for `composer.json` and the main plugin PHP file.

2. **Ensure dependencies** — Verify `vendor/` exists. If not, run `composer install`.

3. **Run PHPCS** — Execute `vendor/bin/phpcs` to check WordPress Coding Standards compliance.
   - If errors are found, first attempt auto-fix with `vendor/bin/phpcbf`.
   - Re-run `vendor/bin/phpcs` and report remaining errors that need manual fixes.

4. **Run PHPStan** — Execute `vendor/bin/phpstan analyse --memory-limit=1G` for static analysis at level 8.
   - Report any type errors with file locations and suggested fixes.

5. **Run PHPUnit** — Execute `vendor/bin/phpunit` to run the test suite.
   - If the WordPress Test Suite is not available, note which tests failed and why.

6. **Summary** — Provide a clear summary table:

| Check   | Status | Issues |
|---------|--------|--------|
| PHPCS   | ✅/❌  | Count  |
| PHPStan | ✅/❌  | Count  |
| PHPUnit | ✅/❌  | Count  |

If all checks pass, confirm the plugin is ready for commit/release.
If any check fails, provide actionable fix suggestions.

## Important

- Always run checks from the **plugin root directory** (where `composer.json` is).
- Use `| cat` after commands to avoid pager issues.
- The quality-checks skill has full documentation on rules and common errors — use it if needed.
