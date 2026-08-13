---
name: plugin-creation
description: Scaffold a new Silver Assist WordPress plugin from scratch. Covers file structure, PSR-4 autoloading, main plugin file, composer.json, LoadableInterface architecture, configuration files (phpcs.xml, phpstan.neon, phpunit.xml.dist), test bootstrap, CI/CD workflows, and AI agent customization. Use when creating a new plugin or understanding the standard architecture.
---

# Silver Assist — Plugin Creation

This skill covers scaffolding a brand-new Silver Assist WordPress plugin from zero, following the unified standards documented in `SILVERASSIST_STANDARDS.md v2.0.0`.

## When to Use

- Creating a new Silver Assist WordPress plugin from scratch
- Setting up the full directory structure for a plugin
- Understanding the standard plugin architecture
- Bootstrapping all configuration files (PHPCS, PHPStan, PHPUnit, CI/CD)
- Adding AI agent customization (copilot-instructions, file instructions, skills)

## Prerequisites

- PHP 8.2+
- Composer installed globally
- WordPress 6.5+ development environment
- GitHub repository under the `SilverAssist` organization

---

## Architecture Overview

### File Structure

Every Silver Assist plugin follows this structure:

```text
plugin-name/
├── plugin-name.php              # Main plugin file
├── composer.json                # Composer dependencies & autoloading
├── README.md                    # User documentation
├── CONTRIBUTING.md              # Developer documentation
├── CHANGELOG.md                 # Version history
├── LICENSE                      # License file
├── phpcs.xml                    # PHPCS configuration
├── phpstan.neon                 # PHPStan configuration
├── phpunit.xml.dist             # PHPUnit configuration
├── .github/
│   ├── copilot-instructions.md  # Global AI agent context
│   ├── instructions/            # File-specific AI instructions
│   │   ├── php.instructions.md
│   │   ├── testing.instructions.md
│   │   └── ...
│   ├── skills/                  # Specialized AI task skills
│   │   ├── release-management/
│   │   ├── quality-checks/
│   │   └── ...
│   └── workflows/               # CI/CD workflows
│       ├── ci.yml
│       ├── release.yml
│       ├── dependency-updates.yml
│       └── quality-checks.yml
├── includes/                    # PSR-4 classes
│   ├── Core/
│   │   ├── Plugin.php           # Main plugin bootstrap (extends AbstractPlugin)
│   │   └── Activator.php        # Activation/deactivation logic
│   ├── Service/                 # Business logic services
│   │   └── Loader.php
│   ├── Admin/                   # WordPress admin integration
│   │   └── Loader.php
│   ├── Controller/              # HTTP/Admin request handlers
│   ├── View/                    # HTML rendering (static classes)
│   ├── Model/                   # Domain models
│   ├── Repository/              # Data access layer
│   └── Utils/                   # Utility classes
│       ├── Helpers.php
│       └── Logger.php
├── assets/
│   ├── css/
│   └── js/
├── languages/
│   └── plugin-name.pot
├── scripts/
│   ├── build-release.sh
│   ├── run-quality-checks.sh
│   ├── install-wp-tests.sh
│   ├── update-version-simple.sh
│   └── check-versions.sh
├── tests/
│   ├── bootstrap.php
│   ├── README.md
│   ├── Unit/
│   ├── Integration/
│   └── Helpers/
│       ├── TestCase.php
│       └── Helpers.php
└── docs/
    └── API_REFERENCE.md
```

### PSR-4 Autoloading

Namespace: `SilverAssist\PluginName\`

- PHP classes: `PascalCase.php` matching class names exactly
- Directories: `PascalCase/` (e.g., `Core/`, `Admin/`, `Service/`)
- Assets: `kebab-case.css`, `kebab-case.js`

### LoadableInterface Priority System

`LoadableInterface` and the `AbstractPlugin` bootstrap it powers both ship from the
`silverassist/wp-plugin-kernel` package (`composer require silverassist/wp-plugin-kernel`) —
plugins implement `\SilverAssist\PluginKernel\Interfaces\LoadableInterface`, they do not
hand-write it per repo.

All components implement `LoadableInterface` with three methods:

- `init()` — Initialize the component
- `get_priority()` — Loading order (lower = first)
- `should_load()` — Conditional loading

Priority values (unchanged from before the kernel package existed):

- **10**: Core components (Plugin, Activator, critical services)
- **20**: Services (business logic, API clients)
- **30**: Admin components (controllers, settings pages)
- **40**: Utils & Assets (helpers, loggers)

`Plugin.php` itself extends `\SilverAssist\PluginKernel\AbstractPlugin`, which provides
`instance()`, `init()`, and the priority-ordered load loop — the concrete plugin only
implements `get_components(): array` (and, optionally, `init_hooks()` for non-component
plugin-level hooks such as `wp-github-updater` initialization). See Step 3 below.

---

## Step-by-Step Plugin Creation

### Step 1: Create Directory and Initialize Composer

```bash
mkdir plugin-name && cd plugin-name
```

Create `composer.json`:

```json
{
    "name": "silverassist/plugin-slug",
    "description": "WordPress plugin description",
    "type": "wordpress-plugin",
    "license": "PolyForm-Noncommercial-1.0.0",
    "authors": [
        {
            "name": "Silver Assist",
            "homepage": "https://silverassist.com/"
        }
    ],
    "minimum-stability": "stable",
    "require": {
        "php": ">=8.2",
        "composer/installers": "^2.0",
        "silverassist/wp-plugin-kernel": "^1.0",
        "silverassist/wp-github-updater": "^1.1",
        "silverassist/wp-settings-hub": "^1.0"
    },
    "require-dev": {
        "dealerdirect/phpcodesniffer-composer-installer": "^1.0",
        "php-stubs/wordpress-stubs": "^6.6",
        "php-stubs/wordpress-tests-stubs": "^6.6",
        "phpstan/phpstan": "*",
        "phpunit/phpunit": "^9.6",
        "silverassist/coding-standards": "^1.0",
        "silverassist/wp-coding-standards": "^1.0",
        "szepeviktor/phpstan-wordpress": "^1.3 || ^2.0",
        "yoast/phpunit-polyfills": "^4.0"
    },
    "autoload": {
        "psr-4": {
            "SilverAssist\\PluginName\\": "includes/"
        }
    },
    "autoload-dev": {
        "psr-4": {
            "SilverAssist\\PluginName\\Tests\\": "tests/"
        }
    },
    "scripts": {
        "phpcs": "phpcs",
        "phpcbf": "phpcbf",
        "phpstan": "phpstan analyse --memory-limit=1G",
        "phpunit": "phpunit",
        "test": [
            "@phpcs",
            "@phpstan",
            "@phpunit"
        ]
    },
    "config": {
        "allow-plugins": {
            "composer/installers": true,
            "dealerdirect/phpcodesniffer-composer-installer": true
        }
    }
}
```

Then run:

```bash
composer install
```

### Step 2: Create Main Plugin File

File: `plugin-name.php`

**CRITICAL**: Must include `Update URI` header to prevent WordPress.org update conflicts.

```php
<?php
/**
 * Plugin Name: Plugin Display Name
 * Plugin URI: https://github.com/SilverAssist/plugin-slug
 * Description: Brief plugin description.
 * Version: 1.0.0
 * Author: Silver Assist
 * Author URI: https://silverassist.com
 * License: PolyForm-Noncommercial-1.0.0
 * License URI: https://polyformproject.org/licenses/noncommercial/1.0.0/
 * Text Domain: plugin-text-domain
 * Domain Path: /languages
 * Requires at least: 6.5
 * Tested up to: 6.8
 * Requires PHP: 8.2
 * Network: false
 * Update URI: https://github.com/SilverAssist/plugin-slug
 *
 * @package SilverAssist\PluginName
 * @author Silver Assist
 * @license PolyForm-Noncommercial-1.0.0
 * @since 1.0.0
 */

// Prevent direct access.
\defined( 'ABSPATH' ) || exit;

// Define plugin constants.
define( 'PLUGIN_PREFIX_VERSION', '1.0.0' );
define( 'PLUGIN_PREFIX_FILE', __FILE__ );
define( 'PLUGIN_PREFIX_PATH', plugin_dir_path( __FILE__ ) );
define( 'PLUGIN_PREFIX_BASENAME', plugin_basename( __FILE__ ) );

/**
 * Composer autoloader with security validation.
 */
$plugin_prefix_autoload_path      = PLUGIN_PREFIX_PATH . 'vendor/autoload.php';
$plugin_prefix_real_autoload_path = realpath( $plugin_prefix_autoload_path );
$plugin_prefix_plugin_real_path   = realpath( PLUGIN_PREFIX_PATH );

// Validate: both paths resolve, autoloader is inside plugin directory.
if (
    $plugin_prefix_real_autoload_path &&
    $plugin_prefix_plugin_real_path &&
    0 === strpos( $plugin_prefix_real_autoload_path, $plugin_prefix_plugin_real_path )
) {
    require_once $plugin_prefix_real_autoload_path;
} else {
    add_action(
        'admin_notices',
        function () {
            printf(
                '<div class="notice notice-error"><p>%s</p></div>',
                esc_html__( 'Plugin Name: Missing or invalid Composer dependencies. Run "composer install".', 'plugin-text-domain' )
            );
        }
    );
    return;
}

// Initialize plugin.
add_action(
    'plugins_loaded',
    function () {
        \SilverAssist\PluginName\Core\Plugin::instance()->init();
    }
);

// Register activation hook.
register_activation_hook(
    __FILE__,
    function () {
        \SilverAssist\PluginName\Core\Activator::activate();
    }
);
```

**Key Elements:**

- Prefixed global variables (`$plugin_prefix_*`) for WPCS compliance
- Security validation for Composer autoloader path (prevents path traversal)
- Graceful degradation with admin notice if autoloader missing
- Hook registration via closures

### Step 3: Create Core Classes

#### LoadableInterface

Not hand-written per plugin. `silverassist/wp-plugin-kernel` ships
`\SilverAssist\PluginKernel\Interfaces\LoadableInterface` (require it via
`composer require silverassist/wp-plugin-kernel`); components implement that
interface directly rather than a local `includes/Core/Interfaces/LoadableInterface.php`
copy. The contract is unchanged: `init(): void`, `get_priority(): int`, `should_load(): bool`,
with the same priority bands (10 core, 20 services, 30 admin, 40 utils).

#### Plugin.php (Main Bootstrap)

File: `includes/Core/Plugin.php`

`Plugin` extends `\SilverAssist\PluginKernel\AbstractPlugin`, which provides
`instance()` (per-subclass singleton), `init()` (final — do not override it),
and the should_load()-filter/priority-sort/init() loading loop. The concrete
plugin only implements `get_components()` and, if it needs plugin-level hooks
that aren't themselves a `LoadableInterface` component (e.g. the GitHub
updater), overrides `init_hooks()`:

```php
<?php
namespace SilverAssist\PluginName\Core;

use SilverAssist\PluginKernel\AbstractPlugin;

/**
 * Main Plugin Class.
 *
 * @package SilverAssist\PluginName\Core
 * @since 1.0.0
 */
final class Plugin extends AbstractPlugin {
    /**
     * Get components to load.
     *
     * @return array<class-string<\SilverAssist\PluginKernel\Interfaces\LoadableInterface>>
     */
    protected function get_components(): array {
        return [
            // Add component classes here.
            // \SilverAssist\PluginName\Service\ServiceName::class,
            // \SilverAssist\PluginName\Admin\Settings::class,
        ];
    }

    /**
     * Plugin-level hooks that aren't themselves a LoadableInterface component.
     *
     * @return void
     */
    protected function init_hooks(): void {
        $this->init_updater();
    }

    /**
     * Initialize GitHub updater.
     *
     * @return void
     */
    private function init_updater(): void {
        if ( ! class_exists( \SilverAssist\GitHubUpdater\UpdaterConfig::class ) ) {
            return;
        }

        $config = new \SilverAssist\GitHubUpdater\UpdaterConfig(
            plugin_basename: PLUGIN_PREFIX_BASENAME,
            version: PLUGIN_PREFIX_VERSION,
            github_repo: 'SilverAssist/plugin-slug',
            plugin_file: PLUGIN_PREFIX_FILE
        );

        $config->init();
    }
}
```

#### Activator.php

File: `includes/Core/Activator.php`

```php
<?php
namespace SilverAssist\PluginName\Core;

/**
 * Plugin Activator.
 *
 * @package SilverAssist\PluginName\Core
 * @since 1.0.0
 */
class Activator {
    /**
     * Plugin activation logic.
     *
     * @return void
     */
    public static function activate(): void {
        // Create database tables.
        // self::create_tables();

        // Set default options.
        self::set_default_options();

        // Flush rewrite rules.
        \flush_rewrite_rules();
    }

    /**
     * Plugin deactivation logic.
     *
     * @return void
     */
    public static function deactivate(): void {
        // Clean up temporary data.
        \flush_rewrite_rules();
    }

    /**
     * Set default options.
     *
     * @return void
     */
    private static function set_default_options(): void {
        if ( ! \get_option( 'plugin_prefix_settings' ) ) {
            \update_option( 'plugin_prefix_settings', [
                'enabled' => true,
            ] );
        }
    }
}
```

### Step 4: Create Configuration Files

#### phpcs.xml

Requires `silverassist/coding-standards` and `silverassist/wp-coding-standards` as
require-dev (see the `composer.json` template above). The shared `SilverAssistWP`
ruleset — registered by `silverassist/wp-coding-standards` via Composer's
`phpcodesniffer-composer-installer` — already includes `WordPress-Extra` (with the
PSR-4 file-naming and K&R brace exclusions), `WordPress-Docs`,
`Generic.CodeAnalysis.UnusedFunctionParameter`, `Generic.Commenting.Todo`, and the
`testVersion`/`minimum_supported_wp_version` config. A plugin's own `phpcs.xml` only
needs to reference it and declare its own `PrefixAllGlobals` prefixes — it is **not**
a long list of `WordPress-Extra` rules with manual `<exclude>` lines:

```xml
<?xml version="1.0"?>
<ruleset name="SilverAssist Plugin Standards">
    <description>WordPress Coding Standards for SilverAssist Plugins</description>

    <file>.</file>

    <exclude-pattern>*/vendor/*</exclude-pattern>
    <exclude-pattern>*/node_modules/*</exclude-pattern>
    <exclude-pattern>*/.git/*</exclude-pattern>
    <exclude-pattern>*/tests/*</exclude-pattern>
    <exclude-pattern>*/build/*</exclude-pattern>
    <exclude-pattern>*/assets/js/*</exclude-pattern>
    <exclude-pattern>*/assets/css/*</exclude-pattern>

    <rule ref="SilverAssistWP"/>

    <!-- Plugin-specific: PrefixAllGlobals must be declared per-plugin,
         it can't live in the shared ruleset. -->
    <rule ref="WordPress.NamingConventions.PrefixAllGlobals">
        <properties>
            <property name="prefixes" type="array">
                <element value="plugin_prefix"/>
                <element value="SilverAssist\PluginName"/>
            </property>
        </properties>
    </rule>
</ruleset>
```

**IMPORTANT**: Replace `plugin_prefix` and `SilverAssist\PluginName` with the actual plugin prefix and namespace.

#### phpstan.neon

`level: 8` is set by the shared `silverassist/coding-standards` base config — a
plugin's own `phpstan.neon` must **not** redeclare `level:` itself. All three shared
files must be `includes:`-ed directly (relative `includes:` inside
`wp-coding-standards/phpstan/base.neon` can't chain to the other two once this file
is consumed as a dependency — see that package's own comments for why):

```yaml
includes:
    - vendor/silverassist/coding-standards/phpstan/base.neon
    - vendor/silverassist/wp-coding-standards/phpstan/base.neon
    - vendor/szepeviktor/phpstan-wordpress/extension.neon

parameters:
    paths:
        - includes
    bootstrapFiles:
        - plugin-main-file.php
    excludePaths:
        - tests/*
        - build/*
    ignoreErrors:
        # Plugin-specific scoped ignores only, with a reason.
```

**IMPORTANT**: Replace `plugin-main-file.php` with the actual main plugin filename.

If the plugin's tests use `silverassist/wp-plugin-kernel`'s `Testing\TestCase` (which
extends `WP_UnitTestCase`), add `tests` to `paths` and a `scanFiles` entry for
`vendor/php-stubs/wordpress-tests-stubs/wordpress-tests-stubs.php` — see the
**testing** skill and `silverassist/wp-coding-standards`'s own README for why
`scanFiles`, not `stubFiles`, is required there.

#### phpunit.xml.dist

```xml
<?xml version="1.0" encoding="UTF-8"?>
<phpunit
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:noNamespaceSchemaLocation="https://schema.phpunit.de/9.6/phpunit.xsd"
    bootstrap="tests/bootstrap.php"
    colors="true"
    verbose="true"
    stopOnFailure="false"
    stopOnError="false"
    beStrictAboutOutputDuringTests="true"
    beStrictAboutTodoAnnotatedTests="true">

    <testsuites>
        <testsuite name="unit">
            <directory suffix="Test.php">./tests/Unit</directory>
        </testsuite>
        <testsuite name="integration">
            <directory suffix="Test.php">./tests/Integration</directory>
        </testsuite>
        <testsuite name="all">
            <directory suffix="Test.php">./tests/Unit</directory>
            <directory suffix="Test.php">./tests/Integration</directory>
        </testsuite>
    </testsuites>

    <groups>
        <exclude>
            <group>ajax</group>
            <group>ms-files</group>
            <group>external-http</group>
        </exclude>
    </groups>

    <coverage processUncoveredFiles="true">
        <include>
            <directory suffix=".php">./includes</directory>
        </include>
        <exclude>
            <directory>./vendor</directory>
            <directory>./tests</directory>
        </exclude>
    </coverage>

    <php>
        <env name="WP_ENVIRONMENT_TYPE" value="test"/>
        <env name="WP_DEBUG" value="true"/>
        <env name="WP_DEBUG_LOG" value="false"/>
        <env name="WP_DEBUG_DISPLAY" value="false"/>
        <env name="SCRIPT_DEBUG" value="false"/>
        <const name="WP_TESTS_PHPUNIT_POLYFILLS_PATH" value="vendor/yoast/phpunit-polyfills"/>
        <const name="PLUGIN_PREFIX_TESTING" value="true"/>
    </php>
</phpunit>
```

### Step 5: Create Test Infrastructure

See the **testing** skill for full details on `tests/bootstrap.php`, `tests/Helpers/TestCase.php`, and test patterns.

### Step 6: Create CI/CD Workflows

See the **release-management** skill for `release.yml` and the CI workflow templates.

#### ci.yml

File: `.github/workflows/ci.yml`

The PHP-version quality-check jobs call `silverassist/wp-coding-standards`'s
reusable `quality-checks.yml` workflow (`@v1` is a floating major-version tag,
same convention as `actions/checkout@v4`) instead of a locally-defined
`quality-checks.yml` job — so a new plugin does **not** get its own
`.github/workflows/quality-checks.yml` file at all; delete it if one exists
from an older scaffold. Only keep a local `quality-checks.yml` if the
plugin's checks do genuinely repo-specific extra setup (installing Contact
Form 7, WPGraphQL, ACF, etc. as part of the checks) that the shared workflow
can't do generically.

```yaml
name: CI
permissions:
  contents: read

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]
  workflow_dispatch:

jobs:
  quality-checks-82:
    name: Quality Checks (PHP 8.2)
    uses: SilverAssist/wp-coding-standards/.github/workflows/quality-checks.yml@v1
    with:
      php-version: '8.2'
      skip-wp-setup: false
      # Only set true if phpunit.xml.dist actually generates coverage.xml
      # (a <coverage> clover report) -- otherwise this silently no-ops.
      upload-coverage: false

  quality-checks-83:
    name: Quality Checks (PHP 8.3)
    uses: SilverAssist/wp-coding-standards/.github/workflows/quality-checks.yml@v1
    with:
      php-version: '8.3'
      skip-wp-setup: false
      upload-coverage: false

  quality-checks-84:
    name: Quality Checks (PHP 8.4)
    uses: SilverAssist/wp-coding-standards/.github/workflows/quality-checks.yml@v1
    with:
      php-version: '8.4'
      skip-wp-setup: false
      upload-coverage: false

  security-scan:
    name: Security Scan
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: shivammathur/setup-php@v2
        with:
          php-version: '8.2'
          extensions: mbstring, intl
          coverage: none
      - run: composer install --no-interaction --no-progress --optimize-autoloader
      - run: composer audit

  compatibility:
    name: WordPress Compatibility
    runs-on: ubuntu-latest
    strategy:
      matrix:
        wordpress-version: ['6.5', '6.6', '6.7', 'latest']
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: root
          MYSQL_DATABASE: wordpress_test
        ports:
          - 3306:3306
        options: >-
          --health-cmd="mysqladmin ping"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=5
    steps:
      - uses: actions/checkout@v5
      - uses: shivammathur/setup-php@v2
        with:
          php-version: '8.2'
          extensions: mbstring, intl, mysql, pdo_mysql
          coverage: none
      - run: composer install --no-interaction --no-progress --optimize-autoloader
      - name: Install Subversion (required for WordPress Test Suite)
        run: sudo apt-get update -qq && sudo apt-get install -y -qq subversion
      - run: bash scripts/install-wp-tests.sh wordpress_test root 'root' 127.0.0.1 ${{ matrix.wordpress-version }} false
      - run: vendor/bin/phpunit
```

This `compatibility` job's `scripts/install-wp-tests.sh` call is unchanged —
CLI usage is the same — but the file it calls should be a ~10-line thin
wrapper delegating to `vendor/silverassist/wp-coding-standards/scripts/install-wp-tests.sh`,
not a full standalone copy. See the **Scripts** note below.

#### Scripts

`silverassist/wp-coding-standards` ships the real implementations of
`install-wp-tests.sh` and `run-quality-checks.sh` at
`vendor/silverassist/wp-coding-standards/scripts/`. A new plugin's own
`scripts/install-wp-tests.sh` (and, when applicable, `run-quality-checks.sh`)
should be a thin wrapper, not a full copy-pasted script:

```bash
#!/usr/bin/env bash
#
# Thin wrapper — delegates to the shared script in silverassist/wp-coding-standards
# so local dev commands and docs referencing `scripts/install-wp-tests.sh` keep
# working without every consumer hand-maintaining its own copy.
#
# @package SilverAssist\PluginName
#
set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
exec bash "$SCRIPT_DIR/../vendor/silverassist/wp-coding-standards/scripts/install-wp-tests.sh" "$@"
```

CLI usage is unchanged: `bash scripts/install-wp-tests.sh <db-name> <db-user> <db-pass> [db-host] [wp-version] [skip-database-creation]`.

**Caveat**: only thin-wrap `run-quality-checks.sh` too if the plugin's quality
checks are otherwise generic. A plugin whose checks do genuinely repo-specific
extra setup (e.g. installing Contact Form 7 or WPGraphQL before running
PHPUnit) keeps its own full local `run-quality-checks.sh` and `quality-checks.yml`
— only `install-wp-tests.sh` gets thin-wrapped in that case, since that
sub-step has no plugin-specific logic. `scripts/build-release.sh` and
`scripts/update-version-simple.sh` are **not** provided by
`silverassist/wp-coding-standards` — see the **release-management** skill;
those stay hand-copied per plugin for now.

### Step 7: Create .gitignore

```gitignore
# Dependencies
vendor/
node_modules/
composer.lock

# Build
build/
dist/
*.zip
*.tar.gz

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Coverage
coverage/
.phpunit.result.cache
```

### Step 8: Create CHANGELOG.md

```markdown
# Changelog

All notable changes to Plugin Name will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - YYYY-MM-DD

### Added
- Initial release.
```

---

## PHP Requirements & Coding Standards

### PHP Version

- **Minimum**: PHP 8.2
- **Recommended**: PHP 8.3+
- Use modern PHP: enums, readonly properties, union types, named arguments

### WordPress Naming Conventions (CRITICAL for WPCS)

1. **Global variables**: Prefix with `plugin_prefix_`
2. **Functions**: Prefix with `plugin_prefix_`
3. **Constants**: Prefix with `PLUGIN_PREFIX_`
4. **Classes**: Namespaced (no prefix needed)
5. **Inline comments**: MUST end with `.`, `!`, or `?`
6. **WordPress functions in namespaced code**: MUST use backslash prefix (`\add_action()`, `\get_option()`)
7. **String quotation**: Single quotes for literals, double quotes only for interpolation

### Security Standards

**Input Sanitization:**

```php
$text  = \sanitize_text_field( \wp_unslash( $_POST['field_name'] ) );
$email = \sanitize_email( $_POST['email'] );
$url   = \esc_url_raw( $_POST['url'] );
$int   = \absint( $_POST['number'] );
```

**Output Escaping:**

```php
echo \esc_html( $text );
echo '<div class="' . \esc_attr( $class ) . '">';
echo '<a href="' . \esc_url( $url ) . '">';
```

**Nonce Verification:**

```php
\wp_nonce_field( 'plugin_action', 'plugin_nonce' );
if ( ! isset( $_POST['plugin_nonce'] ) || ! \wp_verify_nonce( $_POST['plugin_nonce'], 'plugin_action' ) ) {
    \wp_die( \esc_html__( 'Security check failed.', 'plugin-text-domain' ) );
}
```

**Capability Checks:**

```php
if ( ! \current_user_can( 'manage_options' ) ) {
    \wp_die( \esc_html__( 'Insufficient permissions.', 'plugin-text-domain' ) );
}
```

### Database Operations

Use `%i` placeholder for table/column names (WordPress 6.2+):

```php
$results = $wpdb->get_results(
    $wpdb->prepare(
        'SELECT * FROM %i WHERE status = %s AND form_id = %d',
        $table_name,
        $status,
        $form_id
    ),
    ARRAY_A
);
```

| Placeholder | Use Case |
|-------------|----------|
| `%i` | Identifiers (table/column names) |
| `%s` | Strings |
| `%d` | Integers |
| `%f` | Floats |

### Documentation (PHPDoc)

All classes, methods, and properties MUST have PHPDoc:

```php
/**
 * Class description.
 *
 * @package SilverAssist\PluginName
 * @since 1.0.0
 */
class ClassName {
    /**
     * Property description.
     *
     * @var string
     */
    private string $property;

    /**
     * Method description.
     *
     * @param string $param Parameter description.
     * @return bool Return value description.
     * @since 1.0.0
     */
    public function method_name( string $param ): bool {
        // Implementation.
        return true;
    }
}
```

### Internationalization (i18n)

**Pre-PR**: Always regenerate `.pot`:

```bash
wp i18n make-pot . languages/plugin-text-domain.pot --domain=plugin-text-domain
```

**Rules:**

- ALWAYS use literal text domain strings (never variables/constants)
- ALWAYS use ordered placeholders for multiple args with translator comments

```php
sprintf(
    /* translators: %1$s: form name, %2$d: submission count */
    __( 'Form "%1$s" has %2$d submissions', 'plugin-text-domain' ),
    $form_name,
    $count
);
```

---

## SilverAssist Required Packages

### wp-plugin-kernel

Ships the `LoadableInterface`/`AbstractPlugin` bootstrap pattern — see
"LoadableInterface Priority System" and Step 3 above.

```bash
composer require silverassist/wp-plugin-kernel
```

Runtime dependency, not `--dev` — `Plugin.php` calls its classes directly.

### wp-github-updater

Enables automatic updates from GitHub releases.

```bash
composer require silverassist/wp-github-updater:^1.1
```

Integration via `UpdaterConfig` in `Plugin::init_updater()` (see Plugin.php template above).

**IMPORTANT**: Do NOT add update-related headers to plugin file (handled programmatically by the package).

### wp-settings-hub

Provides unified settings interface for all SilverAssist plugins.

```bash
composer require silverassist/wp-settings-hub:^1.0
```

Integration in Settings class:

```php
use SilverAssist\SettingsHub\SettingsHub;

public function register_settings_page(): void {
    if ( ! class_exists( SettingsHub::class ) ) {
        // Fallback: standalone settings page.
        \add_options_page( ... );
        return;
    }

    SettingsHub::get_instance()->register_plugin_page(
        slug: 'plugin-settings',
        title: __( 'Plugin Name', 'plugin-text-domain' ),
        callback: [ $this, 'render_settings_page' ],
        icon: 'dashicons-admin-generic',
        position: 10
    );
}
```

**Note**: Settings Hub uses `get_instance()` (different from plugin singletons which use `instance()`).

---

## View Classes (No LoadableInterface)

Views are static classes for HTML rendering — they do NOT implement LoadableInterface:

```php
<?php
namespace SilverAssist\PluginName\View\Admin;

\defined( 'ABSPATH' ) || exit;

/**
 * Settings page view.
 *
 * @package SilverAssist\PluginName\View\Admin
 */
class SettingsView {
    /**
     * Render the settings page.
     *
     * @param array<string, mixed> $data Data to render.
     * @return void
     */
    public static function render( array $data ): void {
        ?>
        <div class="wrap">
            <h1><?php \esc_html_e( 'Settings', 'plugin-text-domain' ); ?></h1>
            <!-- HTML content -->
        </div>
        <?php
    }
}
```

---

## AI Agent Customization (VS Code)

### 3-Tier System

| Level | Location | Scope |
|-------|----------|-------|
| Global Context | `.github/copilot-instructions.md` | Always active |
| File-Specific | `.github/instructions/*.instructions.md` | Conditional via `applyTo` |
| Task Skills | `.github/skills/*/SKILL.md` | On-demand |

### copilot-instructions.md Template

Keep concise (~100-150 lines max). Move details to Instructions or Skills.

Should contain:

- Project overview (name, namespace, PHP version, WP version, standards)
- Architecture summary (LoadableInterface priorities, key directories)
- Critical rules (pre-PR checklist commands)
- Quick references (common commands)

### Recommended Instructions Files

| File | `applyTo` | Content |
|------|-----------|---------|
| `php.instructions.md` | `**/*.php` | PHPCS rules, security, architecture |
| `testing.instructions.md` | `tests/**/*.php` | Test patterns, WP factories |
| `github-workflow.instructions.md` | `.github/workflows/**` | CI/CD patterns |
| `documentation-language.instructions.md` | `**/*.md` | Language rules for docs |

### Recommended Skills

| Skill | Description |
|-------|-------------|
| `release-management` | Version bumps, immutable tags, release workflow |
| `quality-checks` | PHPCS, PHPStan, PHPUnit troubleshooting |
| `create-component` | New services, controllers, views with LoadableInterface |

---

## Checklist for New Plugin

- [ ] Directory created with correct slug
- [ ] `composer.json` with correct namespace, prefixes, and packages (including `silverassist/wp-plugin-kernel` and `silverassist/wp-coding-standards`)
- [ ] Main plugin file with all required headers (including `Update URI`)
- [ ] `includes/Core/Plugin.php` extending `\SilverAssist\PluginKernel\AbstractPlugin`, implementing `get_components()`
- [ ] `includes/Core/Activator.php` with activate/deactivate methods
- [ ] `phpcs.xml` referencing the `SilverAssistWP` ruleset with correct `PrefixAllGlobals` prefixes
- [ ] `phpstan.neon` with the three shared `includes:` and correct bootstrap file (no `level:` override)
- [ ] `phpunit.xml.dist` with correct constant prefix
- [ ] `tests/bootstrap.php` with correct constants and plugin file
- [ ] `tests/Helpers/TestCase.php` extending `WP_UnitTestCase` (or `\SilverAssist\PluginKernel\Testing\TestCase`)
- [ ] `.github/workflows/ci.yml` created, calling the reusable `quality-checks.yml@v1` workflow (no local `quality-checks.yml` unless the plugin needs custom check setup)
- [ ] `.github/workflows/release.yml` created (see release-management skill)
- [ ] `scripts/install-wp-tests.sh` is a thin wrapper delegating to `vendor/silverassist/wp-coding-standards/scripts/`
- [ ] `scripts/build-release.sh` copied from existing plugin
- [ ] `scripts/update-version-simple.sh` created
- [ ] `.gitignore` configured
- [ ] `CHANGELOG.md` initialized
- [ ] `README.md` created
- [ ] `LICENSE` file added (PolyForm-Noncommercial-1.0.0)
- [ ] `composer install` runs successfully
- [ ] `vendor/bin/phpcs` passes with 0 errors
- [ ] `vendor/bin/phpstan analyse` passes at level 8
- [ ] GitHub repository created under SilverAssist organization
