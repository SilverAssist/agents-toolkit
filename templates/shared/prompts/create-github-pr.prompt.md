---
agent: agent
description: Create a pull request for the current branch linked to a GitHub issue
model: Claude Sonnet 5
---

# Create GitHub Pull Request

> **Model:** Smart tier — `Claude Sonnet 5` on Copilot, `sonnet` on Claude Code (PR authoring and review orchestration). To change it, edit the `model:` line in this file's frontmatter; the pin wins over the Copilot picker and Claude `/model`. Codex ignores `model:` — set the session model with `codex --model`.

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

### 5. Pre-PR core review

**First, remove the planning document(s)** created by `work-github-issue` or `create-plan`
(shipped pattern: `docs/<feature-name>-plan.md`) — they have served their purpose. Deleting them
now, **at PR creation (not at finalization)**, keeps them out of the base branch instead of
accumulating in `docs/` after the merge. Do this **before** the review below, so the pass covers
the *final* branch state and catches any now-stale reference to the removed file (links,
indexes, mentions).

A file is removed only when it satisfies **both** conditions: it was **added on this branch**
vs `$BASE_BRANCH`, and it **carries the planning-doc marker** that `work-github-issue` /
`create-plan` write as the first line:

```markdown
<!-- agents-toolkit:planning-doc -->
```

The marker — not the filename — is what identifies a temporary plan. Filename patterns cannot:
`docs/*-plan.md` also matches a legitimate deliverable such as `docs/rollout-plan.md`, and
`docs/*plan*.md` additionally matches `explanation.md` (ex-**plan**-ation). A plan written
without the marker is simply **not deleted**. That bias is deliberate: leaving a plan doc behind
is a trivial cleanup, while deleting someone's deliverable is not recoverable from the PR.

Two portability details are load-bearing. The loop reads `git diff -z` output **NUL-delimited**,
because a path containing a space word-splits and makes `git rm` abort without removing
anything. And it deliberately avoids `grep -lZ | xargs -0`: BSD `grep` on macOS does **not**
NUL-terminate `-l` output, which silently breaks that chain on the platform many contributors
use. The `while read -d ''` form works on bash 3.2 (macOS's system bash) and needs no `mapfile`.

```bash
MARKER='agents-toolkit:planning-doc'
PLANS=()
while IFS= read -r -d '' f; do
  # First line only, and the *complete* HTML comment — not the bare token.
  # A whole-file grep would match a contributing guide that merely mentions the
  # convention, and a substring match would still catch a heading like
  # `# agents-toolkit:planning-doc notes`. `([[:space:]].*)?` allows optional
  # metadata (e.g. `issue={issue-number}`) including any `-` in its value.
  head -n 1 "$f" 2>/dev/null | grep -qE "^<!--[[:space:]]*${MARKER}([[:space:]].*)?-->[[:space:]]*$" && PLANS+=("$f")
done < <(git diff --name-only -z "$BASE_BRANCH" --diff-filter=A -- 'docs/*.md' 'docs/**/*.md')

if [ ${#PLANS[@]} -eq 0 ]; then
  echo "No marked planning docs added on this branch — nothing to remove."
else
  echo "Removing planning docs added on this branch:"
  printf '  %s\n' "${PLANS[@]}"
  # No `|| true` mask: a real git rm failure (permissions, unmerged path) must surface.
  git rm -- "${PLANS[@]}"
fi
```

Now run a **consistency review** to catch the doc↔code drift, invalid code examples,
broken links, and stale indexes that otherwise trigger multi-round Copilot reviews.

Run the **`core-review` skill** (`.agents/skills/core-review/SKILL.md`) with **`--budget medium`**
(diff + one-hop neighbours: importers, indexes, sibling files). This is the pre-PR pass — the
diff is complete, so a `quick` pass would miss cross-file drift, but `thorough` (whole-repo) is
normally overkill at this stage unless the change touches architecture or renames symbols across
layers. Run it as a dedicated, read-only pass. It works on every agent — only the mechanism
differs (subagents are a Claude-Code-only optimization, not a requirement):

- **GitHub Copilot / Codex** — no subagents; run the checklist **inline as a distinct pass** over
  the scope defined by `--budget medium` (diff + one-hop neighbours), producing the prioritized
  findings list.
- **Claude Code** — optionally delegate to a read-only subagent (`Explore` / `general-purpose`).
  **Resolve the file list here first and paste it into the brief** — the shipped `Explore`
  override has no shell (`tools: Read, Grep, Glob, WebFetch`, so it stays read-only) and cannot
  run `git diff` itself. Reuse the `git diff --name-only "$BASE_BRANCH"` output from Step 2 and
  add its one-hop neighbours (importers/consumers, sibling files, docs/indexes that list the
  changed symbol or asset). Then brief it: "review these files — `<list>` — against the
  core-review checklist; report `severity | file:line | problem | suggested fix`; do not edit
  files." Passing an explicit list is what scopes the pass to `--budget medium`.

Apply every `critical` and `warning` finding — including any stale reference exposed by removing
the planning doc — re-run the checks from Step 4, then **commit the fixes and the doc removal and
confirm a clean worktree** (`git status`) so they are included in the push. **Re-review until the
pass reports zero findings** before continuing. See the skill for the full checklist.

```bash
# Stage before committing: `git rm` staged the planning-doc deletion, but the review fixes
# you just applied are unstaged working-tree edits — and a fix that *creates* a file (a new
# test, a snapshot) is untracked, which no `git diff` variant reports. `git status
# --porcelain` covers modifications, additions, and deletions alike.
#
# Conditional because a clean branch reaches here legitimately: no planning doc to remove and
# a review pass with zero findings leaves nothing to commit, and an unconditional `git commit`
# would abort that flow with "nothing to commit".
if [ -n "$(git status --porcelain)" ]; then
  git add -A
  # This block also runs when there was no planning doc and the review produced fixes, so
  # the message is derived from git state, not from PLANS (a shell-local variable that is
  # not available if the removal block ran in a separate shell invocation).
  if git diff --cached --name-only --diff-filter=D -- 'docs/*.md' 'docs/**/*.md' | grep -q .; then
    MSG="docs: Remove planning doc for #{issue-number} ahead of PR (+ review fixes)"
  else
    MSG="chore: Apply pre-PR review fixes for #{issue-number}"
  fi
  # No `|| true`: a failed commit (hooks, signing, identity) must stop the flow, not be masked —
  # otherwise Step 6 would push without the planning-doc removal or the review fixes.
  git commit -m "$MSG"
fi

# Enforce, don't just report: the push must never carry uncommitted work.
if [ -n "$(git status --porcelain)" ]; then
  echo "Worktree still dirty after commit — resolve before pushing:" >&2
  git status --porcelain >&2
  exit 1
fi
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
