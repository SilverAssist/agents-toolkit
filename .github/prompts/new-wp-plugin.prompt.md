---
description: Create a new Silver Assist WordPress plugin from scratch with full architecture and CI/CD
agent: agent
tools:
  - run_in_terminal
  - read_file
  - replace_string_in_file
  - create_file
---

# New Plugin

Scaffold a new Silver Assist WordPress plugin with the standard architecture, quality tools, and CI/CD pipeline.

## Inputs

Ask the user:
1. **Plugin name** — Human-readable name (e.g., "Silver Assist Cache Manager")
2. **Plugin slug** — Kebab-case slug (e.g., `silver-assist-cache-manager`)
3. **Brief description** — One-line description of the plugin's purpose
4. **Minimum PHP version** — Default: 8.2

## Steps

Follow the plugin-creation skill instructions completely. The skill has the full file structure, templates, and configuration for:

1. **Core files** — Main plugin file, `Plugin.php` with singleton + LoadableInterface loader, `Activator.php`
2. **Composer setup** — `composer.json` with PSR-4 autoloading, dev dependencies (PHPCS, PHPStan, PHPUnit)
3. **Quality configs** — `phpcs.xml`, `phpstan.neon`, `phpunit.xml.dist`
4. **CI/CD** — GitHub Actions workflows for quality checks and releases
5. **Scripts** — `build-release.sh`, `run-quality-checks.sh`, `update-version.sh`
6. **Tests** — Bootstrap, base `TestCase`, first sample test
7. **Documentation** — `README.md`, `CHANGELOG.md`, `.github/copilot-instructions.md`
8. **Git setup** — `.gitignore`, initial commit

After scaffolding, run quality checks to verify everything works:
```bash
composer install
./scripts/run-quality-checks.sh --skip-wp-setup phpcs phpstan
```

## Important

- Use the plugin-creation skill — it has the complete canonical templates.
- The `.github/copilot-instructions.md` should contain ONLY plugin-specific context (namespace, text domain, key features). Global standards are handled by `~/.copilot/instructions/`.
- Pin all GitHub Actions to SHA hashes, not version tags.
