---
description: Language policy (English-only for technical content), documentation standards, commit messages, and PR conventions for Silver Assist plugins
name: Documentation & Language Policy
applyTo: "**"
---

# Documentation & Language Policy — Silver Assist Plugins

---

## Language Policy

### English-Only Rule

**ALL technical project files MUST be written in ENGLISH:**

- Code comments (PHP, JavaScript, CSS)
- Documentation files (`.md`)
- Commit messages
- Pull Request descriptions
- Issue descriptions
- GitHub Actions workflows (`.yml`)
- Scripts (`.sh`, `.php`)
- README files
- Code variable/function names

**Exception — Spanish allowed:**
- User-facing content in WordPress admin (translation files `.pot`, `.po`)
- Content entered by end users

---

## Documentation Standards

### File Naming

- Major docs: `UPPERCASE.md` (README, CHANGELOG, LICENSE, CONTRIBUTING)
- Specific guides: `lowercase-with-hyphens.md`
- Always use `.md` extension, no spaces

### Markdown Best Practices

- One `# H1` per file (document title)
- Specify language in code blocks (```php, ```bash)
- Use `**Bold**` for important terms, `` `code` `` for inline code
- Use numbered lists for sequential steps, bullet lists for non-sequential

### Callout Conventions

```markdown
**⚠️ WARNING**: Important warning message
**✅ TIP**: Best practice
**❌ AVOID**: Things to avoid
**🔥 CRITICAL**: Critical information
```

---

## Commit Message Standards (Conventional Commits)

### Format

```
type(scope): brief description

Detailed explanation (optional)

Closes #issue-number (if applicable)
```

### Types

| Type | Usage | Example |
|------|-------|---------|
| `feat` | New features | `feat: Add search by sender name` |
| `fix` | Bug fixes | `fix: Resolve N+1 query in log table` |
| `docs` | Documentation only | `docs: Update README with new features` |
| `style` | Code style (no logic change) | `style: Format PHP files with PHPCS` |
| `refactor` | Code refactoring | `refactor: Extract LogWriter from RequestLogger` |
| `perf` | Performance improvements | `perf: Cache resolved error IDs` |
| `test` | Add or update tests | `test: Add unit tests for sender search` |
| `build` | Build system changes | `build: Update composer dependencies` |
| `ci` | CI/CD changes | `ci: Pin actions to SHA hashes` |
| `chore` | Maintenance tasks | `chore: Update dependencies` |

### Examples

**Good:**
```
feat: Add unresolved errors filter with resolved badge

- Add "Unresolved" tab in logs table
- Show green "Resolved" badge for errors with successful retry
- Cache resolved IDs to prevent N+1 queries

Closes #56
```

**Bad:**
```
updates
Fixed bug
Added new feature
```

---

## Jira-Based Commits (WordPress Website Projects)

For WordPress website backend projects (aa-wp, familyassets-wp, osa-wp, assistedlivingorg-wp), use Jira ticket prefixes:

### Format

```
WEB-XXX: Brief description
```

### Examples

```bash
# Good
WEB-726: Setup WordPress 6.8.2 headless backend with Docker
WEB-734: Fix GraphQL query error in nextjs-graphql-hooks plugin
WEB-740: Add Elementor integration for headless CMS
WEB-758: Update Docker configuration for PHP 8.3

# Bad
updates
Fixed bug
WEB-726 (missing colon)
```

### Branch Naming

```
feature/WEB-XXX-description  # New features
bugfix/WEB-XXX-description   # Bug fixes
```

### Protected Branches (Never Commit Directly)

- `main`, `master`, `dev`, `stg`, `staging`

---

## Pull Request Standards

### PR Title

Same convention as commit messages: `type: brief description`

### PR Description Template

```markdown
## Description
Brief summary of changes (1-2 sentences).

## Changes
- Specific change 1
- Specific change 2

## Testing
- [ ] PHPCS passes (0 errors)
- [ ] PHPStan Level 8 passes
- [ ] Unit tests pass
- [ ] Integration tests pass

## Related Issues
Closes #issue-number

## Checklist
- [ ] Code follows WordPress Coding Standards
- [ ] Documentation updated
- [ ] Tests added/updated
```

---

## Code Comments Standards

### Class Headers

```php
/**
 * Class description.
 *
 * @since X.Y.Z
 */
class ClassName {
}
```

### Method/Function Comments

```php
/**
 * Brief description of what the method does.
 *
 * @since X.Y.Z
 *
 * @param string $param1 Description.
 * @param array  $param2 Description.
 * @return bool True on success, false on failure.
 */
public function method_name( string $param1, array $param2 ): bool {
}
```

### Inline Comments

```php
// Single-line comment ending with period.

// TODO: Future enhancement description.
// FIXME: Known issue that needs fixing.
```
