---
description: Scaffold a new component (Service, Controller, View, Model, Repository) in a Silver Assist WordPress plugin
agent: agent
tools:
  - run_in_terminal
  - read_file
  - replace_string_in_file
  - create_file
---

# New Component

Scaffold a new component in the current Silver Assist plugin following the LoadableInterface architecture.

## Inputs

Ask the user:
1. **Component type** — Service, Controller, View, Model, or Repository?
2. **Component name** — e.g., `EmailNotification`, `ReportGenerator`
3. **Category/subdirectory** — e.g., `Admin`, `Frontend`, `Email` (optional)

## Steps

1. **Detect plugin** — Find the plugin root, namespace, and existing component structure.

2. **Create the component file** — Use the create-component skill templates to generate the class file in the appropriate directory:
   - `includes/Service/` for Services (LoadableInterface, priority 20)
   - `includes/Controller/Admin/` or `includes/Controller/Frontend/` for Controllers (LoadableInterface, priority 30)
   - `includes/View/Admin/` or `includes/View/Frontend/` for Views (static class, no LoadableInterface)
   - `includes/Model/` for Models (plain object, no LoadableInterface)
   - `includes/Repository/` for Repositories (no LoadableInterface, used by Services)

3. **Register in Plugin.php** — If the component implements LoadableInterface, add it to the `$components` array in `Plugin.php` with the correct priority.

4. **Create test file** — Generate a corresponding test file at `tests/` following the testing conventions:
   - Test class extends the plugin's base `TestCase` (which extends `WP_UnitTestCase`)
   - Use `camelCase` for test methods, `snake_case` for lifecycle methods
   - Include `@group` and `@coversDefaultClass` PHPDoc annotations

5. **Verify** — Run PHPCS and PHPStan on the new file:
   ```bash
   vendor/bin/phpcs path/to/NewFile.php
   vendor/bin/phpstan analyse path/to/NewFile.php --memory-limit=1G
   ```

## Important

- The create-component skill has full templates and MVC flow documentation — use it.
- Views must NEVER instantiate Services directly. Controllers coordinate Service → View.
- All public methods must have `@param` and `@return` PHPDoc with concrete types (PHPStan level 8).
- Use the plugin's text domain for all translatable strings.
