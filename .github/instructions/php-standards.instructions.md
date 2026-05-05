---
description: PHP coding standards, WordPress conventions, security, type safety, and i18n for Silver Assist WordPress plugins
name: PHP Standards
applyTo: "**/*.php"
---

# PHP Code Quality Standards — Silver Assist Plugins

**Applies to**: All PHP files in Silver Assist WordPress plugins
**Standards**: PHPCS (WordPress-Extra), PHPStan Level 8, PHP 8.2+

---

## Quality Gates (MANDATORY Before Commit)

```bash
# 1. Auto-fix formatting (REQUIRED FIRST).
vendor/bin/phpcbf

# 2. Check WordPress Coding Standards (MUST PASS — 0 errors).
vendor/bin/phpcs

# 3. Static Analysis Level 8 (MUST PASS — 0 errors).
vendor/bin/phpstan analyse includes/ --level=8

# 4. Run tests (MUST PASS — all green).
vendor/bin/phpunit
```

**Zero tolerance**: Code with PHPCS or PHPStan errors will be rejected by CI/CD.

---

## WordPress Coding Standards (PHPCS)

### 1. Inline Comments MUST End with Punctuation

```php
// ✅ CORRECT
// This is a proper comment.
the_content();

// ❌ WRONG — Will fail PHPCS.
// This is wrong
the_content();
```

### 2. Use Tabs for Indentation (WordPress Standard)

```php
// ✅ CORRECT
if ( $condition ) {
	echo 'Use tabs';
}

// ❌ WRONG
if ( $condition ) {
    echo 'Spaces fail PHPCS';
}
```

### 3. Spaces Inside Parentheses

```php
// ✅ CORRECT — Spaces inside parentheses.
if ( $condition ) {
    do_something( $param1, $param2 );
}

// ❌ WRONG — No spaces.
if ($condition) {
    do_something($param1, $param2);
}
```

### 4. String Quotation

```php
// ✅ Single quotes for strings without interpolation.
$status = 'error';
__( 'Text', 'plugin-text-domain' );

// ✅ Double quotes for interpolation.
$message = "Error in form {$form_id}";

// ❌ WRONG — Double quotes without interpolation.
$status = "error";
```

### 5. WordPress Functions in Namespaced Code

```php
// ✅ Use backslash prefix for WordPress/global functions.
\add_action( 'init', [ $this, 'init' ] );
\get_option( 'option_name' );
\sanitize_text_field( $input );

// ❌ No prefix causes potential namespace resolution issues.
add_action( 'init', [ $this, 'init' ] );
```

### 6. PHP File Header

```php
<?php
/**
 * File description.
 *
 * @package    SilverAssist\PluginName
 * @subpackage Component
 * @since      X.Y.Z
 */

namespace SilverAssist\PluginName\Component;

\defined( 'ABSPATH' ) || exit;
```

---

## Security (CRITICAL)

### Nonce Validation (CSRF Protection)

```php
// ✅ CORRECT — Verify nonce FIRST in AJAX handlers.
public function ajax_handler(): void {
    check_ajax_referer( 'plugin_nonce', 'nonce' );

    if ( ! current_user_can( 'manage_options' ) ) {
        wp_send_json_error( 'Unauthorized', 403 );
        return;
    }

    wp_send_json_success( $data );
}
```

### Input Sanitization

```php
$text   = \sanitize_text_field( \wp_unslash( $_POST['field'] ) );
$email  = \sanitize_email( $_POST['email'] );
$url    = \esc_url_raw( $_POST['url'] );
$int    = \absint( $_POST['number'] );
$key    = \sanitize_key( $_POST['key'] );
$array  = \array_map( 'sanitize_text_field', $_POST['items'] );
```

### Output Escaping

| Function | Use Case | Example |
|----------|----------|---------|
| `esc_html()` | Plain text | `<h1><?php echo esc_html( $title ); ?></h1>` |
| `esc_url()` | URLs (href, src) | `<a href="<?php echo esc_url( $url ); ?>">` |
| `esc_attr()` | HTML attributes | `<div class="<?php echo esc_attr( $class ); ?>">` |
| `wp_kses_post()` | Rich HTML content | `<?php echo wp_kses_post( $content ); ?>` |

### Database Queries — Always Prepared Statements

```php
// ✅ CORRECT — Use %i for table/column names (WordPress 6.2+).
$results = $wpdb->get_results(
    $wpdb->prepare(
        'SELECT * FROM %i WHERE status = %s AND form_id = %d',
        $table_name,
        $status,
        $form_id
    ),
    ARRAY_A
);

// ❌ WRONG — Direct interpolation (SQL injection risk).
$results = $wpdb->get_results(
    "SELECT * FROM {$table_name} WHERE status = '{$status}'"
);
```

**Placeholder Reference:**

| Placeholder | Use Case |
|-------------|----------|
| `%i` | Identifiers (table/column names) |
| `%s` | Strings |
| `%d` | Integers |
| `%f` | Floats |

---

## Type Safety (PHPStan Level 8)

### Strict Types Required

```php
// ✅ Full type hints on all methods.
public function process_log( int $log_id, string $status ): bool {
    return true;
}

/**
 * @param array<string, mixed> $filters Filter parameters.
 * @return array<int, array<string, mixed>> Log entries.
 */
public function get_logs( array $filters ): array {
    return [];
}
```

### Nullable Types

```php
private ?int $log_id = null;

public function get_log( int $log_id ): ?array {
    // May return null if not found.
}
```

### PHPDoc for Complex Types

```php
/**
 * @param array{
 *     id: int,
 *     status: string,
 *     error_message?: string,
 * } $entry Entry data.
 * @return array{items: array<int, array<string, mixed>>, total: int}
 */
public function process_entry( array $entry ): array {
}
```

---

## Internationalization (i18n)

### Text Domain — Always Literal String

```php
// ✅ CORRECT — Literal text domain (extractable).
__( 'Error occurred', 'plugin-text-domain' );
esc_html_e( 'Success!', 'plugin-text-domain' );

// ❌ WRONG — Variable/constant (NOT extractable by wp i18n make-pot).
__( 'Error', $text_domain );
```

### Ordered Placeholders (MANDATORY for Multiple Args)

```php
// ✅ CORRECT — Positional placeholders with translator comment.
sprintf(
    /* translators: %1$s: form name, %2$d: submission count */
    __( 'Form "%1$s" has %2$d submissions', 'plugin-text-domain' ),
    $form_name,
    $count
);

// ❌ WRONG — Unordered placeholders (PHPCS error).
sprintf( __( 'Form "%s" has %d submissions', 'plugin-text-domain' ), $form_name, $count );
```

### Translation Functions Reference

| Function | Use Case |
|----------|----------|
| `__()` | Return translated string |
| `_e()` | Echo translated string |
| `esc_html__()` | Return translated + escaped for HTML |
| `esc_html_e()` | Echo translated + escaped for HTML |
| `esc_attr__()` | Return translated + escaped for attribute |
| `_n()` | Singular/plural forms |
| `_x()` | Translation with context |

### Pre-PR: Update .pot File

```bash
wp i18n make-pot . languages/plugin-text-domain.pot --domain=plugin-text-domain
```

---

## Common PHPCS Errors & Quick Fixes

| Error | Fix |
|-------|-----|
| `Inline comments must end in full-stops` | Add `.` to end of comment |
| `Whitespace found at end of line` | Remove trailing spaces (phpcbf auto-fixes) |
| `Tabs must be used to indent lines` | Replace spaces with tabs |
| `Use single quotes when not evaluating` | Change `"string"` to `'string'` |
| `Detected usage of a non-sanitized input` | Add `sanitize_*()` function |
| `OutputNotEscaped` | Use `esc_html()`, `esc_url()`, `esc_attr()` |
