---
agent: agent
description: Create a pull request for the current branch linked to a GitHub issue
model:
  - Claude Sonnet 4.5 (copilot)
  - GPT-5 (copilot)
---

# Create GitHub Pull Request

> **Model:** Default smart tier (`Claude Sonnet 4.5` → `GPT-5`) — orchestrator delegates (`prepare-pr`, `core-review`) run on their own cheap-tier pins. Override via the Copilot model picker, `/model` in Claude Code, or `codex --model` in Codex.

Create a pull request for the current branch linked to GitHub issue **#{issue-number}**.

## Prerequisites
- Run `prepare-pr` first to ensure code is ready
- GitHub MCP connection or `gh` CLI required
- Reference: `.github/prompts/_partials/pr-template.md`
- Reference: `.github/prompts/_partials/git-operations.md`
- Reference: `.github/prompts/_partials/github-integration.md`

## Steps

### 1. Verify Current State

```bash
git branch --show-current
git status
```

Verify:
- Branch follows convention: `feature/{issue-number}-*` or `bugfix/{issue-number}-*`
- All changes are committed
- Not on protected branch

### 2. Review Changes

```bash
BASE_BRANCH=$(node -e "try{const c=require('./.agents-toolkit.json');console.log(c.pr?.targetBranch||c.git?.defaultBranch||'main')}catch{console.log('main')}")
git diff "$BASE_BRANCH" --name-only
```

- Reuse `BASE_BRANCH` in all subsequent steps
- Summarize the changes made
- Identify breaking changes or migrations

### 3. Read GitHub Issue

Fetch issue **#{issue-number}** details:
- Get title for PR title
- Extract acceptance criteria
- Get any context from comments

```bash
gh issue view {issue-number} | cat
```

### 4. Run Final Validations

```bash
npm run lint --if-present
npm run type-check --if-present
if [ -f tsconfig.json ]; then npx tsc --noEmit; fi
npm run test --if-present
npm run build --if-present
```

Fix any issues before proceeding.

### 5. Pre-PR core review (whole repo)

**First, remove the planning document** created by `work-github-issue` (e.g.
`docs/{feature-name}-plan.md`) — it has served its purpose. Deleting it now, **at PR creation
(not at finalization)**, keeps it out of the base branch instead of accumulating in `docs/` after
the merge. Do this **before** the review below, so the pass covers the *final* branch state and
catches any now-stale reference to the removed file (links, indexes, mentions):

```bash
# Remove it only if it exists — a missing file is fine, but a real `git rm` error
# (permissions, path typo) must surface, so do not blanket-mask with `|| true`.
if [ -f docs/{feature-name}-plan.md ]; then
  git rm docs/{feature-name}-plan.md
fi
```

Now run a **whole-repo** consistency review to catch the doc↔code drift, invalid code examples,
broken links, and stale indexes that otherwise trigger multi-round Copilot reviews. Review the
whole repo — not just the diff — because Copilot re-reviews entire files.

Run the **`core-review` skill** (`.agents/skills/core-review/SKILL.md`) as a dedicated,
read-only review pass. It works on every agent — only the mechanism differs (subagents are a
Claude-Code-only optimization, not a requirement):

- **GitHub Copilot / Codex** — no subagents; run the checklist **inline as a distinct pass** over
  the **whole repository** (not just the diff), producing the prioritized findings list.
- **Claude Code** — optionally delegate to a read-only subagent (`Explore` / `general-purpose`)
  with the brief "review the whole repo against the core-review checklist; report
  `severity | file:line | problem | suggested fix`; do not edit files."

Apply every `critical` and `warning` finding — including any stale reference exposed by removing
the planning doc — re-run the checks from Step 4, then **commit the fixes and the doc removal and
confirm a clean worktree** (`git status`) so they are included in the push. **Re-review until the
pass reports zero findings** before continuing. See the skill for the full checklist.

```bash
# No `|| true`: a failed commit (hooks, signing, identity) must stop the flow, not be masked —
# otherwise Step 6 would push without the planning-doc removal or the review fixes.
git commit -m "docs: Remove planning doc for #{issue-number} ahead of PR (+ review fixes)"

# The worktree must be clean before pushing — this must print nothing.
git status --porcelain
```

### 6. Push Branch

```bash
git push -u origin $(git branch --show-current)
```

### 7. Create Pull Request

#### PR Title
```
{Issue title}
```

#### PR Description

Use this template:

```markdown
## Summary
Brief description of what this PR accomplishes.

## Related Issue
Closes #{issue-number}

## Changes Made
- Change 1: Description
- Change 2: Description
- Change 3: Description

## Type of Change
- [ ] 🐛 Bug fix
- [ ] ✨ New feature
- [ ] 💥 Breaking change
- [ ] 📝 Documentation
- [ ] 🔧 Refactoring

## Testing
- [ ] Unit tests added/updated
- [ ] Manual testing performed
- Describe test cases here

## Screenshots
(If UI changes, add before/after screenshots)

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests pass locally
```

#### Create via CLI

```bash
gh pr create \
  --title "{Issue title}" \
  --body "$(cat <<'EOF'
## Summary
...

Closes #{issue-number}
EOF
)" \
  --base "$BASE_BRANCH" | cat
```

#### PR Settings
- **Source**: Current branch
- **Target**: `<base-branch>` resolved from `.agents-toolkit.json` (fallback: `main`)
- **Reviewers**: Based on changed files

### 8. Comment on GitHub Issue

Add a comment linking to the PR:

```bash
gh issue comment {issue-number} --body "## Pull Request Created

PR: <pr-url>
Branch: \`$(git branch --show-current)\`

Work in progress. Review requested." | cat
```
