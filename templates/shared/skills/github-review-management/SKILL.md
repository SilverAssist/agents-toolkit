---
name: github-review-management
description: Fetch, reply to, resolve, and close GitHub pull-request review threads with the gh CLI and GraphQL API. Use when handling Copilot or human PR reviews end-to-end.
---

# Silver Assist — GitHub Review Management

Reference knowledge for clearing GitHub pull-request reviews programmatically. This skill
backs the `/resolve-github-reviews` prompt: it explains the data model, which API does what,
the exact commands, and the Copilot-specific edge cases. Use it when a PR has review threads
(Copilot or human) that need to be addressed, replied to, resolved, and verified to `0`.

## When to Use

- A PR has open Copilot or human review comments to clear before merge
- You need to **resolve** review threads (not just reply) — which REST cannot do
- Debugging why a reply or resolve call fails (404 on replies, permissions on the mutation)
- Handling Copilot suppressed / low-confidence notes or `isOutdated` threads
- Automating the "reply → resolve → assert 0 unresolved" loop across per-commit review rounds

## The data model (get this right first)

GitHub exposes three distinct things — conflating them is the usual source of bugs:

| Concept | What it is | API surface |
|---------|-----------|-------------|
| **Review (submission)** | The top-level verdict on a PR: `APPROVED` / `CHANGES_REQUESTED` / `COMMENTED` | `gh pr review`, REST `/pulls/{n}/reviews` |
| **Review comment** | A single inline comment anchored to a file/line (has a `databaseId`) | REST `/pulls/{n}/comments` |
| **Review thread** | An inline comment **plus its replies**, carrying the `isResolved` flag | **GraphQL `reviewThreads` only** |

Only **threads** have `isResolved`, and **only GraphQL can flip it**. The REST comments API
lists and replies to comments but has no concept of resolving.

## Which API does what

| Operation | API | Command |
|-----------|-----|---------|
| List unresolved threads | GraphQL | `reviewThreads(first:100){ nodes{ id isResolved path line comments(first:1){ nodes{ databaseId } } } }` |
| Reply to a thread | REST | `POST /pulls/{n}/comments/{comment_id}/replies` |
| Reply fallback (404) | REST | `POST /pulls/{n}/comments` with `in_reply_to={comment_id}` |
| Acknowledge suppressed notes | REST | `gh pr comment {n} --body "…"` (PR-level) |
| **Resolve a thread** | **GraphQL** | `resolveReviewThread(input:{threadId:$id})` |
| Verify 0 unresolved | GraphQL | re-query `reviewThreads`, count `isResolved == false` |

## Resolve locations

```bash
REPO_SLUG=$(gh repo view --json nameWithOwner -q .nameWithOwner)   # owner/repo
OWNER=${REPO_SLUG%/*}; REPO=${REPO_SLUG#*/}
PR=$(gh pr view --json number -q .number)                          # current branch's PR
```

## 1. List unresolved threads (paginated)

A PR can have more than 100 threads, so a single `first:100` page is not enough. Walk the
connection with `pageInfo { endCursor hasNextPage }` and collect every node before filtering.

```bash
> /tmp/review-threads.jsonl
CURSOR=null
while : ; do
  # On the first page, $CURSOR is the literal string "null", which GraphQL rejects as a
  # `String` value. Omit the `after` argument entirely on that pass, then pass the real
  # cursor on subsequent iterations.
  if [ "$CURSOR" = "null" ]; then
    AFTER_ARGS=()
  else
    AFTER_ARGS=(-f after="$CURSOR")
  fi
  PAGE=$(gh api graphql -F owner="$OWNER" -F repo="$REPO" -F pr="$PR" "${AFTER_ARGS[@]}" -f query='
    query($owner:String!, $repo:String!, $pr:Int!, $after:String) {
      repository(owner:$owner, name:$repo) {
        pullRequest(number:$pr) {
          reviewThreads(first:100, after:$after) {
            pageInfo { endCursor hasNextPage }
            nodes {
              id
              isResolved
              isOutdated
              path
              line
              comments(first:1) { nodes { databaseId body author { login } } }
            }
          }
        }
      }
    }')
  # Fail fast: a GraphQL/auth/network error must not be mistaken for "no threads".
  if ! echo "$PAGE" | jq -e '.data.repository.pullRequest.reviewThreads' >/dev/null 2>&1; then
    echo "ERROR: GraphQL request failed or returned an unexpected shape:" >&2
    echo "$PAGE" >&2
    exit 1
  fi
  echo "$PAGE" | jq -c '.data.repository.pullRequest.reviewThreads.nodes[]' >> /tmp/review-threads.jsonl
  HAS_NEXT=$(echo "$PAGE" | jq -r '.data.repository.pullRequest.reviewThreads.pageInfo.hasNextPage')
  CURSOR=$(echo "$PAGE" | jq -r '.data.repository.pullRequest.reviewThreads.pageInfo.endCursor')
  [ "$HAS_NEXT" = "true" ] || break
done

jq -r '
  select(.isResolved == false)
  | "\(.id)\t\(.comments.nodes[0].databaseId)\t\(.path):\(.line)"
' /tmp/review-threads.jsonl
```

Each row gives `threadId` (to resolve) and `commentId` = `databaseId` (to reply). A `null`
`databaseId` marks a suppressed note — see below.

## 2. Reply to a thread

```bash
# Primary: reply directly on the thread.
gh api "repos/$OWNER/$REPO/pulls/$PR/comments/$COMMENT_ID/replies" \
  -f body="Fixed in <sha>: <what changed>."

# Fallback when the replies endpoint 404s: link via in_reply_to.
gh api "repos/$OWNER/$REPO/pulls/$PR/comments" \
  -f body="Fixed in <sha>: <what changed>." \
  -F in_reply_to="$COMMENT_ID"
```

## 3. Resolve the thread (GraphQL — the only way)

```bash
gh api graphql -f id="$THREAD_ID" -f query='
  mutation($id:ID!) {
    resolveReviewThread(input:{threadId:$id}) {
      thread { isResolved }
    }
  }'
```

Batch all addressed threads:

```bash
for THREAD_ID in $THREAD_IDS; do
  gh api graphql -f id="$THREAD_ID" -f query='mutation($id:ID!){ resolveReviewThread(input:{threadId:$id}){ thread { isResolved } } }'
done
```

> To reopen a thread (rarely needed), the counterpart mutation is `unresolveReviewThread`.

## 4. Verify 0 unresolved (the close-the-loop check)

```bash
> /tmp/review-threads-remaining.jsonl
CURSOR=null
while : ; do
  if [ "$CURSOR" = "null" ]; then
    AFTER_ARGS=()
  else
    AFTER_ARGS=(-f after="$CURSOR")
  fi
  PAGE=$(gh api graphql -F owner="$OWNER" -F repo="$REPO" -F pr="$PR" "${AFTER_ARGS[@]}" -f query='
    query($owner:String!, $repo:String!, $pr:Int!, $after:String) {
      repository(owner:$owner, name:$repo) {
        pullRequest(number:$pr) {
          reviewThreads(first:100, after:$after) {
            pageInfo { endCursor hasNextPage }
            nodes { isResolved }
          }
        }
      }
    }')
  # Fail fast: a GraphQL/auth/network error must not be mistaken for "0 remaining".
  if ! echo "$PAGE" | jq -e '.data.repository.pullRequest.reviewThreads' >/dev/null 2>&1; then
    echo "ERROR: GraphQL request failed or returned an unexpected shape:" >&2
    echo "$PAGE" >&2
    exit 1
  fi
  echo "$PAGE" | jq -c '.data.repository.pullRequest.reviewThreads.nodes[]' >> /tmp/review-threads-remaining.jsonl
  HAS_NEXT=$(echo "$PAGE" | jq -r '.data.repository.pullRequest.reviewThreads.pageInfo.hasNextPage')
  CURSOR=$(echo "$PAGE" | jq -r '.data.repository.pullRequest.reviewThreads.pageInfo.endCursor')
  [ "$HAS_NEXT" = "true" ] || break
done

REMAINING=$(jq -s '[.[] | select(.isResolved == false)] | length' /tmp/review-threads-remaining.jsonl)
if [ "$REMAINING" -eq 0 ]; then
  echo "✅ all resolved"
else
  echo "❌ $REMAINING remaining"
  exit 1
fi
```

> If `isResolved` remains `false` immediately after a successful `resolveReviewThread`
> mutation, wait 2–3 seconds and re-query — GitHub's GraphQL API can exhibit brief
> consistency lag after bulk resolves, so a thread already resolved server-side may
> still report as open on the next read.

## Copilot-specific handling

- **Suppressed / low-confidence notes** — Copilot posts some findings without an inline comment
  (`databaseId` is `null`), so there is no thread to reply to or resolve. Acknowledge them with a
  single PR-level comment (`gh pr comment`).
- **`isOutdated` threads** — when the underlying code moves, the thread is flagged `isOutdated`
  but remains **unresolved**. It never clears itself; resolve it explicitly once handled.
- **Per-commit review rounds** — Copilot re-reviews after each push, potentially opening new
  threads. Re-run list → reply → resolve → verify until the count is `0`. Trigger a fresh pass
  with `gh pr comment $PR --body "@copilot review"` (unquoted `$PR` — it is the integer PR
  number set earlier via `gh pr view --json number -q .number`, and `gh pr comment` takes
  it as a positional argument, not a string flag value).

## Common failures

| Symptom | Cause | Fix |
|---------|-------|-----|
| Resolve mutation returns a permissions error | Token lacks `repo` scope | Re-auth: `gh auth refresh -s repo` |
| `POST …/replies` → 404 | Thread doesn't accept direct replies | Use `in_reply_to` fallback |
| Reply "works" but thread stays open | Replied via REST, never resolved | Run the GraphQL `resolveReviewThread` |
| `pr` variable rejected by GraphQL | Passed as a string | Use `-F pr="$PR"` (typed) not `-f pr=...` |
| Count never reaches 0 | New round opened threads | Re-run the loop after each push |
