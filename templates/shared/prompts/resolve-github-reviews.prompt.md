---
agent: agent
description: Fetch, respond to, resolve, and close GitHub PR review comments (Copilot or human)
---

# Resolve GitHub PR Reviews

Clear a pull request's review threads end-to-end: **fetch → address → reply → resolve → verify `0` unresolved**.
Works for both **Copilot** and **human** reviews.

## Prerequisites
- `gh` CLI authenticated (`gh auth status`) with `repo` scope — the GraphQL thread-resolve mutation needs it
- Reference: `.github/prompts/_partials/github-integration.md`
- Reference: `.github/prompts/_partials/git-operations.md`

## Inputs
- `{pr-number}` *(optional)* — target PR. Defaults to the PR for the current branch.
- `{repo}` *(optional)* — `owner/repo` for cross-repo review (adds `--repo` / fills the GraphQL vars).

> **Key fact:** the REST API **cannot** mark a review thread resolved. Only the GraphQL
> `resolveReviewThread` mutation can. REST is used to *list* and *reply*; GraphQL is used to *resolve*.

## Steps

### 1. Locate the PR

```bash
# Resolve owner/repo and PR number into shell vars reused by every later step.
REPO_SLUG=$(gh repo view --json nameWithOwner -q .nameWithOwner)   # e.g. SilverAssist/agents-toolkit
OWNER=${REPO_SLUG%/*}
REPO=${REPO_SLUG#*/}

# Current branch's PR (or pass an explicit number as {pr-number}).
PR=$(gh pr view --json number -q .number)
# PR={pr-number}                        # explicit target
# add --repo "{repo}" to gh pr/gh api commands for a cross-repo review

echo "Reviewing $OWNER/$REPO PR #$PR"
gh pr view "$PR" --json title,state,reviewDecision,url | cat
```

### 2. Fetch unresolved review threads

Query the GraphQL `reviewThreads` connection and keep only `isResolved == false`. Capture each
thread's `id` (needed to resolve it) and its first comment's `databaseId`, `path`, and `line`
(needed to reply).

```bash
gh api graphql -F owner="$OWNER" -F repo="$REPO" -F pr="$PR" -f query='
  query($owner:String!, $repo:String!, $pr:Int!) {
    repository(owner:$owner, name:$repo) {
      pullRequest(number:$pr) {
        reviewThreads(first:100) {
          nodes {
            id
            isResolved
            isOutdated
            path
            line
            comments(first:1) {
              nodes { databaseId body author { login } }
            }
          }
        }
      }
    }
  }' > /tmp/review-threads.json

# Unresolved threads only, one compact record per line.
jq -r '
  .data.repository.pullRequest.reviewThreads.nodes[]
  | select(.isResolved == false)
  | {
      threadId: .id,
      commentId: .comments.nodes[0].databaseId,
      path: .path,
      line: .line,
      outdated: .isOutdated,
      author: .comments.nodes[0].author.login,
      body: (.comments.nodes[0].body | gsub("\n"; " ") | .[0:120])
    }' /tmp/review-threads.json

# Count what is left to do (drives the final assertion in Step 5).
UNRESOLVED=$(jq '[.data.repository.pullRequest.reviewThreads.nodes[] | select(.isResolved == false)] | length' /tmp/review-threads.json)
echo "Unresolved threads: $UNRESOLVED"
```

### 3. Address each finding, then reply on its thread

For every unresolved thread:

1. **Apply the fix** in code (or decide it is a false positive and note why).
2. **Run the project's checks** so the reply reflects a verified change:

   ```bash
   npm run lint --if-present
   npm run type-check --if-present
   if [ -f tsconfig.json ]; then npx tsc --noEmit; fi
   npm run test --if-present
   ```

3. **Reply on the thread** using the first comment's `databaseId` (`$COMMENT_ID`):

   ```bash
   gh api "repos/$OWNER/$REPO/pulls/$PR/comments/$COMMENT_ID/replies" \
     -f body="Fixed in <commit-sha>: <what changed>. Thanks!"
   ```

   **Fallback — replies endpoint returns 404** (can happen for some threads): create the reply
   as a new review comment linked to the original via `in_reply_to`:

   ```bash
   gh api "repos/$OWNER/$REPO/pulls/$PR/comments" \
     -f body="Fixed in <commit-sha>: <what changed>." \
     -F in_reply_to="$COMMENT_ID"
   ```

   **Copilot low-confidence / suppressed notes** have **no inline comment id** (`databaseId` is
   `null`), so they cannot be replied to per-thread. Acknowledge them with a single PR-level comment:

   ```bash
   gh pr comment "$PR" --body "Addressed Copilot's low-confidence suggestions: <summary>."
   ```

### 4. Resolve the thread

Mark each addressed thread resolved with the GraphQL mutation (REST cannot do this). Use the
thread's `id` (`$THREAD_ID`):

```bash
gh api graphql -f id="$THREAD_ID" -f query='
  mutation($id:ID!) {
    resolveReviewThread(input:{threadId:$id}) {
      thread { isResolved }
    }
  }'
```

Loop over every `threadId` from Step 2 once its finding is addressed:

```bash
for THREAD_ID in $(jq -r '.data.repository.pullRequest.reviewThreads.nodes[] | select(.isResolved == false) | .id' /tmp/review-threads.json); do
  gh api graphql -f id="$THREAD_ID" -f query='mutation($id:ID!){ resolveReviewThread(input:{threadId:$id}){ thread { isResolved } } }'
done
```

> **`isOutdated` threads** — a thread whose code moved is marked `isOutdated` but stays
> **unresolved**. Resolve it the same way once the concern is handled; it will not clear itself.

### 5. Close the loop

Commit and push the fixes, then re-query and assert **zero** unresolved threads:

```bash
git add -A && git commit -m "fix: Address PR #$PR review comments" && git push

REMAINING=$(gh api graphql -F owner="$OWNER" -F repo="$REPO" -F pr="$PR" -f query='
  query($owner:String!, $repo:String!, $pr:Int!) {
    repository(owner:$owner, name:$repo) {
      pullRequest(number:$pr) {
        reviewThreads(first:100) { nodes { isResolved } }
      }
    }
  }' | jq '[.data.repository.pullRequest.reviewThreads.nodes[] | select(.isResolved == false)] | length')

echo "Remaining unresolved threads: $REMAINING"
test "$REMAINING" -eq 0 && echo "✅ All review threads resolved" || echo "❌ $REMAINING thread(s) still open"
```

Then summarize:
- Threads addressed and how (fix commit SHA per finding).
- Any threads intentionally left with a reply explaining a false positive (resolve those too).
- Commit(s) pushed and the resulting `reviewDecision`.

## Notes & edge cases

- **Per-commit review rounds** — Copilot re-reviews after each push. New threads can appear;
  re-run Steps 2–5 until Step 5 reports `0`. Request a fresh review if needed:
  `gh pr comment "$PR" --body "@copilot review"` (or re-request a human reviewer).
- **Review submissions vs comments vs threads** — a *review* (`gh pr review`) is the top-level
  approval/verdict; *review comments* are inline; a *review thread* groups an inline comment with
  its replies and carries the `isResolved` flag. Only threads are resolvable.
- **Auth** — resolving needs the GraphQL API with `repo` scope; a token missing it fails the
  mutation with a permissions error even though listing works.
