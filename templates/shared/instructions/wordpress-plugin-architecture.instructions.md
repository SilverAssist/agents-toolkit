---
description: WordPress plugin architecture standards for Silver Assist plugins including LoadableInterface, PSR-4, MVC pattern, singleton, and SilverAssist packages
name: WordPress Plugin Architecture
applyTo: "**/*.php"
---

# WordPress Plugin Architecture — Silver Assist Plugins

---

## Core Standards

| Attribute | Value |
|-----------|-------|
| PHP | 8.2+ |
| WordPress | 6.5+ |
| Autoloading | PSR-4 (PascalCase files and directories) |
| Standards | PHPCS (WordPress-Extra), PHPStan Level 8 |

---

## PSR-4 Autoloading

Namespace `SilverAssist\PluginName\` maps to `includes/`:

- PHP classes: `PascalCase.php` matching class name exactly
- Directories: `PascalCase/` (e.g., `Core/`, `Admin/`, `Service/`)
- Assets: `kebab-case.css`, `kebab-case.js`

---

## LoadableInterface Priority System

`LoadableInterface` ships from the `silverassist/wp-plugin-kernel` package
(`composer require silverassist/wp-plugin-kernel`, runtime dependency — not
`--dev`) as `\SilverAssist\PluginKernel\Interfaces\LoadableInterface`.
Components implement that interface directly; it is not redefined locally
per plugin. Its contract (three methods, unchanged):

```php
interface LoadableInterface {
    public function init(): void;
    public function get_priority(): int;
    public function should_load(): bool;
}
```

Priority values:

- **10**: Core components (Plugin, Activator, critical services)
- **20**: Services (business logic, API clients)
- **30**: Admin components (controllers, settings pages)
- **40**: Utils & Assets (helpers, loggers)

### Singleton Pattern

```php
class ServiceName implements LoadableInterface {
    private static ?self $instance = null;

    public static function instance(): self {
        if ( null === self::$instance ) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {}

    public function init(): void {
        // Register hooks.
    }

    public function get_priority(): int {
        return 20;
    }

    public function should_load(): bool {
        return true;
    }
}
```

### Component Loading (Plugin.php)

`Plugin.php` extends `\SilverAssist\PluginKernel\AbstractPlugin`, which
provides `instance()`, `init()`, and the should_load()-filter /
priority-sort / init() loading loop. The concrete plugin only implements
`get_components()` — it does not hand-write a `load_components()` loop:

```php
final class Plugin extends \SilverAssist\PluginKernel\AbstractPlugin {
    protected function get_components(): array {
        return [
            // Core — Priority 10.
            \SilverAssist\PluginName\Core\Activator::class,
            // Services — Priority 20.
            \SilverAssist\PluginName\Service\ServiceName::class,
            // Controllers — Priority 30.
            \SilverAssist\PluginName\Controller\Admin\PageController::class,
            // Utils — Priority 40.
        ];
    }
}
```

---

## MVC Flow Pattern

```text
User Request → Controller → Service → Repository/WordPress API
                   ↓
              View::render($data)  ← Static call with prepared data
```

| Layer | Responsibility | Can Depend On |
|-------|---------------|---------------|
| **Controller** | Handle requests, prepare data, coordinate | Services, Views |
| **Service** | Business logic, data processing | Other Services, Repositories |
| **View** | Render HTML (static class) | Only data passed as parameters |
| **Model** | Data structures | Nothing |

### CRITICAL: Views MUST NOT Instantiate Services

```php
// ✅ CORRECT — Controller prepares data, View receives it.
class PageController {
    public function render_page(): void {
        $data = $this->service->get_data();
        PageView::render( $data );
    }
}

class PageView {
    public static function render( array $data ): void {
        // Only use data passed as parameters.
    }
}

// ❌ WRONG — View instantiates Service.
class PageView {
    public static function render(): void {
        $service = ServiceName::instance(); // ❌ Never do this.
        $data = $service->get_data();
    }
}
```

---

## Directory Structure

```text
plugin-name/
├── plugin-name.php              # Main plugin file
├── composer.json
├── phpcs.xml / phpstan.neon / phpunit.xml.dist
├── includes/                    # PSR-4 classes
│   ├── Core/                    # Priority 10
│   │   ├── Plugin.php           # extends AbstractPlugin
│   │   └── Activator.php
│   ├── Service/                 # Priority 20
│   ├── Controller/              # Priority 30
│   ├── View/                    # Static HTML rendering
│   ├── Model/                   # Domain models
│   ├── Repository/              # Data access
│   ├── Infrastructure/          # WordPress integrations
│   └── Utils/                   # Priority 40
├── assets/ (css/, js/)
├── languages/
├── scripts/
├── tests/ (Unit/, Integration/, Helpers/)
└── .github/ (workflows/, copilot-instructions.md)
```

---

## SilverAssist Packages

### wp-plugin-kernel

Ships `LoadableInterface` and `AbstractPlugin` — see "LoadableInterface
Priority System" above. Runtime dependency.

```bash
composer require silverassist/wp-plugin-kernel
```

### wp-github-updater

Enables automatic updates from GitHub releases:

```php
$config = new \SilverAssist\GitHubUpdater\UpdaterConfig(
    plugin_basename: PLUGIN_BASENAME,
    version: PLUGIN_VERSION,
    github_repo: 'SilverAssist/plugin-slug',
    plugin_file: PLUGIN_FILE
);
$config->init();
```

### wp-settings-hub

Shared admin dashboard and settings infrastructure.

---

## Security Guards

### File Header

Every PHP file must start with:

```php
\defined( 'ABSPATH' ) || exit;
```

### Composer Autoloader Validation

Main plugin file validates autoloader path to prevent path traversal:

```php
$autoload_path = PLUGIN_PATH . 'vendor/autoload.php';
$real_autoload = realpath( $autoload_path );
$real_plugin   = realpath( PLUGIN_PATH );

if ( $real_autoload && $real_plugin && 0 === strpos( $real_autoload, $real_plugin ) ) {
    require_once $real_autoload;
}
```

### Plugin Header — Update URI

**CRITICAL**: Must include `Update URI` header to prevent WordPress.org update conflicts:

```php
/**
 * Update URI: https://github.com/SilverAssist/plugin-slug
 */
```
