---
agent: agent
description: Finalize a pull request after approval and prepare for merge
---

# Finalize GitHub Pull Request

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

### 2. Check for Unresolved Review Threads (MANDATORY — block merge if any are open)

**Always run this before merging.** Fetch all review threads and verify every thread is resolved:

```bash
gh api graphql -f query='
query($owner: String!, $repo: String!, $pr: Int!) {
  repository(owner: $owner, name: $repo) {
    pullRequest(number: $pr) {
      reviewThreads(first: 50) {
        nodes {
          id
          isResolved
          path
          comments(first: 3) {
            nodes { body author { login } }
          }
        }
      }
    }
  }
}' -f owner=OWNER -f repo=REPO -F pr=PR_NUMBER | cat
```

**Do NOT merge if any thread has `"isResolved": false`.**

For each unresolved thread:
1. Read the comment body carefully
2. Apply the requested change (code fix, test, docs, etc.)
3. Reply to the thread via GraphQL mutation:

```bash
gh api graphql -f query='
mutation {
  addPullRequestReviewThreadReply(input: {
    pullRequestReviewThreadId: "PRRT_xxx",
    body: "Fixed in commit [SHA](url). <brief description of what was changed>"
  }) { comment { id } }
}' | cat
```

4. After all threads are addressed, re-run the check to confirm all show `"isResolved": true` or have been replied to.

### 3. Address General Review Comments

If there are additional unresolved conversation-level comments:

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

### 4. Sync with Base Branch

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

### 5. Final Validations

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

### 6. Merge Pull Request

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

### 7. Post-Merge Tasks

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

### 8. Close GitHub Issue

The issue closes automatically if the PR description contains `Closes #{issue-number}`.
If not, close manually:

```bash
gh issue close {issue-number} --comment "Completed in PR #<pr-number>." | cat
```

### 9. Clean Up

- [ ] Delete temporary planning docs from `docs/` (if applicable)
- [ ] Ensure final documentation is complete
- [ ] Verify commit history is clean
