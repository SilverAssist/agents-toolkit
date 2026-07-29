---
agent: agent
description: Finalize a pull request after approval and prepare for merge
model: Claude Haiku 4.5
---

# Finalize GitHub Pull Request

> **Model:** Cheap tier — `Claude Haiku 4.5` on Copilot, `haiku` on Claude Code (validation plus `git`/`gh` mechanics). To change it, edit the `model:` line in this file's frontmatter; the pin wins over the Copilot picker and Claude `/model`. Codex ignores `model:` — set the session model with `codex --model`.

Finalize PR for GitHub issue **#{issue-number}** after approval and prepare for merge.

## Prerequisites
- PR has been approved
- GitHub MCP connection or `gh` CLI required
- Reference: `.github/prompts/_partials/git-operations.md`
- Reference: `.github/prompts/_partials/validations.md`
- Reference: `.github/prompts/_partials/github-integration.md`

## Steps

### 1. Verify PR Status

```bash
gh pr view --json state,reviewDecision,statusCheckRollup | cat
```

Check:
- All required approvals in place
- CI/CD pipeline passed
- No unresolved review comments

### 2. Address Review Comments

If there are unresolved comments:

```bash
gh pr view --json reviews,comments | cat
```

- List each unresolved comment
- Address feedback
- Push additional commits if needed
- Request re-review if changes are significant:

```bash
gh pr review --request-changes --body "..." | cat
# or after fixing:
gh pr review --approve | cat
```

> **Before pushing any fix commit**, run a **core review** on the fix set using the
> **`core-review` skill** (`.agents/skills/core-review/SKILL.md`) with **`--budget quick`**
> (diff + directly-touched files — the fix set here is tight and self-contained; cross-file
> and one-hop adjacent drift was already covered by the pre-PR `medium` pass in
> `create-github-pr`, so `quick` at this stage only needs to catch self-consistency issues
> inside the fix commits themselves — a doc line the same fix made obsolete, a table row the
> commit forgot to update, a link a rename left behind). Run it as a dedicated read-only pass
> (inline on Copilot/Codex; optionally a subagent on Claude Code). Apply everything it flags
> first — pushing an unfixed self-inconsistency only starts a fresh Copilot round. For the
> full fetch → reply → resolve loop, use the `resolve-github-reviews` prompt.

### 3. Sync with Base Branch

```bash
BASE_BRANCH=$(node -e "try{const c=require('./.agents-toolkit.json');console.log(c.pr?.targetBranch||c.git?.defaultBranch||'main')}catch{console.log('main')}")
git fetch origin
git rebase "origin/${BASE_BRANCH}"
```

If conflicts:
1. Resolve each conflict
2. Stage resolved files: `git add <file>`
3. Continue rebase: `git rebase --continue`

Push updated branch:
```bash
git push --force-with-lease
```

### 4. Final Validations

Run complete validation suite:
```bash
npm run lint --if-present
npm run type-check --if-present
if [ -f tsconfig.json ]; then npx tsc --noEmit; fi
npm run test --if-present
npm run build --if-present
```

Verify:
- No regressions after rebase
- All tests still pass
- No new warnings

### 5. Merge Pull Request

**Recommended merge strategy**: Squash merge

```bash
gh pr merge --squash --delete-branch | cat
```

**Final commit message format**:
```
{Issue title} (#{pr-number})

- Key change 1
- Key change 2
- Key change 3
```

### 6. Post-Merge Tasks

After merge is complete:

```bash
# Return to base branch and sync
git checkout "$BASE_BRANCH"
git pull origin "$BASE_BRANCH"

# Delete local branch (force if squash-merged)
git branch -D <branch-name>

# Clean up stale references
git remote prune origin
```

### 7. Close GitHub Issue

The issue closes automatically if the PR description contains `Closes #{issue-number}`.
If not, close manually:

```bash
gh issue close {issue-number} --comment "Completed in PR #<pr-number>." | cat
```

### 8. Clean Up

- [ ] Planning docs were removed at **PR creation** (see `create-github-pr`) — verify none linger in `docs/`
- [ ] Ensure final documentation is complete
- [ ] Verify commit history is clean
