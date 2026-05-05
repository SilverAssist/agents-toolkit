---
name: testing
description: Write and run PHPUnit tests for Silver Assist WordPress plugins. Covers WordPress Test Suite integration, test bootstrap, base TestCase class, factory patterns, database schema handling, test naming conventions, and common testing patterns. Use when writing new tests, debugging test failures, or setting up test infrastructure.
---

# Silver Assist — Testing

This skill covers the testing strategy for Silver Assist WordPress plugins, including PHPUnit configuration, WordPress Test Suite integration, test patterns, and best practices.

## When to Use

- Writing new unit or integration tests
- Setting up test infrastructure for a new plugin
- Debugging test failures
- Understanding WordPress Test Suite patterns
- Dealing with database operations in tests
- Running tests locally or in CI

## Prerequisites

- `composer install` completed
- For integration tests: WordPress Test Suite installed
- PHPUnit 9.6+ (via Composer)
- yoast/phpunit-polyfills (via Composer)

---

## Test Infrastructure Setup

### PHPUnit Configuration

File: `phpunit.xml.dist`

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

**IMPORTANT**: Replace `PLUGIN_PREFIX_TESTING` with your actual plugin constant prefix.

### Test Bootstrap

File: `tests/bootstrap.php`

```php
<?php
/**
 * PHPUnit Bootstrap for SilverAssist Plugin.
 *
 * @package SilverAssist\PluginName
 */

// Composer autoloader for stubs and dependencies.
require_once dirname( __DIR__ ) . '/vendor/autoload.php';

// Define test constants.
if ( ! defined( 'PLUGIN_PREFIX_TESTING' ) ) {
    define( 'PLUGIN_PREFIX_TESTING', true );
}

define( 'PLUGIN_PREFIX_TESTS_DIR', __DIR__ );
define( 'PLUGIN_PREFIX_PLUGIN_DIR', dirname( __DIR__ ) );
define( 'PLUGIN_PREFIX_PLUGIN_FILE', PLUGIN_PREFIX_PLUGIN_DIR . '/plugin-main-file.php' );

// Define plugin constants (normally defined in main plugin file).
if ( ! defined( 'PLUGIN_PREFIX_VERSION' ) ) {
    define( 'PLUGIN_PREFIX_VERSION', '1.0.0' );
}
if ( ! defined( 'PLUGIN_PREFIX_FILE' ) ) {
    define( 'PLUGIN_PREFIX_FILE', PLUGIN_PREFIX_PLUGIN_FILE );
}
if ( ! defined( 'PLUGIN_PREFIX_PATH' ) ) {
    define( 'PLUGIN_PREFIX_PATH', PLUGIN_PREFIX_PLUGIN_DIR . '/' );
}
if ( ! defined( 'PLUGIN_PREFIX_BASENAME' ) ) {
    define( 'PLUGIN_PREFIX_BASENAME', 'plugin-name/plugin-main-file.php' );
}

// WordPress test environment check.
$_tests_dir = getenv( 'WP_TESTS_DIR' );

if ( ! $_tests_dir ) {
    $_tests_dir = rtrim( sys_get_temp_dir(), '/\\' ) . '/wordpress-tests-lib';
}

// Check if WordPress test suite is available.
$wp_tests_available  = false;
$_tests_includes_dir = null;

if ( file_exists( $_tests_dir . '/includes/functions.php' ) ) {
    // Standard wordpress-tests-lib structure.
    $wp_tests_available  = true;
    $_tests_includes_dir = $_tests_dir . '/includes';
} elseif ( file_exists( $_tests_dir . '/tests/phpunit/includes/functions.php' ) ) {
    // wordpress-develop repository structure.
    $wp_tests_available  = true;
    $_tests_includes_dir = $_tests_dir . '/tests/phpunit/includes';
}

/**
 * Manually load the plugin being tested.
 */
function _manually_load_plugin() {
    // Load composer autoloader.
    if ( file_exists( PLUGIN_PREFIX_PLUGIN_DIR . '/vendor/autoload.php' ) ) {
        require_once PLUGIN_PREFIX_PLUGIN_DIR . '/vendor/autoload.php';
    }

    // Note: Do NOT load main plugin file here.
    // It will be loaded by WordPress Test Suite after WordPress loads.
}

if ( $wp_tests_available ) {
    // Load WordPress Test Suite.
    require_once $_tests_includes_dir . '/functions.php';

    tests_add_filter( 'muplugins_loaded', '_manually_load_plugin' );

    // Start WordPress Test Suite.
    require_once $_tests_includes_dir . '/bootstrap.php';
} else {
    // WordPress Test Suite not available - tests will use mocks.
    echo "Warning: WordPress Test Suite not found. Tests will run with limited functionality.\n";
    _manually_load_plugin();
}
```

**Key Points:**
- Constants are defined with `if ( ! defined() )` guards to allow phpunit.xml.dist to set them
- WordPress Test Suite is auto-detected from `$WP_TESTS_DIR` env var or `/tmp/wordpress-tests-lib`
- Plugin is loaded via `muplugins_loaded` filter (NOT directly in bootstrap)
- Do NOT load the main plugin file in `_manually_load_plugin()` — WordPress Test Suite handles this

### Base Test Class

File: `tests/Helpers/TestCase.php`

```php
<?php
/**
 * Base Test Case for SilverAssist Plugin.
 *
 * @package SilverAssist\PluginName
 * @subpackage Tests\Helpers
 */

namespace SilverAssist\PluginName\Tests\Helpers;

/**
 * Base test case using WordPress Test Suite.
 *
 * All tests extend this class to have access to WordPress functions,
 * factory methods, and proper database transaction rollback.
 */
abstract class TestCase extends \WP_UnitTestCase {
    // Base test functionality.
    // Add shared setup/teardown and helper methods here.
}
```

### Directory Structure

```
tests/
├── bootstrap.php           # Test bootstrap
├── README.md               # Testing documentation
├── Unit/                   # Unit tests (mirrors includes/ structure)
│   ├── Core/
│   │   └── PluginTest.php
│   └── Service/
│       └── ServiceNameTest.php
├── Integration/            # Integration tests
│   └── Admin/
│       └── SettingsTest.php
└── Helpers/                # Test utilities
    ├── TestCase.php        # Base test class
    └── Helpers.php         # Test helper functions
```

---

## Test Naming Conventions

### Lifecycle Methods (WordPress snake_case)

Since TestCase extends `WP_UnitTestCase`, use **WordPress-style snake_case** for lifecycle methods:

```php
// ✅ CORRECT: WordPress snake_case style (WP_UnitTestCase).
public function set_up(): void {
    parent::set_up();
    // Setup code.
}

public function tear_down(): void {
    // Cleanup code.
    parent::tear_down();
}

public static function set_up_before_class(): void {
    parent::set_up_before_class();
}

public static function tear_down_after_class(): void {
    parent::tear_down_after_class();
}

// ❌ WRONG: PHPUnit camelCase style (don't use with WP_UnitTestCase).
public function setUp(): void    // WRONG
public function tearDown(): void // WRONG
```

### Test Methods (camelCase)

```php
// ✅ Test methods use camelCase.
public function testMethodReturnsExpectedValue(): void {
    // Test implementation.
}

public function testActivatorCreatesDefaultOptions(): void {
    // Test implementation.
}
```

### Test File Naming

- Files: `ClassNameTest.php` (matches class being tested + `Test` suffix)
- Location: mirrors `includes/` structure under `tests/Unit/` or `tests/Integration/`

Example:
- `includes/Core/Plugin.php` → `tests/Unit/Core/PluginTest.php`
- `includes/Service/FormHandler.php` → `tests/Unit/Service/FormHandlerTest.php`

---

## WordPress Factory Pattern

**CRITICAL**: Use `static::factory()` — NOT `$this->factory` (deprecated since WordPress 6.1+).

### Creating Test Data

```php
public function set_up(): void {
    parent::set_up();

    // Create admin user.
    $this->admin_user_id = static::factory()->user->create( [
        'role' => 'administrator',
    ] );
    \wp_set_current_user( $this->admin_user_id );

    // Create test post.
    $this->post_id = static::factory()->post->create( [
        'post_title'  => 'Test Post',
        'post_status' => 'publish',
        'post_type'   => 'post',
    ] );
}
```

### Available Factories

```php
// Posts.
static::factory()->post->create( [ 'post_title' => 'Test', 'post_status' => 'publish' ] );

// Users.
static::factory()->user->create( [ 'role' => 'administrator' ] );
static::factory()->user->create( [ 'role' => 'editor' ] );
static::factory()->user->create( [ 'role' => 'subscriber' ] );

// Comments.
static::factory()->comment->create( [ 'comment_post_ID' => $post_id ] );

// Terms.
static::factory()->term->create( [ 'taxonomy' => 'category', 'name' => 'Test Category' ] );

// Categories.
static::factory()->category->create( [ 'name' => 'Test Category' ] );

// Create multiple at once.
$post_ids = static::factory()->post->create_many( 5, [ 'post_status' => 'publish' ] );
```

### Create and Get

```php
// create() returns ID only.
$post_id = static::factory()->post->create( [ ... ] );

// create_and_get() returns full object.
$post = static::factory()->post->create_and_get( [ ... ] );
echo $post->post_title;
```

---

## Real WordPress Functions in Tests

With `WP_UnitTestCase`, you have access to ALL WordPress functions:

```php
// Options API.
\update_option( 'key', 'value' );
$value = \get_option( 'key' );
\delete_option( 'key' );

// User functions.
\wp_set_current_user( $user_id );
$can_edit = \current_user_can( 'edit_posts' );

// Post functions.
\wp_delete_post( $post_id, true );
$post = \get_post( $post_id );

// Hooks.
\has_action( 'hook_name', $callback );
\has_filter( 'filter_name', $callback );
\add_action( 'hook_name', $callback );
\do_action( 'hook_name', $args );

// Transients.
\set_transient( 'key', 'value', 3600 );
$value = \get_transient( 'key' );
\delete_transient( 'key' );
```

---

## Database Schema Changes in Tests

### The Problem

**CRITICAL**: `CREATE TABLE` triggers an implicit MySQL `COMMIT` which breaks WordPress Test Suite's transaction-based rollback.

- WordPress Test Suite wraps each test in `START TRANSACTION`
- After each test, it `ROLLBACK`s to restore clean state
- `CREATE TABLE` triggers implicit COMMIT, breaking rollback
- Result: Tables persist incorrectly or disappear between tests

### The Solution: `wpSetUpBeforeClass()`

Use `wpSetUpBeforeClass()` for DDL statements — it runs ONCE before all tests in the class, outside the transaction system:

```php
class YourTest extends TestCase {
    /**
     * Create shared fixtures before class.
     *
     * Runs ONCE before any tests in the class.
     * Use this for CREATE TABLE statements.
     *
     * @param WP_UnitTest_Factory $factory Factory instance.
     */
    public static function wpSetUpBeforeClass( $factory ): void {
        global $wpdb;

        // ✅ CREATE TABLE happens outside transaction system.
        // Safe to use here - runs once before all tests.
        Activator::create_tables();
    }

    /**
     * Setup test environment.
     *
     * Runs BEFORE EACH test. DO NOT create tables here.
     */
    public function set_up(): void {
        parent::set_up();

        // ✅ TRUNCATE is safe - doesn't trigger COMMIT.
        $this->clean_table_data();
    }

    /**
     * Clean table data.
     *
     * @return void
     */
    protected function clean_table_data(): void {
        global $wpdb;
        $table_name = $wpdb->prefix . 'your_table';

        // TRUNCATE doesn't trigger COMMIT - safe for test isolation.
        // phpcs:ignore WordPress.DB.DirectDatabaseQuery
        $wpdb->query( $wpdb->prepare( 'TRUNCATE TABLE %i', $table_name ) );
    }
}
```

### MySQL Statements Reference

**Trigger Implicit COMMIT (use only in `wpSetUpBeforeClass`):**
- `CREATE TABLE` / `DROP TABLE`
- `CREATE DATABASE` / `DROP DATABASE`
- `ALTER TABLE`
- `RENAME TABLE`

**Safe for `set_up()` / `tear_down()`:**
- `TRUNCATE TABLE` (safe in WordPress Test Suite context)
- `INSERT` / `UPDATE` / `DELETE` (regular DML)
- `SELECT` queries

---

## Common Test Patterns

### Testing a Singleton Component

```php
<?php
namespace SilverAssist\PluginName\Tests\Unit\Core;

use SilverAssist\PluginName\Tests\Helpers\TestCase;
use SilverAssist\PluginName\Core\Plugin;

class PluginTest extends TestCase {
    /**
     * Test singleton returns same instance.
     */
    public function testInstanceReturnsSameObject(): void {
        $instance1 = Plugin::instance();
        $instance2 = Plugin::instance();

        $this->assertSame( $instance1, $instance2 );
    }

    /**
     * Test plugin implements LoadableInterface.
     */
    public function testImplementsLoadableInterface(): void {
        $plugin = Plugin::instance();

        $this->assertInstanceOf(
            \SilverAssist\PluginName\Core\Interfaces\LoadableInterface::class,
            $plugin
        );
    }

    /**
     * Test priority value.
     */
    public function testGetPriorityReturnsTen(): void {
        $plugin = Plugin::instance();

        $this->assertSame( 10, $plugin->get_priority() );
    }
}
```

### Testing Options/Settings

```php
public function testActivatorSetsDefaultOptions(): void {
    // Ensure option doesn't exist.
    \delete_option( 'plugin_prefix_settings' );

    // Run activation.
    Activator::activate();

    // Verify defaults were set.
    $settings = \get_option( 'plugin_prefix_settings' );
    $this->assertIsArray( $settings );
    $this->assertTrue( $settings['enabled'] );
}
```

### Testing Hooks Registration

```php
public function testInitRegistersHooks(): void {
    $instance = MyComponent::instance();
    $instance->init();

    $this->assertNotFalse(
        \has_action( 'admin_menu', [ $instance, 'register_menu' ] )
    );
    $this->assertNotFalse(
        \has_filter( 'plugin_action_links', [ $instance, 'add_action_links' ] )
    );
}
```

### Testing Capability Checks

```php
public function testNonAdminCannotAccessSettings(): void {
    // Create subscriber user.
    $subscriber_id = static::factory()->user->create( [ 'role' => 'subscriber' ] );
    \wp_set_current_user( $subscriber_id );

    // Should not pass capability check.
    $this->assertFalse( \current_user_can( 'manage_options' ) );
}

public function testAdminCanAccessSettings(): void {
    // Create admin user.
    $admin_id = static::factory()->user->create( [ 'role' => 'administrator' ] );
    \wp_set_current_user( $admin_id );

    $this->assertTrue( \current_user_can( 'manage_options' ) );
}
```

### Testing Database Operations

```php
public static function wpSetUpBeforeClass( $factory ): void {
    Activator::create_tables();
}

public function set_up(): void {
    parent::set_up();
    $this->clean_table_data();
}

public function testInsertAndRetrieveRecord(): void {
    global $wpdb;
    $table = $wpdb->prefix . 'plugin_table';

    // Insert.
    // phpcs:ignore WordPress.DB.DirectDatabaseQuery
    $wpdb->insert(
        $table,
        [ 'created_at' => current_time( 'mysql' ) ],
        [ '%s' ]
    );

    $id = $wpdb->insert_id;
    $this->assertGreaterThan( 0, $id );

    // Retrieve.
    // phpcs:ignore WordPress.DB.DirectDatabaseQuery
    $result = $wpdb->get_row(
        $wpdb->prepare( 'SELECT * FROM %i WHERE id = %d', $table, $id )
    );

    $this->assertNotNull( $result );
    $this->assertEquals( $id, $result->id );
}
```

---

## Running Tests

### Local Development

```bash
# Run all tests.
vendor/bin/phpunit

# Run specific test suite.
vendor/bin/phpunit --testsuite unit
vendor/bin/phpunit --testsuite integration

# Run specific test file.
vendor/bin/phpunit tests/Unit/Core/PluginTest.php

# Run specific test method.
vendor/bin/phpunit --filter testMethodName

# With coverage (requires xdebug).
vendor/bin/phpunit --coverage-html coverage/
vendor/bin/phpunit --coverage-text

# Human-readable output.
vendor/bin/phpunit --testdox
```

### WordPress Test Suite Installation

```bash
bash scripts/install-wp-tests.sh <db-name> <db-user> <db-pass> <db-host> <wp-version> <skip-database-creation>

# Example:
bash scripts/install-wp-tests.sh wordpress_test root 'root' localhost latest true
```

### CI Pipeline

Tests run automatically in CI via `quality-checks.yml`:
- PHP 8.2 (with coverage)
- PHP 8.3
- PHP 8.4
- WordPress compatibility matrix (6.5, 6.6, 6.7, latest)

---

## Troubleshooting

### "Class WP_UnitTestCase not found"

WordPress Test Suite is not installed. Install it or set `$WP_TESTS_DIR`:

```bash
export WP_TESTS_DIR=/tmp/wordpress-tests-lib
bash scripts/install-wp-tests.sh wordpress_test root 'root' localhost latest true
```

### Tests pass locally but fail in CI

Common causes:
1. **Missing `set_up()` parent call**: Always call `parent::set_up()` first
2. **State leaking between tests**: Use `tear_down()` to clean up
3. **Database table issues**: Use `wpSetUpBeforeClass()` for DDL statements
4. **Timezone differences**: Use `current_time('mysql')` instead of `date()`

### "Table already exists" errors

Don't create tables in `set_up()`. Use `wpSetUpBeforeClass()` which runs once:

```php
public static function wpSetUpBeforeClass( $factory ): void {
    Activator::create_tables(); // Uses dbDelta which handles "IF NOT EXISTS" internally.
}
```

### "Cannot modify header information"

Test is producing output before headers. Check for:
- `echo` statements in tested code
- Missing output buffering
- `beStrictAboutOutputDuringTests="true"` in phpunit.xml.dist (expected behavior)

### Slow tests

- Run only unit tests: `vendor/bin/phpunit --testsuite unit`
- Use `--filter` for specific tests
- Skip WordPress setup for non-integration tests: use `--skip-wp-setup` flag
