---
name: release-management
description: Create and manage releases for Silver Assist WordPress plugins. Covers the unified build script, GitHub Actions release workflow, version bumping, CHANGELOG updates, immutable tag rules, and the full release pipeline. Use when creating releases, setting up release infrastructure for new plugins, or troubleshooting failed releases.
---

# Silver Assist — Plugin Release Management

This skill covers the unified release pipeline used across all Silver Assist WordPress plugins. It includes the build script, GitHub Actions workflow, version management, and release best practices.

## When to Use

- Setting up release infrastructure for a **new** Silver Assist plugin
- Creating a new release for an existing plugin
- Bumping the version number
- Troubleshooting a failed release
- Understanding the build/release pipeline
- Adding or updating the build script or workflow

---

## Architecture Overview

Every Silver Assist plugin follows the same release structure:

```
plugin-slug/
├── scripts/
│   ├── build-release.sh          # Unified build script (identical across plugins)
│   ├── update-version.sh         # Version bumper (full variant)
│   └── update-version-simple.sh  # Version bumper (simple variant)
├── .github/
│   └── workflows/
│       └── release.yml           # GitHub Actions release workflow
├── build/                        # Generated — .gitignored
│   ├── plugin-slug-vX.Y.Z.zip
│   ├── plugin-slug-vX.Y.Z.zip.md5
│   └── plugin-slug-vX.Y.Z.zip.sha256
├── CHANGELOG.md
└── composer.json
```

### Key Principles

1. **Unified scripts** — `build-release.sh` and `release.yml` are identical across all 6 plugins.
2. **Selective copy** — Only runtime files go into the ZIP (no tests, docs, dev configs).
3. **Auto-detection** — The build script finds the main plugin file, slug, and version automatically.
4. **Checksums** — Every ZIP gets MD5 and SHA-256 checksums.
5. **CI-aware** — The build script skips restoring dev dependencies when `$GITHUB_ACTIONS` is set.
6. **Immutable tags** — GitHub tags and releases cannot be reused once created.

---

## ⚠️ CRITICAL: Immutable Tags and Releases

GitHub enforces **immutability** on tags and releases. Once a tag is pushed (even if the release workflow fails), that tag version **CANNOT be reused**.

### NEVER Create Releases Manually

**ALWAYS let the `release.yml` workflow create the GitHub release.**

```bash
# ❌ FORBIDDEN — causes "immutable release" errors
gh release create v1.3.5 --title "..." --notes "..."

# ✅ CORRECT — Only create and push the tag
git tag v1.3.6 -m "Release v1.3.6"
git push origin v1.3.6
```

### If a Release Fails

1. **DO NOT** try to delete and recreate the same tag
2. **DO NOT** manually create a release
3. **INCREMENT** the version (e.g., v1.3.5 → v1.3.6)
4. Start from Step 1 of the release workflow with the new version

---

## Release Workflow (Step by Step)

### Step 1: Update All Versions

Use whichever version script the plugin has:

```bash
# Full variant (acf-clone-fields, silver-assist-post-revalidate, silver-assist-security)
./scripts/update-version.sh 1.2.0 --no-confirm --force

# Simple variant (contact-form-to-api, leadgen-app-form, nextjs-graphql-hooks)
./scripts/update-version-simple.sh 1.2.0 --no-confirm --force
```

Both scripts update:
- Main plugin file `Version:` header
- Plugin version constant (e.g., `PLUGIN_VERSION`)
- All PHP `@version` doc tags in source directories
- All CSS/JS `@version` tags in `assets/`
- Shell script `@version` tags in `scripts/`

### Step 2: Update CHANGELOG.md

Follow [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format:

```markdown
## [1.2.0] - YYYY-MM-DD

### Added
- New features...

### Changed
- Changes to existing functionality...

### Fixed
- Bug fixes...

### Security
- Security improvements...
```

Valid categories: **Added**, **Changed**, **Deprecated**, **Removed**, **Fixed**, **Security**.

### Step 3: Verify Consistency (if available)

```bash
./scripts/check-versions.sh
```

### Step 4: Run Quality Checks

```bash
# Auto-fix first
vendor/bin/phpcbf

# Then verify
vendor/bin/phpcs
vendor/bin/phpstan analyse --memory-limit=1G

# Or use the quality script if available
./scripts/run-quality-checks.sh
```

### Step 5: Commit and Push

```bash
git add -A
git commit -m "chore: bump version to 1.2.0 for release"
git push origin main
```

### Step 6: Create Tag (Triggers the Release)

```bash
git tag v1.2.0 -m "Release v1.2.0"
git push origin v1.2.0
```

### Step 7: Monitor Workflow

```bash
gh run list --workflow=release.yml --limit 3 | cat
gh run watch <run-id> --exit-status
```

---

## Unified Build Script (`scripts/build-release.sh`)

This script is **identical** across all Silver Assist plugins. When setting up a new plugin, copy it verbatim.

### What It Does

1. **Auto-detects** the main plugin file (searches for `Plugin Name:` header)
2. **Copies runtime files** to `build/<plugin-slug>/`:
   - Main plugin file (`.php`)
   - Source directories: `includes/`, `Includes/`, `src/`, `assets/`, `languages/`, `blocks/`, `templates/`
   - Documentation: `README.md`, `CHANGELOG.md`, `LICENSE`, `LICENSE.md`
3. **Builds production vendor** via `composer install --no-dev --optimize-autoloader`
4. **Copies only needed vendor files**:
   - `vendor/autoload.php` + `vendor/composer/*.php` + `vendor/composer/*.json`
   - `vendor/composer/installers/src/` (if present)
   - `vendor/silverassist/*/src/` and `vendor/silverassist/*/assets/` for each package
5. **Validates** the package (main file, autoloader, Silver Assist package assets)
6. **Creates ZIP** with checksums (MD5 + SHA-256)
7. **Restores dev dependencies** locally (skipped in CI)

### Template

```bash
#!/bin/bash

################################################################################
# Silver Assist — Unified Build Release Script
#
# Creates a production-ready WordPress plugin ZIP package.
# Auto-detects plugin structure and copies only runtime files.
#
# Usage: ./scripts/build-release.sh [version]
#
# @package SilverAssist
# @author  Silver Assist
################################################################################

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLUGIN_SLUG=$(basename "$PROJECT_ROOT")

echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  ${PLUGIN_SLUG} — Release Builder${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════${NC}"
echo ""

# Auto-detect main plugin file
MAIN_FILE=$(find "$PROJECT_ROOT" -maxdepth 1 -name "*.php" -exec grep -l "Plugin Name:" {} \; 2>/dev/null | head -1)
if [ -z "$MAIN_FILE" ]; then
    echo -e "${RED}❌ No main plugin file found${NC}"
    exit 1
fi
MAIN_FILE_NAME=$(basename "$MAIN_FILE")

# Get version
if [ -n "$1" ]; then
    VERSION="$1"
else
    VERSION=$(grep -o "Version: [0-9]\+\.[0-9]\+\.[0-9]\+" "$MAIN_FILE" | cut -d' ' -f2)
fi

if [ -z "$VERSION" ]; then
    echo -e "${RED}❌ Could not detect version${NC}"
    exit 1
fi

echo -e "  Plugin:  ${PLUGIN_SLUG}"
echo -e "  File:    ${MAIN_FILE_NAME}"
echo -e "  Version: ${VERSION}"
echo ""

# Setup
BUILD_DIR="${PROJECT_ROOT}/build"
PLUGIN_DIR="${BUILD_DIR}/${PLUGIN_SLUG}"
ZIP_FILE="${PLUGIN_SLUG}-v${VERSION}.zip"

rm -rf "$BUILD_DIR"
mkdir -p "$PLUGIN_DIR"

# ─── Copy plugin files ───────────────────────────────────────────────────────

echo -e "${YELLOW}📋 Copying plugin files...${NC}"

cp "$MAIN_FILE" "$PLUGIN_DIR/"
echo "  ✅ ${MAIN_FILE_NAME}"

for dir in includes Includes src assets languages blocks templates; do
    if [ -d "${PROJECT_ROOT}/${dir}" ]; then
        cp -r "${PROJECT_ROOT}/${dir}" "$PLUGIN_DIR/"
        echo "  ✅ ${dir}/"
    fi
done

for file in README.md CHANGELOG.md LICENSE LICENSE.md; do
    if [ -f "${PROJECT_ROOT}/${file}" ]; then
        cp "${PROJECT_ROOT}/${file}" "$PLUGIN_DIR/"
    fi
done

# ─── Vendor dependencies ─────────────────────────────────────────────────────

echo ""
echo -e "${YELLOW}📦 Building vendor dependencies...${NC}"

cd "$PROJECT_ROOT"

if [ ! -f "composer.json" ]; then
    echo -e "${RED}❌ composer.json not found${NC}"
    exit 1
fi

composer install --no-dev --optimize-autoloader --no-interaction

if [ ! -f "vendor/autoload.php" ]; then
    echo -e "${RED}❌ vendor/autoload.php not found${NC}"
    exit 1
fi

echo -e "${YELLOW}📦 Copying production vendor files...${NC}"

mkdir -p "$PLUGIN_DIR/vendor/composer"
cp vendor/autoload.php "$PLUGIN_DIR/vendor/"
cp vendor/composer/*.php "$PLUGIN_DIR/vendor/composer/"
cp vendor/composer/*.json "$PLUGIN_DIR/vendor/composer/" 2>/dev/null || true
echo "  ✅ autoloader"

if [ -d "vendor/composer/installers" ]; then
    mkdir -p "$PLUGIN_DIR/vendor/composer/installers"
    [ -d "vendor/composer/installers/src" ] && cp -r "vendor/composer/installers/src" "$PLUGIN_DIR/vendor/composer/installers/"
    echo "  ✅ composer/installers"
fi

if [ -d "vendor/silverassist" ]; then
    mkdir -p "$PLUGIN_DIR/vendor/silverassist"
    for package_dir in vendor/silverassist/*/; do
        if [ -d "$package_dir" ]; then
            package_name=$(basename "$package_dir")
            dest="$PLUGIN_DIR/vendor/silverassist/$package_name"
            mkdir -p "$dest"
            [ -d "$package_dir/src" ] && cp -r "$package_dir/src" "$dest/"
            [ -d "$package_dir/assets" ] && cp -r "$package_dir/assets" "$dest/"
            echo "  ✅ silverassist/${package_name}"
        fi
    done
fi

# Restore dev dependencies (skip in CI — environment is ephemeral)
if [ -z "$GITHUB_ACTIONS" ]; then
    echo ""
    echo -e "${YELLOW}📦 Restoring development dependencies...${NC}"
    composer install --no-interaction > /dev/null 2>&1
    echo "  ✅ Dev environment restored"
fi

# ─── Validate ─────────────────────────────────────────────────────────────────

echo ""
echo -e "${YELLOW}🔍 Validating package...${NC}"

ERRORS=0

if [ ! -f "$PLUGIN_DIR/$MAIN_FILE_NAME" ]; then
    echo -e "${RED}  ❌ Main plugin file${NC}"
    ERRORS=$((ERRORS + 1))
fi

if [ ! -f "$PLUGIN_DIR/vendor/autoload.php" ]; then
    echo -e "${RED}  ❌ Autoloader${NC}"
    ERRORS=$((ERRORS + 1))
fi

if [ ! -f "$PLUGIN_DIR/vendor/silverassist/wp-settings-hub/assets/css/settings-hub.css" ]; then
    echo -e "${RED}  ❌ wp-settings-hub CSS asset${NC}"
    ERRORS=$((ERRORS + 1))
else
    echo "  ✅ Settings Hub CSS"
fi

if [ ! -f "$PLUGIN_DIR/vendor/silverassist/wp-github-updater/assets/js/check-updates.js" ]; then
    echo -e "${RED}  ❌ wp-github-updater JS asset${NC}"
    ERRORS=$((ERRORS + 1))
else
    echo "  ✅ GitHub Updater JS"
fi

if [ $ERRORS -gt 0 ]; then
    echo -e "${RED}❌ Validation failed (${ERRORS} errors)${NC}"
    exit 1
fi

echo -e "${GREEN}  ✅ All checks passed${NC}"

# ─── Create ZIP ───────────────────────────────────────────────────────────────

echo ""
echo -e "${YELLOW}🗜️  Creating ZIP...${NC}"

cd "$BUILD_DIR"
zip -r "$ZIP_FILE" "$PLUGIN_SLUG/" -x "*.DS_Store*" > /dev/null

# Checksums
md5sum "$ZIP_FILE" > "${ZIP_FILE}.md5" 2>/dev/null || md5 -r "$ZIP_FILE" > "${ZIP_FILE}.md5"
shasum -a 256 "$ZIP_FILE" > "${ZIP_FILE}.sha256"

cd "$PROJECT_ROOT"

ZIP_SIZE=$(du -h "$BUILD_DIR/$ZIP_FILE" | cut -f1)

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  ✅ Build complete${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════${NC}"
echo ""
echo "  📦 build/${ZIP_FILE} (${ZIP_SIZE})"
echo "  🔐 build/${ZIP_FILE}.md5"
echo "  🔐 build/${ZIP_FILE}.sha256"

# GitHub Actions output
if [ -n "$GITHUB_OUTPUT" ]; then
    echo "zip_path=build/${ZIP_FILE}" >> "$GITHUB_OUTPUT"
    echo "zip_name=${ZIP_FILE}" >> "$GITHUB_OUTPUT"
    echo "version=${VERSION}" >> "$GITHUB_OUTPUT"
    echo "zip_size=${ZIP_SIZE}" >> "$GITHUB_OUTPUT"
fi
```

### Validation Checks

The build script validates these Silver Assist package assets exist in the final package:

| Asset | Path in ZIP |
|-------|------------|
| Settings Hub CSS | `vendor/silverassist/wp-settings-hub/assets/css/settings-hub.css` |
| GitHub Updater JS | `vendor/silverassist/wp-github-updater/assets/js/check-updates.js` |

If the plugin does NOT use these packages, remove the corresponding validation checks.

---

## GitHub Actions Release Workflow (`.github/workflows/release.yml`)

This workflow is **identical** across all Silver Assist plugins. It triggers on `v*` tags or manual dispatch.

### Template

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'
  workflow_dispatch:
    inputs:
      version:
        description: 'Version to release (e.g. 1.2.0). Leave empty to use plugin file version.'
        required: false

permissions:
  contents: write

jobs:
  release:
    name: Build & Release
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup PHP
        uses: shivammathur/setup-php@v2
        with:
          php-version: '8.2'
          tools: composer

      - name: Detect version
        id: version
        run: |
          if [[ "${{ github.event_name }}" == "push" ]]; then
            VERSION="${GITHUB_REF_NAME#v}"
          elif [[ -n "${{ github.event.inputs.version }}" ]]; then
            VERSION="${{ github.event.inputs.version }}"
          else
            VERSION=$(grep -o 'Version: [0-9]\+\.[0-9]\+\.[0-9]\+' *.php 2>/dev/null | head -1 | cut -d' ' -f2)
          fi
          echo "version=$VERSION" >> $GITHUB_OUTPUT
          echo "🏷️ Version: $VERSION"

      - name: Install dependencies
        run: composer install --no-interaction

      - name: Update version
        run: |
          VERSION="${{ steps.version.outputs.version }}"
          if [ -f "scripts/update-version.sh" ]; then
            chmod +x scripts/update-version.sh
            ./scripts/update-version.sh "$VERSION" --no-confirm --force
          elif [ -f "scripts/update-version-simple.sh" ]; then
            chmod +x scripts/update-version-simple.sh
            ./scripts/update-version-simple.sh "$VERSION" --no-confirm --force
          fi

      - name: Code quality
        run: |
          HAS_CHECKS=false
          if [ -f phpcs.xml ] || [ -f .phpcs.xml.dist ] || [ -f phpcs.xml.dist ]; then
            echo "▶ PHPCS"
            vendor/bin/phpcs
            HAS_CHECKS=true
          fi
          if [ -f phpstan.neon ] || [ -f phpstan.neon.dist ]; then
            echo "▶ PHPStan"
            vendor/bin/phpstan analyse --no-progress
            HAS_CHECKS=true
          fi
          if [ "$HAS_CHECKS" = false ]; then
            echo "ℹ️ No quality tool configs found — skipping"
          fi

      - name: Build release
        id: build
        run: |
          chmod +x scripts/build-release.sh
          ./scripts/build-release.sh "${{ steps.version.outputs.version }}"

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          tag_name: v${{ steps.version.outputs.version }}
          name: v${{ steps.version.outputs.version }}
          files: |
            build/*.zip
            build/*.md5
            build/*.sha256
          generate_release_notes: true
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Pinning Actions to SHA Hashes

For production repositories, pin actions to commit SHAs for supply chain security:

```yaml
- uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5 # v4.3.1
- uses: shivammathur/setup-php@44454db4f0199b8b9685a5d763dc37cbf79108e1 # v2.36.0
- uses: softprops/action-gh-release@a06a81a03ee405af7f2048a818ed3f03bbf83c7b # v2.5.0
```

### Workflow Pipeline

```
Tag push (v*) ──► Checkout ──► Setup PHP 8.2
    ──► Detect version ──► Install Composer deps
    ──► Update version in files ──► Code quality (PHPCS + PHPStan)
    ──► Build release ZIP ──► Create GitHub Release with assets
```

---

## Setting Up a New Plugin

When creating release infrastructure for a new Silver Assist plugin:

### 1. Required Files

Create these files (copy templates from above):

- `scripts/build-release.sh` — Make executable: `chmod +x scripts/build-release.sh`
- `.github/workflows/release.yml`
- `scripts/update-version.sh` or `scripts/update-version-simple.sh`

### 2. composer.json Requirements

The plugin must have `silverassist/wp-github-updater` and `silverassist/wp-settings-hub` as production dependencies:

```json
{
    "require": {
        "php": ">=8.2",
        "composer/installers": "^2.3",
        "silverassist/wp-github-updater": "^1.3",
        "silverassist/wp-settings-hub": "^1.2"
    }
}
```

### 3. .gitignore Entries

Ensure these are in `.gitignore`:

```gitignore
# Build directories
build/
dist/

# Dependencies
vendor/
node_modules/
composer.lock

# Archives
*.zip
*.tar.gz
```

### 4. Main Plugin File Header

The main PHP file must have a standard WordPress plugin header with `Plugin Name:` and `Version:`:

```php
<?php
/**
 * Plugin Name: My Plugin Name
 * Plugin URI:  https://github.com/silverassist/my-plugin
 * Description: Plugin description.
 * Version:     1.0.0
 * Author:      Silver Assist
 * Author URI:  https://silverassist.com
 * License:     PolyForm Noncommercial License 1.0.0
 * Text Domain: my-plugin-slug
 */
```

### 5. CHANGELOG.md

Initialize with:

```markdown
# Changelog

All notable changes to Plugin Name will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] - YYYY-MM-DD

### Added
- Initial release
```

---

## Existing Plugins Using This Pipeline

| Plugin | Slug | Main File |
|--------|------|-----------|
| ACF Clone Fields | `acf-clone-fields` | `silver-assist-acf-clone-fields.php` |
| Contact Form to API | `contact-form-to-api` | `contact-form-to-api.php` |
| LeadGen App Form | `leadgen-app-form` | `leadgen-app-form.php` |
| NextJS GraphQL Hooks | `nextjs-graphql-hooks` | `nextjs-graphql-hooks.php` |
| Post Revalidate | `silver-assist-post-revalidate` | `silver-assist-post-revalidate.php` |
| Security | `silver-assist-security` | `silver-assist-security.php` |

---

## Troubleshooting

### Build fails: "No main plugin file found"
The script searches for `Plugin Name:` in root `.php` files. Ensure the header exists in the main plugin file.

### Build fails: "wp-settings-hub CSS asset" or "wp-github-updater JS asset"
The `silverassist/*` packages must include `assets/` directories. Check that `composer.json` lists them in `require` (not `require-dev`), and run `composer install --no-dev` to verify they're included.

### Release fails: "already_exists" error
The tag was already used. Increment the version and create a new tag — never try to reuse a tag.

### ZIP is too large
The build script only copies `src/` and `assets/` from `vendor/silverassist/*` packages. If other vendor packages are needed at runtime, add them to the copy logic in `build-release.sh`.

### Local build leaves dev dependencies removed
The script automatically restores dev deps after building locally. If interrupted, run `composer install` manually.
