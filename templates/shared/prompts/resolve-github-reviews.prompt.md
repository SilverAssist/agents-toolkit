---
agent: agent
description: Fetch, respond to, resolve, and close GitHub PR review comments (Copilot or human)
model: Claude Sonnet 5
tools:
  - read_file
  - replace_string_in_file
  - run_in_terminal
  - github/*
---

# Resolve GitHub PR Reviews

> **Model:** Smart tier — `Claude Sonnet 5` on Copilot, `sonnet` on Claude Code (the fix step needs real reasoning). To change it, edit the `model:` line in this file's frontmatter; the pin wins over the Copilot picker and Claude `/model`. Codex ignores `model:` — set the session model with `codex --model`.

Clear a pull request's review threads end-to-end: **fetch → address → reply → resolve → verify `0` unresolved**.
Works for both **Copilot** and **human** reviews.

> **Cost note.** The *fetch*, *reply-formatting*, and *resolve* steps are mechanical — they
> parse GraphQL / REST responses and post templated replies. The only step that may genuinely
> need the smart tier is the **code fix** in Step 3. But because `model:` **locks the model
> for the whole invocation** (see paragraph above), you cannot switch mid-run to make the
> mechanical phases cheap. To run those phases cheap, take one of the pre-invocation options:
> (a) invoke the `gh`/GraphQL commands from a separate cheap-tier chat/session and use this
> prompt only for the fix step; or (b) edit this file's `model:` line to the cheap-tier value
> before running and revert after.
>
> The `core-review` pass invoked from Step 3 pins itself cheap **only on Claude Code** (its
> `SKILL.md model: haiku` frontmatter is honoured per-turn there). On **Copilot** skills
> inherit the invoking prompt's model, so `core-review` runs on this prompt's smart tier when
> invoked inline. Two cheap alternatives: (a) invoke `core-review` from a separate cheap-tier
> chat instead of inline, or (b) if `.github/agents/core-review.agent.md` is installed,
> @-mention `@core-review` — custom agents establish their own model boundary, so the
> cheap pin is honoured when no explicit invocation model is supplied. On **Codex**
> the pass runs whatever session model is active (`codex --model`).

## Prerequisites

- `gh` CLI authenticated (`gh auth status`) with `repo` scope — the GraphQL thread-resolve mutation needs it
- Reference: `.github/prompts/_partials/github-integration.md`
- Reference: `.github/prompts/_partials/git-operations.md`

## Inputs

- `{pr-number}` *(optional)* — target PR. Defaults to the PR for the current branch.
- `{repo}` *(optional)* — `owner/repo` for cross-repo review (adds `--repo` / fills the GraphQL vars).

> **Key fact:** the REST API **cannot** mark a review thread resolved — only the GraphQL
> `resolveReviewThread` mutation can. **GraphQL** both *lists* threads (`reviewThreads`, Step 2) and
> *resolves* them (Step 5.4); **REST** is used only to post *replies* (Steps 5.2–5.3).

## Steps

### 1. Locate the PR

> `{repo}` and `{pr-number}` are prompt-template placeholders substituted by the prompt engine
> **before the script runs**. When the user does not supply them, they stay as the literal strings
> `{repo}` / `{pr-number}`, so the guards below compare against those literals to detect the
> "not provided" case. Capture each into a shell variable once and check it with `-n` plus the
> literal-placeholder guard.

```bash
# Copy the (possibly substituted) template values into shell vars.
REPO_INPUT="{repo}"
PR_INPUT="{pr-number}"

# Resolve owner/repo — use REPO_INPUT for cross-repo review, else fall back to the current repo.
if [ -n "$REPO_INPUT" ] && [ "$REPO_INPUT" != "{repo}" ]; then
  REPO_SLUG="$REPO_INPUT"                                        # cross-repo, e.g. owner/name
else
  REPO_SLUG=$(gh repo view --json nameWithOwner -q .nameWithOwner)
fi
OWNER=${REPO_SLUG%/*}
REPO=${REPO_SLUG#*/}

# `gh` global flag reused by every later `gh pr` command so cross-repo works transparently.
GH_REPO_FLAG=(--repo "$REPO_SLUG")

# Current branch's PR (or pass an explicit number as {pr-number}).
if [ -n "$PR_INPUT" ] && [ "$PR_INPUT" != "{pr-number}" ]; then
  PR="$PR_INPUT"
else
  PR=$(gh pr view "${GH_REPO_FLAG[@]}" --json number -q .number)
fi

echo "Reviewing $OWNER/$REPO PR #$PR"
gh pr view "${GH_REPO_FLAG[@]}" "$PR" --json title,state,reviewDecision,url | cat

# Make the fixes in Steps 3–4 land on the PR under review — not whatever branch happens
# to be checked out. Check out the PR's head branch before editing anything:
gh pr checkout "$PR" "${GH_REPO_FLAG[@]}"
echo "On branch: $(git branch --show-current)"
# Cross-repo ({repo} set): run this prompt from a local clone of that repo — editing,
# committing, and pushing need the target repo's working tree, not just API access.
```

### 2. Fetch unresolved review threads (paginated)

Walk the GraphQL `reviewThreads` connection with `pageInfo { endCursor hasNextPage }` — a PR
can have more than 100 threads, so a single `first:100` page is not enough. Capture each
thread's `id` (needed to resolve it) and its first comment's `databaseId`, `path`, and `line`
(needed to reply).

```bash
> /tmp/review-threads.jsonl
CURSOR=null
while : ; do
  PAGE=$(GH_PAGER=cat gh api graphql -F owner="$OWNER" -F repo="$REPO" -F pr="$PR" -F after="$CURSOR" -f query='
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
  # Fail fast: an API/auth/network error must not be mistaken for "no threads".
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

# Unresolved threads only, one compact record per line.
jq -r '
  select(.isResolved == false)
  | {
      threadId: .id,
      commentId: .comments.nodes[0].databaseId,
      path: .path,
      line: .line,
      outdated: .isOutdated,
      author: .comments.nodes[0].author.login,
      body: (.comments.nodes[0].body | gsub("\n"; " ") | .[0:120])
    }' /tmp/review-threads.jsonl

# Count what is left to do (drives the final assertion in Step 6).
UNRESOLVED=$(jq -s '[.[] | select(.isResolved == false)] | length' /tmp/review-threads.jsonl)
echo "Unresolved threads: $UNRESOLVED"
```

### 3. Apply each fix and run checks

For every unresolved thread from Step 2:

1. **Apply the fix** in code (or decide it is a false positive — record the reasoning for Step 4).
2. **Run the project's checks** so the reply reflects a verified change:

   ```bash
   npm run lint --if-present
   npm run type-check --if-present
   if [ -f tsconfig.json ]; then npx tsc --noEmit; fi
   npm run test --if-present
   ```

**Then — once per batch, not per thread** — after **all** the per-thread fixes above are applied,
run a single consistency pass (the *core review*) before committing the batch. Use the
**`core-review` skill** (`.agents/skills/core-review/SKILL.md`) with **`--budget quick`**
(diff + directly-touched files — the batch is small and scoped, so `medium`/`thorough` would only
add unrelated noise). Run it as a dedicated read-only pass. Options by agent:

- **GitHub Copilot** — run inline as a distinct pass, or use `@core-review` for a cheap-tier pass — if using the agent, pass the current batch's changed-file list in the brief (the agent has no shell tool).
- **Codex** — run inline as a distinct pass.
- **Claude Code** — optionally delegate to a read-only subagent (`Explore` / `general-purpose`).

A fix often leaves or introduces an adjacent issue (a now-stale doc
line, a broken link, a table missing the new asset) that would trigger yet another Copilot round.
Apply everything the pass flags, re-run the checks above, and only then proceed to Step 4.
Running this once over the completed batch — rather than per thread — keeps the review cost
bounded.

### 4. Commit and push fixes (before replying)

Reply bodies reference the fixing commit SHA, so **commit and push first** — otherwise the SHA
does not exist on the remote branch yet and the reply link is dead.

> Run the **core review** from Step 3 *before* this commit — pushing an adjacent,
> unfixed issue starts a fresh Copilot round and defeats the purpose of resolving in batches.

```bash
# Stage only the files you changed for these fixes. Avoid `git add -A` — Step 1 does not
# require a clean worktree, so it could sweep in unrelated pre-existing changes.
git add <files you edited>
if git diff --cached --quiet; then
  # Nothing staged — every finding was a false positive. A bare `git commit` would fail,
  # and `$SHA` would wrongly point at an unrelated existing HEAD. Leave `$SHA` empty and
  # reply to those threads in Step 5 with reasoning only (never "Fixed in <sha>").
  SHA=""
  echo "No staged changes — skipping the fix commit; Step 5 replies with rationale only."
else
  git commit -m "fix: Address PR #$PR review comments"
  if ! git push; then
    echo "ERROR: git push failed. Do not proceed to Step 5 — \$SHA is not on the remote yet." >&2
    echo "Diagnose the failure before retrying:" >&2
    echo "  - Non-fast-forward: run 'git pull --rebase' then 'git push' again." >&2
    echo "  - Branch protection / required status checks: fix locally and re-run this step," >&2
    echo "    or contact a repo admin if the branch is protected against your role." >&2
    echo "  - Auth: run 'gh auth status' and re-authenticate with 'repo' scope if needed." >&2
    exit 1
  fi
  SHA=$(git rev-parse HEAD)
  echo "Fix commit: $SHA"
fi
```

If a single commit already covers all fixes, capture that SHA and skip the commit step; the point
is that `$SHA` must be **pushed** before Step 5 references it. **Do not advance to Step 5 unless
the push succeeded** — every reply body links to `$SHA` on the remote.

### 5. Reply and resolve each thread

For each unresolved thread from Step 2, run the following sub-procedure **in order**. `$COMMENT_ID`
is the first comment's `databaseId`; `$THREAD_ID` is the thread `id`. Steps 5.1–5.3 pick exactly
one reply path; Step 5.4 **always** runs afterward regardless of which reply path was taken.

#### 5.1 — If `$COMMENT_ID` is null: PR-level acknowledgement, then go to 5.4

Copilot low-confidence / suppressed notes have no inline comment id (`databaseId` is `null`) and
cannot be replied to per-thread. Acknowledge them once with a PR-level comment, then skip to 5.4
to resolve the thread:

```bash
if [ -z "$COMMENT_ID" ] || [ "$COMMENT_ID" = "null" ]; then
  gh pr comment "${GH_REPO_FLAG[@]}" "$PR" --body "Addressed Copilot's low-confidence suggestions: <summary>."
  # Skip 5.2 and 5.3; proceed directly to 5.4 for this thread.
fi
```

#### 5.2 — Otherwise: attempt the direct replies endpoint

If the finding was a **false positive** (no fix commit — `$SHA` is empty), reply with your
reasoning instead of a SHA, e.g. `-f body="Not applicable — <why>."`. Otherwise reference the
fix commit:

```bash
GH_PAGER=cat gh api "repos/$OWNER/$REPO/pulls/$PR/comments/$COMMENT_ID/replies" \
  -f body="Fixed in $SHA: <what changed>. Thanks!"
```

#### 5.3 — Only if 5.2 returned HTTP 404: fall back to `in_reply_to`

Some threads reject the direct replies endpoint (404). Only in that case, post a new review
comment linked to the original via `in_reply_to`:

```bash
GH_PAGER=cat gh api "repos/$OWNER/$REPO/pulls/$PR/comments" \
  -f body="Fixed in $SHA: <what changed>." \
  -F in_reply_to="$COMMENT_ID"
```

Do **not** run 5.3 unless 5.2 failed with 404; running both duplicates the reply.

#### 5.4 — Resolve the thread via the GraphQL mutation (REST cannot)

If you address threads one at a time, resolve each one here after replying (from 5.1, 5.2, or 5.3).
Prefer to resolve them all at once? Skip this per-thread call and use the batch loop in 5.5 instead —
use **either** 5.4 **or** 5.5, never both, or every mutation runs twice.

```bash
GH_PAGER=cat gh api graphql -f id="$THREAD_ID" -f query='
  mutation($id:ID!) {
    resolveReviewThread(input:{threadId:$id}) {
      thread { isResolved }
    }
  }'
```

#### 5.5 — Alternative: batch-resolve every addressed thread at once

Instead of the per-thread call in 5.4, resolve everything in one loop once all replies are posted
(use **either** 5.4 per thread **or** this batch loop, not both). Check the mutation response inside
the loop — a missing `repo` scope on the token succeeds at listing but fails at resolving, and
without this check the failure is silent and Step 6 reports leftover threads with no explanation.

```bash
jq -r 'select(.isResolved == false) | .id' /tmp/review-threads.jsonl | while read -r THREAD_ID; do
  RESULT=$(GH_PAGER=cat gh api graphql -f id="$THREAD_ID" -f query='mutation($id:ID!){ resolveReviewThread(input:{threadId:$id}){ thread { isResolved } } }')
  if [ "$(echo "$RESULT" | jq -r '.data.resolveReviewThread.thread.isResolved')" != "true" ]; then
    echo "ERROR: failed to resolve $THREAD_ID: $RESULT" >&2
    exit 1
  fi
done
```

> **`isOutdated` threads** — a thread whose code moved is marked `isOutdated` but stays
> **unresolved**. Resolve it the same way once the concern is handled; it will not clear itself.

### 6. Close the loop

Re-query with the same pagination pattern and assert **zero** unresolved threads. Exit non-zero
when threads remain so this step can gate CI or a script.

```bash
> /tmp/review-threads-remaining.jsonl
CURSOR=null
while : ; do
  PAGE=$(GH_PAGER=cat gh api graphql -F owner="$OWNER" -F repo="$REPO" -F pr="$PR" -F after="$CURSOR" -f query='
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
  # Fail fast: an API/auth/network error must not be mistaken for "0 remaining".
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
echo "Remaining unresolved threads: $REMAINING"
if [ "$REMAINING" -eq 0 ]; then
  echo "✅ All review threads resolved"
else
  echo "❌ $REMAINING thread(s) still open"
  exit 1
fi
```

Then summarize:

- Threads addressed and how (fix commit SHA per finding).
- Any threads intentionally left with a reply explaining a false positive (resolve those too).
- Commit(s) pushed and the resulting `reviewDecision`.

## Notes & edge cases

- **Per-commit review rounds** — Copilot re-reviews after each push. New threads can appear;
  re-run Steps 2–6 until Step 6 reports `0`. Request a fresh review if needed:
  `gh pr comment "${GH_REPO_FLAG[@]}" "$PR" --body "@copilot review"` (or re-request a human reviewer).
- **Review submissions vs comments vs threads** — a *review* (`gh pr review`) is the top-level
  approval/verdict; *review comments* are inline; a *review thread* groups an inline comment with
  its replies and carries the `isResolved` flag. Only threads are resolvable.
- **Auth** — resolving needs the GraphQL API with `repo` scope; a token missing it fails the
  mutation with a permissions error even though listing works.
