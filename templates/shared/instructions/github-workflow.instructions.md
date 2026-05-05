---
description: GitHub workflow standards including branch management, PRs, issues, releases, and gh CLI usage for Silver Assist plugins
name: GitHub Workflow
applyTo: "**"
---

# GitHub Workflow — Silver Assist Plugins

---

## Branch Management

### Naming Conventions

```
main                 → Production branch (default)
feature/description  → New features
fix/description      → Bug fixes
chore/description    → Maintenance tasks
hotfix/description   → Emergency fixes
release/vX.Y.Z       → Release preparation
refactor/description → Code refactoring
```

### Workflow

```bash
# 1. Start new feature from main.
git checkout main && git pull origin main
git checkout -b feature/new-feature

# 2. Work and commit.
git add . && git commit -m "feat: Add new feature"

# 3. MANDATORY: Run quality checks BEFORE pushing.
vendor/bin/phpcs && vendor/bin/phpstan analyse && vendor/bin/phpunit

# 4. Push and create PR.
git push -u origin feature/new-feature
gh pr create --title "feat: Add new feature" --base main | cat

# 5. After merge, clean up branches.
git checkout main && git pull origin main
git branch -d feature/new-feature
git push origin --delete feature/new-feature
```

### Rules

- **NEVER** commit directly to `main`
- **NEVER** merge without CI passing
- **ALWAYS** delete branches after merge
- **ALWAYS** run quality checks before pushing

---

## GitHub CLI — ALWAYS Pipe to `cat`

**CRITICAL**: Always append `| cat` or use `GH_PAGER=cat` to prevent terminal pagination:

```bash
# ✅ CORRECT
gh issue list | cat
gh pr view 42 | cat
GH_PAGER=cat gh run list --limit 5

# ❌ WRONG — Will hang waiting for pager input.
gh issue list
gh pr view 42
```

### Quick Reference

```bash
# Issues.
gh issue list | cat
gh issue create --label "enhancement" | cat
gh issue view NUMBER | cat
gh issue close NUMBER --comment "Completed in PR #XX" | cat

# Pull Requests.
gh pr list | cat
gh pr create --base main | cat
gh pr view NUMBER | cat
gh pr checks NUMBER | cat
gh pr merge NUMBER --squash --delete-branch | cat

# Releases.
gh release list | cat
gh release view TAG | cat

# Workflows.
GH_PAGER=cat gh run list --limit 5
GH_PAGER=cat gh workflow list
```

---

## Issue Management

### Required Labels

**Type**: `enhancement`, `bug`, `documentation`, `refactoring`, `testing`, `security`, `performance`

**Priority**: `major-release` (X.0.0), `minor-release` (1.X.0), `patch-release` (1.3.X)

---

## PR Reviews vs Comments (CRITICAL)

| Type | Location | How to Reply |
|------|----------|--------------|
| **Reviews** | "Files changed" tab, inline on code | `gh api graphql` mutation |
| **Comments** | "Conversation" tab | `gh pr comment` or MCP |

### Replying to PR Review Threads

```bash
# 1. Get review threads.
gh api graphql -f query='
query {
  repository(owner: "SilverAssist", name: "REPO_NAME") {
    pullRequest(number: PR_NUMBER) {
      reviewThreads(first: 50) {
        nodes {
          id
          path
          isResolved
          comments(first: 5) { nodes { body author { login } } }
        }
      }
    }
  }
}' | cat

# 2. Reply to thread (SEPARATE mutation per thread).
gh api graphql -f query='
mutation {
  addPullRequestReviewThreadReply(input: {
    pullRequestReviewThreadId: "PRRT_kwDOXXXXX",
    body: "Applied in commit [SHA](url). **Description.**"
  }) { comment { id } }
}' | cat
```

---

## Semantic Versioning

| Version | Type | When to Use |
|---------|------|-------------|
| MAJOR (X.0.0) | Breaking changes | Architecture refactoring |
| MINOR (1.X.0) | New features | Backwards compatible additions |
| PATCH (1.3.X) | Bug fixes | Documentation, small fixes |

---

## Post-PR Merge Checklist

```bash
# 1. Clean up branches.
git checkout main && git pull origin main
git branch -d feature/your-feature
git push origin --delete feature/your-feature
git fetch --prune

# 2. Close related issues.
gh issue close ISSUE_NUMBER --comment "✅ Completed in PR #XX" | cat
```

---

## GitHub Actions Best Practices

### Dependabot Auto-merge Workflow

When creating jobs that only run for Dependabot PRs, **NEVER** use job-level `if: github.actor == 'dependabot[bot]'`. This causes the job to be "skipped", which can:
- Fail branch protection rules that require the job to pass
- Show confusing status in the PR checks

**❌ WRONG — Job skipped for non-Dependabot PRs:**
```yaml
jobs:
  auto-merge-dependabot:
    runs-on: ubuntu-latest
    if: github.actor == 'dependabot[bot]'  # ❌ Job will be SKIPPED
    steps:
      - name: Dependabot metadata
        uses: dependabot/fetch-metadata@v2
```

**✅ CORRECT — Job runs, steps conditionally execute:**
```yaml
jobs:
  auto-merge-dependabot:
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request' && success()  # ✅ Always runs for PRs
    steps:
      - name: Check if Dependabot PR
        id: check-actor
        run: |
          if [ "${{ github.actor }}" = "dependabot[bot]" ]; then
            echo "is_dependabot=true" >> $GITHUB_OUTPUT
            echo "✅ This is a Dependabot PR, proceeding with auto-merge checks."
          else
            echo "is_dependabot=false" >> $GITHUB_OUTPUT
            echo "ℹ️ Not a Dependabot PR, skipping auto-merge steps."
          fi
      
      - name: Dependabot metadata
        if: steps.check-actor.outputs.is_dependabot == 'true'
        id: metadata
        uses: dependabot/fetch-metadata@v2
      
      - name: Auto-approve PR
        if: |
          steps.check-actor.outputs.is_dependabot == 'true' && (
            steps.metadata.outputs.update-type == 'version-update:semver-patch' ||
            steps.metadata.outputs.update-type == 'version-update:semver-minor'
          )
        run: gh pr review --approve "$PR_URL"
```

### Action Version Pinning

**ALWAYS** pin GitHub Actions to full commit SHA with version comment:

```yaml
# ✅ CORRECT — SHA pinned with version comment.
uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd # v6.0.2

# ❌ WRONG — Floating tag, insecure.
uses: actions/checkout@v4
```

### Standard Workflow Files

Every Silver Assist plugin should have these workflows in `.github/workflows/`:

| File | Purpose |
|------|---------|
| `quality-checks.yml` | PHPCS, PHPStan, PHPUnit on PRs and pushes |
| `release.yml` | Automated releases on tag push |
| `dependency-updates.yml` | Weekly dependency checks + Dependabot auto-merge |
| `copilot-setup-steps.yml` | Reusable setup for Copilot Coding Agent |
