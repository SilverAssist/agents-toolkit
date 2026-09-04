---
agent: agent
description: Finalize a pull request after approval and prepare for merge
model: Claude Haiku 4.5
tools:
  - read_file
  - run_in_terminal
  - atlassian/*
---

# Finalize Pull Request

> **Model:** Cheap tier — `Claude Haiku 4.5` on Copilot, `haiku` on Claude Code (validation plus `git` mechanics). To change it, edit the `model:` line in this file's frontmatter; the pin wins over the Copilot picker and Claude `/model`. Codex ignores `model:` — set the session model with `codex --model`.

Finalize PR for Jira ticket **{ticket-id}** after approval and prepare for merge.

## Prerequisites

- PR has been approved
- Reference: `.github/prompts/_partials/git-operations.md`
- Reference: `.github/prompts/_partials/validations.md`
- Reference: `.github/prompts/_partials/jira-integration.md`
- Reference: `.github/prompts/_partials/bitbucket-integration.md`
- **CLI**: `twg` with a Bitbucket token (`twg login` **and** `twg setup bitbucket`) — see
  `docs/cli-setup.md`. Status, review comments and the merge itself run from the terminal.

## Steps

### 1. Verify PR Status

```bash
twg bb prs get <pr-id>            # state, approvals, reviewers
twg bb prs activity <pr-id>       # approvals and status changes in order
```

Check:

- All required approvals in place
- CI/CD pipeline passed — `twg bb pipeline latest-failure --branch "$(git branch --show-current)"`
  finds the failing run and its log tail in one call when it is not
- No unresolved review comments

### 2. Address Review Comments

```bash
twg bb prs comment query <pr-id> -n 100
```

If there are unresolved comments:

- List each comment
- Address feedback
- Push additional commits if needed
- Reply in the thread, then resolve it:

```bash
twg bb prs comment create --pull-request <pr-id> --text "Fixed in <sha>." --reply-to <comment-id>
twg bb prs comment resolve --pull-request <pr-id> --comment <comment-id>
```

Resolve only threads you actually addressed. Request re-review if changes are significant.
The `bitbucket-review-management` skill covers the full loop, including inline anchors.

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

### 5. Update Jira Ticket

Add comment:

```markdown
## Ready for Merge
- All approvals received
- CI/CD passed
- Branch synced with `<base-branch>`
- Tests passing

## Merge Notes
- Merge strategy: Squash recommended
- Post-merge: Deploy to staging for QA
```

Transition ticket to appropriate status:

- "In Review" → "Ready for QA" or
- "In Review" → "Done" (if no QA needed)

### 6. Clean Up

- [ ] Delete temporary planning docs from `docs/` (if applicable)
- [ ] Ensure final documentation is complete
- [ ] Verify commit history is clean

### 7. Merge

**Recommended merge strategy**: Squash merge

**Final commit message format**:

```text
{ticket-id}: {Summary of changes}

- Key change 1
- Key change 2
- Key change 3
```

Confirm the PR is clean first — approvals in place, pipeline green, every review comment
addressed and resolved:

```bash
twg bb prs get <pr-id>
twg bb prs comment query <pr-id>
```

**Merging is irreversible. Ask the user to confirm before running this** unless they
explicitly asked for the merge in the current request:

```bash
twg bb prs merge --pull-request <pr-id> \
  --merge-strategy squash \
  --merge-message "<final commit message>" \
  --close-source-branch \
  --wait
```

`--wait` blocks until Bitbucket confirms the PR reached `MERGED`, so the post-merge steps
below do not race the merge. Other strategies: `merge_commit` (default), `fast_forward`.

If `twg bb` is unavailable, report which piece is missing (the binary, or the Bitbucket
token `twg setup bitbucket` adds) and hand the user the PR URL to merge by hand — do not
report it as "no Bitbucket access" without checking.

### 8. Post-Merge Tasks

After merge is complete:

```bash
# Delete local branch
git checkout "$BASE_BRANCH"
git pull origin "$BASE_BRANCH"
git branch -d <branch-name>

# Delete remote branch (if not auto-deleted)
git push origin --delete <branch-name>

# Clean up stale references
git remote prune origin
```

Update Jira:

- Transition to "Done" or "Ready for QA"
- Add deployment comment if applicable

## Output

### Completion Report

✅ **Pre-Merge Checklist**

- [ ] All approvals received
- [ ] CI/CD passed
- [ ] Branch synced with base branch
- [ ] Final validations passed
- [ ] Documentation complete

✅ **Merge Ready**

- Commit message prepared
- Merge strategy confirmed

✅ **Post-Merge Tasks**

- [ ] Local branch deleted
- [ ] Remote branch deleted
- [ ] Jira ticket updated
- [ ] Team notified (if needed)

## Notes

- If merge conflicts arise during squash, resolve and complete
- Notify team if deployment is needed
- Update related documentation if this was a major feature
