---
description: PHPUnit testing standards, conventions, and patterns for Silver Assist WordPress plugins using WP_UnitTestCase
name: Testing Standards
applyTo: "tests/**/*.php"
---

# PHPUnit Testing Standards — Silver Assist Plugins

**Applies to**: All test files in Silver Assist WordPress plugins

---

## Must-Follow Rules

### 1. Base Class: All Tests Extend TestCase (WP_UnitTestCase)

```php
use SilverAssist\PluginName\Tests\Helpers\TestCase;

class MyTest extends TestCase {
    // Tests here.
}
```

### 2. Lifecycle Methods Use WordPress snake_case

Since TestCase extends WP_UnitTestCase, use WordPress-style snake_case:

```php
// ✅ CORRECT — WordPress snake_case (WP_UnitTestCase).
public function set_up(): void
public function tear_down(): void
public static function set_up_before_class(): void
public static function tear_down_after_class(): void

// ❌ WRONG — PHPUnit camelCase (don't use with WP_UnitTestCase).
public function setUp(): void
public function tearDown(): void
```

### 3. Test Method Naming — camelCase

```php
// ✅ CORRECT — Descriptive camelCase test names.
public function testStartRequestCreatesLogEntry(): void
public function testSearchMatchesSenderName(): void

// ❌ WRONG — Vague names.
public function testMethod(): void
public function testItWorks(): void
```

### 4. Database Queries: Use %i for Table Names

```php
// ✅ CORRECT
$wpdb->prepare( 'SELECT * FROM %i WHERE id = %d', $table_name, $id );

// ❌ WRONG — Variable interpolation.
$wpdb->prepare( "SELECT * FROM {$table_name} WHERE id = %d", $id );
```

### 5. Skip When Dependencies Missing

```php
public function set_up(): void {
    parent::set_up();

    if ( ! class_exists( 'WPCF7_ContactForm' ) ) {
        $this->markTestSkipped( 'Contact Form 7 not loaded' );
        return; // IMPORTANT: always return after skip.
    }
}
```

### 6. Always Clean Up Resources

```php
public function tear_down(): void {
    $this->service = null;
    parent::tear_down();
}
```

### 7. Use PHPDoc Group Annotations

```php
/**
 * Tests for ClassName.
 *
 * @group unit
 * @group logging
 * @covers \SilverAssist\PluginName\Service\ClassName
 */
class ClassNameTest extends TestCase {
}
```

---

## Test Structure Template

```php
<?php
/**
 * Tests for ClassName.
 *
 * @package SilverAssist\PluginName\Tests\Unit
 */

namespace SilverAssist\PluginName\Tests\Unit\Service\Category;

use SilverAssist\PluginName\Tests\Helpers\TestCase;
use SilverAssist\PluginName\Service\Category\ClassName;

/**
 * ClassName test case.
 *
 * @group unit
 * @group service
 * @covers \SilverAssist\PluginName\Service\Category\ClassName
 */
class ClassNameTest extends TestCase {

    /**
     * Instance under test.
     *
     * @var ClassName|null
     */
    private ?ClassName $instance = null;

    /**
     * Set up test fixtures.
     */
    public function set_up(): void {
        parent::set_up();
        $this->instance = new ClassName();
    }

    /**
     * Tear down test fixtures.
     */
    public function tear_down(): void {
        $this->instance = null;
        parent::tear_down();
    }

    /**
     * Test that method returns expected value.
     */
    public function testMethodReturnsExpectedValue(): void {
        $result = $this->instance->method( 'input' );
        $this->assertSame( 'expected', $result );
    }
}
```

---

## Data Provider Pattern

```php
/**
 * Data provider for search tests.
 *
 * @return array<string, array{item: array<string, mixed>, search: string, expected: bool}>
 */
public static function searchDataProvider(): array {
    return [
        'exact match' => [
            'item'     => [ 'name' => 'John Doe' ],
            'search'   => 'john',
            'expected' => true,
        ],
        'no match' => [
            'item'     => [ 'name' => 'John Doe' ],
            'search'   => 'jane',
            'expected' => false,
        ],
    ];
}

/**
 * @dataProvider searchDataProvider
 * @param array<string, mixed> $item     Item to search.
 * @param string               $search   Search term.
 * @param bool                 $expected Expected result.
 */
public function testSearchMatching( array $item, string $search, bool $expected ): void {
    $result = $this->instance->matches_search( $item, $search );
    $this->assertSame( $expected, $result );
}
```

---

## Assertion Best Practices

```php
// ✅ Use specific assertions.
$this->assertSame( 'expected', $actual );        // Strict type + value.
$this->assertEquals( 5, $count );                // Value equality.
$this->assertTrue( $result );
$this->assertNull( $value );
$this->assertCount( 3, $array );
$this->assertArrayHasKey( 'key', $array );
$this->assertInstanceOf( ClassName::class, $obj );

// ❌ Avoid generic assertions.
$this->assertTrue( $result === 'expected' );     // Use assertSame.
$this->assertTrue( count( $array ) === 3 );      // Use assertCount.
```

### Add Assertion Messages

```php
$this->assertSame(
    3,
    $result['total'],
    'Should count 3 total errors (700, 701, 703)'
);
```

---

## WordPress Factory Pattern

```php
public function testWithFactory(): void {
    $user_id = $this->factory->user->create( [
        'role' => 'administrator',
    ] );

    $post_id = $this->factory->post->create( [
        'post_author' => $user_id,
        'post_title'  => 'Test Post',
    ] );

    wp_set_current_user( $user_id );
    $this->assertTrue( current_user_can( 'manage_options' ) );
}
```

---

## Running Tests

```bash
# Run all tests.
vendor/bin/phpunit

# Run specific test file.
vendor/bin/phpunit tests/Unit/Service/ClassNameTest.php

# Run specific test method.
vendor/bin/phpunit --filter testMethodName

# Run tests by group.
vendor/bin/phpunit --group unit
vendor/bin/phpunit --group integration

# Run with coverage.
vendor/bin/phpunit --coverage-text
```
