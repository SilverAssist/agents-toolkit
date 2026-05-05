---
name: create-component
description: Create new components in Silver Assist WordPress plugins following the LoadableInterface pattern. Covers adding services, controllers, views, models, repositories, and infrastructure components with proper registration, PHPDoc, and quality checks. Use when adding a new class or feature to an existing plugin.
---

# Silver Assist — Create Component

This skill covers adding new components to an existing Silver Assist WordPress plugin. It provides templates, registration steps, and quality checks for each component type.

## When to Use

- Adding a new Service, Controller, View, Model, or Repository
- Creating a new admin page or feature
- Adding infrastructure components (ListTable, Widget, Handler)
- Registering a new component in `Plugin.php`
- Understanding which component type to use

## Component Type Decision Guide

| Need | Component Type | Priority | LoadableInterface? |
|------|---------------|----------|-------------------|
| Business logic, API calls, data processing | **Service** | 20 | Yes |
| Handle HTTP/admin requests, coordinate Service→View | **Controller** | 30 | Yes |
| Render HTML output | **View** | N/A | No (static class) |
| Represent data structures | **Model** | N/A | No (plain object) |
| Database queries, data access | **Repository** | N/A | No (used by Services) |
| WordPress integrations (WP_List_Table, widgets) | **Infrastructure** | 30 | Optional |
| Shared utilities | **Utils** | 40 | Yes |
| Plugin bootstrap, lifecycle | **Core** | 10 | Yes |

## Directory Structure

```
includes/
├── Core/                    # Priority 10 — Bootstrap & lifecycle
│   ├── Plugin.php           # Main plugin bootstrap (singleton)
│   ├── Activator.php        # Activation/deactivation logic
│   └── Interfaces/
│       └── LoadableInterface.php
├── Service/                 # Priority 20 — Business logic
│   ├── Loader.php           # Service loader (optional)
│   └── Category/            # Group related services
│       └── ServiceName.php
├── Controller/              # Priority 30 — Request handlers
│   ├── Admin/               # Admin page controllers
│   └── Frontend/            # Frontend controllers
├── View/                    # No priority — HTML rendering (static)
│   ├── Admin/               # Admin views
│   └── Frontend/            # Frontend views
├── Model/                   # No priority — Domain models
├── Repository/              # No priority — Data access
├── Infrastructure/          # Priority 30 — WordPress integrations
│   ├── ListTable/
│   └── Widget/
├── Config/                  # Configuration management
├── Exception/               # Custom exceptions
└── Utils/                   # Priority 40 — Utilities
```

---

## Templates

### Service Class (Priority 20)

Services contain business logic. They implement `LoadableInterface` and use the singleton pattern.

```php
<?php
/**
 * ServiceName Service
 *
 * Description of what this service does.
 *
 * @package SilverAssist\PluginName
 * @subpackage Service\Category
 * @since X.Y.Z
 * @version X.Y.Z
 */

namespace SilverAssist\PluginName\Service\Category;

use SilverAssist\PluginName\Core\Interfaces\LoadableInterface;

\defined( 'ABSPATH' ) || exit;

/**
 * Class ServiceName
 *
 * Detailed description of the service's responsibility.
 *
 * @since X.Y.Z
 */
class ServiceName implements LoadableInterface {

	/**
	 * Singleton instance.
	 *
	 * @var self|null
	 */
	private static ?self $instance = null;

	/**
	 * Get singleton instance.
	 *
	 * @return self
	 */
	public static function instance(): self {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Private constructor for singleton.
	 */
	private function __construct() {}

	/**
	 * Initialize the service.
	 *
	 * Register WordPress hooks and filters here.
	 *
	 * @return void
	 */
	public function init(): void {
		// Register hooks here.
	}

	/**
	 * Get loading priority.
	 *
	 * @return int
	 */
	public function get_priority(): int {
		return 20;
	}

	/**
	 * Check if this service should load.
	 *
	 * @return bool
	 */
	public function should_load(): bool {
		return true;
	}
}
```

### Controller Class (Priority 30)

Controllers handle HTTP/admin requests. They coordinate between Services (data) and Views (rendering).

**CRITICAL**: Controllers prepare ALL data and pass it to Views. Views never instantiate Services.

```php
<?php
/**
 * ControllerName Controller
 *
 * Handles requests for feature.
 *
 * @package SilverAssist\PluginName
 * @subpackage Controller\Admin
 * @since X.Y.Z
 * @version X.Y.Z
 */

namespace SilverAssist\PluginName\Controller\Admin;

use SilverAssist\PluginName\Core\Interfaces\LoadableInterface;
use SilverAssist\PluginName\Service\Category\ServiceName;
use SilverAssist\PluginName\View\Admin\ViewName;

\defined( 'ABSPATH' ) || exit;

/**
 * Class ControllerName
 *
 * Coordinates Service → View for feature.
 *
 * @since X.Y.Z
 */
class ControllerName implements LoadableInterface {

	/**
	 * Singleton instance.
	 *
	 * @var self|null
	 */
	private static ?self $instance = null;

	/**
	 * Service instance.
	 *
	 * @var ServiceName
	 */
	private ServiceName $service;

	/**
	 * Get singleton instance.
	 *
	 * @return self
	 */
	public static function instance(): self {
		if ( null === self::$instance ) {
			self::$instance = new self();
		}
		return self::$instance;
	}

	/**
	 * Private constructor for singleton.
	 */
	private function __construct() {
		$this->service = ServiceName::instance();
	}

	/**
	 * Initialize controller.
	 *
	 * @return void
	 */
	public function init(): void {
		\add_action( 'admin_menu', [ $this, 'register_page' ] );
	}

	/**
	 * Get loading priority.
	 *
	 * @return int
	 */
	public function get_priority(): int {
		return 30;
	}

	/**
	 * Check if should load.
	 *
	 * @return bool
	 */
	public function should_load(): bool {
		return \is_admin();
	}

	/**
	 * Register admin page.
	 *
	 * @return void
	 */
	public function register_page(): void {
		\add_submenu_page(
			'parent-slug',
			\__( 'Page Title', 'plugin-text-domain' ),
			\__( 'Menu Title', 'plugin-text-domain' ),
			'manage_options',
			'page-slug',
			[ $this, 'render_page' ]
		);
	}

	/**
	 * Render page.
	 *
	 * Controller prepares all data, then delegates rendering to the View.
	 *
	 * @return void
	 */
	public function render_page(): void {
		// ✅ Controller prepares ALL data.
		$data = $this->service->get_data();

		// ✅ Pass prepared data to static View.
		ViewName::render( $data );
	}
}
```

### View Class (Static — No LoadableInterface)

Views are static classes that render HTML. They NEVER instantiate Services or access the database directly.

**CRITICAL**: All data must be passed as parameters from the Controller.

```php
<?php
/**
 * ViewName View
 *
 * HTML rendering for feature.
 * NOTE: Views receive all data as parameters — never instantiate Services here.
 *
 * @package SilverAssist\PluginName
 * @subpackage View\Admin
 * @since X.Y.Z
 * @version X.Y.Z
 */

namespace SilverAssist\PluginName\View\Admin;

\defined( 'ABSPATH' ) || exit;

/**
 * Class ViewName
 *
 * Renders HTML for feature.
 *
 * @since X.Y.Z
 */
class ViewName {

	/**
	 * Render the main view.
	 *
	 * All data must be passed as parameters from the Controller.
	 * Views should NEVER instantiate Services directly.
	 *
	 * @param array<string, mixed> $data Data to render (prepared by Controller).
	 * @return void
	 */
	public static function render( array $data ): void {
		?>
		<div class="wrap">
			<h1><?php \esc_html_e( 'Page Title', 'plugin-text-domain' ); ?></h1>
			<?php if ( ! empty( $data ) ) : ?>
				<!-- Render data using proper escaping -->
				<p><?php echo \esc_html( $data['message'] ?? '' ); ?></p>
			<?php endif; ?>
		</div>
		<?php
	}
}
```

### Model Class (No LoadableInterface)

Models represent data structures. They are plain PHP objects with typed properties.

```php
<?php
/**
 * ModelName Model
 *
 * Represents a data entity.
 *
 * @package SilverAssist\PluginName
 * @subpackage Model
 * @since X.Y.Z
 * @version X.Y.Z
 */

namespace SilverAssist\PluginName\Model;

\defined( 'ABSPATH' ) || exit;

/**
 * Class ModelName
 *
 * Data transfer object for entity.
 *
 * @since X.Y.Z
 */
class ModelName {

	/**
	 * Constructor.
	 *
	 * @param int    $id   Entity ID.
	 * @param string $name Entity name.
	 * @param string $status Entity status.
	 */
	public function __construct(
		public readonly int $id,
		public readonly string $name,
		public readonly string $status = 'active',
	) {}

	/**
	 * Create from database row.
	 *
	 * @param object $row Database row object.
	 * @return self
	 */
	public static function from_row( object $row ): self {
		return new self(
			id: (int) $row->id,
			name: (string) $row->name,
			status: (string) ( $row->status ?? 'active' ),
		);
	}

	/**
	 * Convert to array.
	 *
	 * @return array<string, mixed>
	 */
	public function to_array(): array {
		return [
			'id'     => $this->id,
			'name'   => $this->name,
			'status' => $this->status,
		];
	}
}
```

### Repository Class (No LoadableInterface)

Repositories handle database queries. They are used by Services.

```php
<?php
/**
 * ModelName Repository
 *
 * Data access for entity.
 *
 * @package SilverAssist\PluginName
 * @subpackage Repository
 * @since X.Y.Z
 * @version X.Y.Z
 */

namespace SilverAssist\PluginName\Repository;

use SilverAssist\PluginName\Model\ModelName;

\defined( 'ABSPATH' ) || exit;

/**
 * Class ModelNameRepository
 *
 * Handles database operations for entity.
 *
 * @since X.Y.Z
 */
class ModelNameRepository {

	/**
	 * Table name (without prefix).
	 *
	 * @var string
	 */
	private string $table;

	/**
	 * Constructor.
	 */
	public function __construct() {
		global $wpdb;
		$this->table = $wpdb->prefix . 'plugin_prefix_table';
	}

	/**
	 * Find by ID.
	 *
	 * @param int $id Entity ID.
	 * @return ModelName|null
	 */
	public function find( int $id ): ?ModelName {
		global $wpdb;

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$row = $wpdb->get_row(
			$wpdb->prepare(
				// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				"SELECT * FROM {$this->table} WHERE id = %d",
				$id
			)
		);

		if ( ! $row ) {
			return null;
		}

		return ModelName::from_row( $row );
	}

	/**
	 * Find all with pagination.
	 *
	 * @param int $per_page Items per page.
	 * @param int $page     Page number.
	 * @return array<int, ModelName>
	 */
	public function find_all( int $per_page = 20, int $page = 1 ): array {
		global $wpdb;

		$offset = ( $page - 1 ) * $per_page;

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$rows = $wpdb->get_results(
			$wpdb->prepare(
				// phpcs:ignore WordPress.DB.PreparedSQL.InterpolatedNotPrepared
				"SELECT * FROM {$this->table} ORDER BY id DESC LIMIT %d OFFSET %d",
				$per_page,
				$offset
			)
		);

		return array_map(
			fn( object $row ) => ModelName::from_row( $row ),
			$rows
		);
	}

	/**
	 * Save entity.
	 *
	 * @param ModelName $model Entity to save.
	 * @return int|false Inserted ID or false on failure.
	 */
	public function save( ModelName $model ): int|false {
		global $wpdb;

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery
		$result = $wpdb->insert(
			$this->table,
			$model->to_array(),
			[ '%d', '%s', '%s' ]
		);

		return $result ? (int) $wpdb->insert_id : false;
	}

	/**
	 * Delete by ID.
	 *
	 * @param int $id Entity ID.
	 * @return bool
	 */
	public function delete( int $id ): bool {
		global $wpdb;

		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$result = $wpdb->delete(
			$this->table,
			[ 'id' => $id ],
			[ '%d' ]
		);

		return (bool) $result;
	}
}
```

---

## Registration Steps

After creating a component class that implements `LoadableInterface`:

### 1. Register in Plugin.php

Edit `includes/Core/Plugin.php` — add the class to `get_components()`:

```php
private function get_components(): array {
    return [
        // Core - Priority 10.
        \SilverAssist\PluginName\Core\Activator::class,

        // Services - Priority 20.
        \SilverAssist\PluginName\Service\Category\ServiceName::class,  // ← NEW

        // Controllers - Priority 30.
        \SilverAssist\PluginName\Controller\Admin\ControllerName::class,  // ← NEW

        // Utils - Priority 40.
    ];
}
```

**Rules:**
- Group by priority tier with comments.
- Keep entries alphabetically within each group.
- Only add classes that implement `LoadableInterface`.
- Models, Views, Repositories, and Exceptions are NOT registered here.

### 2. Create Matching Test File

Test file mirrors the source file path under `tests/Unit/`:

| Source | Test |
|--------|------|
| `includes/Service/Api/ApiClient.php` | `tests/Unit/Service/Api/ApiClientTest.php` |
| `includes/Controller/Admin/LogsController.php` | `tests/Unit/Controller/Admin/LogsControllerTest.php` |
| `includes/Model/LogEntry.php` | `tests/Unit/Model/LogEntryTest.php` |

```php
<?php
namespace SilverAssist\PluginName\Tests\Unit\Service\Category;

use SilverAssist\PluginName\Tests\Helpers\TestCase;
use SilverAssist\PluginName\Service\Category\ServiceName;

/**
 * Tests for ServiceName.
 *
 * @covers \SilverAssist\PluginName\Service\Category\ServiceName
 */
class ServiceNameTest extends TestCase {

	/**
	 * Service instance.
	 *
	 * @var ServiceName
	 */
	private ServiceName $service;

	/**
	 * Set up test fixtures.
	 *
	 * @return void
	 */
	public function set_up(): void {
		parent::set_up();
		$this->service = ServiceName::instance();
	}

	/**
	 * Test singleton returns same instance.
	 *
	 * @return void
	 */
	public function testInstanceReturnsSameObject(): void {
		$instance1 = ServiceName::instance();
		$instance2 = ServiceName::instance();
		$this->assertSame( $instance1, $instance2 );
	}

	/**
	 * Test get_priority returns expected value.
	 *
	 * @return void
	 */
	public function testGetPriorityReturnsExpectedValue(): void {
		$this->assertSame( 20, $this->service->get_priority() );
	}

	/**
	 * Test should_load returns true.
	 *
	 * @return void
	 */
	public function testShouldLoadReturnsTrue(): void {
		$this->assertTrue( $this->service->should_load() );
	}
}
```

### 3. Run Quality Checks

```bash
# Check PHPCS compliance for the new file.
vendor/bin/phpcs includes/Service/Category/ServiceName.php

# Run PHPStan on the new file.
php -d memory_limit=512M vendor/bin/phpstan analyse includes/Service/Category/ServiceName.php --level=8

# Run the matching test.
vendor/bin/phpunit --filter ServiceNameTest

# Full quality check.
./scripts/run-quality-checks.sh
```

---

## MVC Flow Pattern

The correct data flow in Silver Assist plugins is:

```
User Request → Controller → Service → Repository/WordPress API
                   ↓
              View::render($data)  ← Static call with prepared data
```

**Rules:**
1. **Controller** receives the request, calls Service methods, prepares data, passes to View.
2. **Service** contains business logic, calls Repositories or WordPress APIs.
3. **View** renders HTML using ONLY the data passed as parameters.
4. **Model** is a data structure used to transfer data between layers.
5. **Repository** handles database operations, returns Models.

**Anti-patterns to avoid:**
- ❌ View instantiating a Service: `$service = ServiceName::instance();`
- ❌ View making database queries directly.
- ❌ Controller containing business logic (should delegate to Service).
- ❌ Service rendering HTML (should delegate to View via Controller).

---

## Component Checklist

Before submitting a PR with a new component:

- [ ] Follows namespace convention `SilverAssist\PluginName\`
- [ ] File path matches PSR-4 autoloading (PascalCase)
- [ ] Implements `LoadableInterface` (if needs initialization)
- [ ] Uses singleton pattern with `instance()` method
- [ ] Has complete PHPDoc with `@package`, `@since`, `@version`
- [ ] Uses `\` prefix for WordPress functions in namespaced code
- [ ] Uses `\defined( 'ABSPATH' ) || exit;` security guard
- [ ] Single quotes for simple strings, double for interpolation
- [ ] Registered in `Plugin.php::get_components()` (if LoadableInterface)
- [ ] Matching test file created in `tests/Unit/`
- [ ] Views do NOT instantiate Services (data passed from Controller)
- [ ] Controllers prepare all data before passing to Views
- [ ] Passes `vendor/bin/phpcs`
- [ ] Passes `vendor/bin/phpstan analyse --level=8`
- [ ] Test passes with `vendor/bin/phpunit --filter ComponentNameTest`
