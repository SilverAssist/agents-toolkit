# Implementation Plan: Multi-Stack & Multi-Tracker Support

> Issue: [#9](https://github.com/SilverAssist/copilot-prompts-kit/issues/9)
> Branch: `refactor/7-deduplicate-templates` (merged with #7 work for v2.0.0)

---

## Problem Statement

The package installs ALL templates regardless of the user's stack (React/TS vs PHP/WordPress) or issue tracker (Jira vs GitHub). Users working with GitHub Issues must maintain local overrides in `~/.copilot/` which defeats the package's purpose.

---

## Remaining Work (after PR #10 content)

### Content Already Done (PR #10)

- 5 PHP/WordPress instructions
- 4 WordPress prompts (`new-wp-component`, `new-wp-plugin`, `prepare-release`, `quality-check`)
- 5 WordPress skills

### Content Still Needed

| File | Type | Purpose |
|------|------|---------|
| `_partials/github-integration.md` | Partial | GitHub issue/PR operations |
| `analyze-github-issue.prompt.md` | Prompt | GitHub variant of analyze-ticket |
| `work-github-issue.prompt.md` | Prompt | GitHub variant of work-ticket |
| Updated `pr-template.md` | Partial | Dual format (Jira + GitHub) |

### CLI Changes Needed

| Feature | Description |
|---------|-------------|
| `--stack` flag | Filter: `react` / `wordpress` / `all` (default: `all`) |
| `--tracker` flag | Filter: `jira` / `github` / `all` (default: `all`) |
| Config schema | Add `stack` and `tracker` fields to `.agents-toolkit.json` |
| File tagging | Map template files to stack/tracker categories |

---

## File Categorization Strategy

Instead of adding metadata files, use a simple mapping object in the CLI:

```javascript
const FILE_CATEGORIES = {
  instructions: {
    react: ['css-styling', 'react-components', 'server-actions', 'tests', 'typescript'],
    wordpress: ['php-standards', 'wordpress-plugin-architecture', 'testing-standards'],
    universal: ['documentation-language', 'github-workflow'],
  },
  prompts: {
    react: [],
    wordpress: ['new-wp-component', 'new-wp-plugin', 'quality-check'],
    universal: ['analyze-ticket', 'work-ticket', 'create-plan', 'create-pr',
                'prepare-pr', 'finalize-pr', 'review-code', 'fix-issues',
                'add-tests', 'prepare-release'],
    jira: ['analyze-ticket', 'work-ticket'],
    github: ['analyze-github-issue', 'work-github-issue'],
  },
  partials: {
    jira: ['jira-integration'],
    github: ['github-integration'],
    universal: ['git-operations', 'pr-template', 'validations', 'documentation'],
  },
  skills: {
    react: ['component-architecture', 'testing-patterns'],
    wordpress: ['create-component', 'plugin-creation', 'quality-checks', 'testing'],
    universal: ['domain-driven-design', 'release-management'],
  },
};
```

### Filter Logic

```javascript
function shouldIncludeFile(filename, category, { stack, tracker }) {
  const cats = FILE_CATEGORIES[category];
  // Universal files always included
  if (cats.universal?.includes(filename)) return true;
  // Stack filter
  if (stack !== 'all') {
    if (cats.react?.includes(filename) && stack !== 'react') return false;
    if (cats.wordpress?.includes(filename) && stack !== 'wordpress') return false;
  }
  // Tracker filter (only applies to prompts/partials)
  if (tracker !== 'all') {
    if (cats.jira?.includes(filename) && tracker !== 'jira') return false;
    if (cats.github?.includes(filename) && tracker !== 'github') return false;
  }
  return true;
}
```

---

## Phase Breakdown

### Phase 1: Add GitHub Content

1. Create `templates/shared/prompts/_partials/github-integration.md`
2. Create `templates/shared/prompts/analyze-github-issue.prompt.md`
3. Create `templates/shared/prompts/work-github-issue.prompt.md`
4. Update `templates/shared/prompts/_partials/pr-template.md` (dual format)
5. Mirror to `.github/prompts/` (dogfooding)

### Phase 2: CLI `--stack` and `--tracker` Flags

1. Add `FILE_CATEGORIES` mapping
2. Add `shouldIncludeFile()` filter function
3. Update `copyDir()` to accept a `filter` option
4. Parse `--stack` and `--tracker` from args
5. Read from `.agents-toolkit.json` if flags not provided
6. Update `DEFAULT_CONFIG` with `stack: 'all'` and `tracker: 'all'`
7. Update help text and examples

### Phase 3: Tests

1. Test `--stack react` filters out WordPress files
2. Test `--stack wordpress` filters out React files
3. Test `--tracker github` filters out Jira prompts
4. Test `--tracker jira` filters out GitHub prompts
5. Test `--stack all --tracker all` installs everything (default)
6. Test config file overrides

### Phase 4: Documentation

1. Update README with new flags
2. Update CHANGELOG
3. Update PR #10 body to include `Closes #9`

---

## Acceptance Criteria

- [ ] `github-integration.md` partial added
- [ ] `analyze-github-issue.prompt.md` and `work-github-issue.prompt.md` added
- [ ] `pr-template.md` supports both Jira and GitHub formats
- [ ] CLI `--stack` and `--tracker` flags work
- [ ] Config `stack`/`tracker` fields read from `.agents-toolkit.json`
- [ ] All existing tests pass + new tests for filtering
- [ ] README updated
- [ ] Backward compatible: no flags = install everything
