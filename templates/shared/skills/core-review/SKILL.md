---
name: core-review
description: Run a thorough, whole-repo consistency review before opening a PR or before pushing fixes in response to a reviewer — as a dedicated read-only pass (inline on Copilot/Codex; optionally a subagent on Claude Code) — to preempt Copilot/reviewer iterations. Use when about to push a branch for review or to push a batch of review fixes.
---

# Silver Assist — Core Review (Pre-Review)

A **pre-emptive, whole-repo consistency review** that runs *before* a reviewer (Copilot or a
human) ever sees the branch. It catches the classes of issues that trigger multi-round review
loops — doc↔code drift, invalid code examples, broken links, stale indexes — so they are fixed
in the first push instead of round 5.

This skill is the reviewer's knowledge; the **action** (run the review, apply the findings) is
invoked as a step from `create-github-pr`, `resolve-github-reviews`, and `finalize-github-pr`.

## When to Use

Run this review at **two integration points**:

1. **Pre-PR** — after the code is written and local checks pass, **before** `create-github-pr`
   pushes the branch and opens the PR.
2. **Pre-push during review resolution** — inside `resolve-github-reviews` / `finalize-github-pr`,
   **before** pushing each batch of fixes, so a fix does not leave (or introduce) an adjacent
   issue that triggers yet another reviewer round.

## Why whole-repo, not just the diff

Copilot re-reviews **entire files**, not just your hunks — and each push opens a fresh round.
In recent work the rounds went `18 → 2 → 3 → 1 → 9 → 3 → 1 → 1 …`: every push surfaced new,
mostly *valid* findings in code the diff only brushed against (a doc line that no longer matches
the changed code, a table missing the asset you just added, a link that now resolves elsewhere).
A review scoped to the whole repo — or at least every file that imports, re-exports, documents,
or enumerates the changed symbol or asset, plus every index/README that lists its siblings —
catches those before the reviewer does. Reviewing only the diff reproduces exactly the slow loop
this flow exists to avoid.

## How to run it (portable across agents)

Run the review as a **dedicated, read-only pass**: it inspects and reports; it does **not** edit.
The caller applies the fixes, so the review stays unbiased by the intent behind the change. The
pass works the same on every agent — **Copilot** (the primary reviewer to preempt), **Codex**,
and **Claude Code**; only the *mechanism* differs, and **subagents are a Claude-Code-only
optimization, never a requirement**:

- **GitHub Copilot** — no subagents; run the checklist **inline as a distinct pass** before
  pushing (not folded into the edit under review), over the **whole repository — not just the
  diff**. Copilot's built-in code review can help on the diff, but only this whole-repo pass
  covers the drift that triggers new review rounds.
- **Codex** — no subagents either; the same **inline whole-repo pass**, producing the same
  prioritized findings list.
- **Claude Code** — *optionally* delegate the pass to a read-only **subagent** (`Explore` or
  `general-purpose`) with the brief: "Review this whole repository against the core-review
  checklist; report findings as `severity | file:line | problem | suggested fix`; do not edit any
  files." Relay its findings back to the main flow. Running it inline works too.

Whichever agent, the contract is identical: **read-only in, prioritized findings out**, then the
caller fixes and re-runs until clean.

## The review checklist

Each item lists what to look for and a concrete ❌→✅ example. These are the failure modes that
actually caused review rounds.

### 1. Docs ↔ code consistency

- Docs claiming behavior the code does not have.
- A symbol/asset categorized differently across files (e.g. a metadata array vs a README table row).
- An instruction that contradicts the actual code convention (barrel vs internal import path;
  an auto-merge `if:` guard that differs from the shipped workflow).
- A table/tree/index entry for a file that does not exist in the repo (or a file missing from it).

```text
❌ "The REST API lists review threads and marks them resolved."
✅ "GraphQL lists review threads (reviewThreads) and resolves them (resolveReviewThread);
    REST only posts replies." (matches what the code actually calls)
```

### 2. Code-example validity

Every "correct" snippet must actually compile and match the standard it illustrates.

```typescript
// ❌ Non-void function with an empty body — does not compile
export function formatDate(dateString: string): string {}

// ✅ Real body that returns the declared type
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", { dateStyle: "long" });
}
```

- No JSDoc patterns inside a TSDoc example (`@param {string} x`, `@param props.child`, `{type}` braces).
- No syntactically invalid inline snippets (e.g. `foo(a: 1)` where an object was meant: `foo({ a: 1 })`).
- A JSX component used as an example must return an element, not infer `void`.

### 3. Links & references

- Broken relative links — count the `../` hops from the file's real location.

```text
❌ From .github/instructions/, linking a test as ../commands/__tests__/init.test.ts
✅ ../../src/commands/__tests__/init.test.ts   (correct number of ../ hops)
```

- Outdated version/path references (a GitHub Action pinned `@v4` when the repo standard is `@v7`;
  a deep module path where the repo convention is a barrel import such as `@/transformer`).

### 4. Markdown hygiene

- Every fenced code block has a language tag (` ```bash `, ` ```typescript `, ` ```text `).
- Nested backtick spans render correctly (use longer outer fences when a snippet contains backticks).
- No stray empty bullets or blank list items in templates — use an HTML comment placeholder instead.

### 5. Inventories / tables completeness

README instructions/skills/prompts tables, `AGENTS.md` indexes, directory trees, and any
"N total" counts must list **all** shipped assets — or be explicitly marked truncated with a total.
When you add or rename an asset, grep for every index that enumerates its siblings and update each.

### 6. Shell / script robustness (for prompt & skill snippets)

- Stage specific paths, not `git add -A`, so the commit does not sweep unrelated pre-existing changes.
- Paginate past the first 100 items (walk `pageInfo { endCursor hasNextPage }`), don't stop at page one.
- A failed API call must **fail fast**, not be treated as an empty result.

```bash
# ❌ An auth/network failure looks identical to "no threads" — the assertion passes on error
COUNT=$(gh api graphql -f query='...' | jq '.data.repository.pullRequest.reviewThreads.nodes | length')

# ✅ Fail fast: distinguish an error shape from a genuine empty result before counting
if ! echo "$PAGE" | jq -e '.data.repository.pullRequest.reviewThreads' >/dev/null 2>&1; then
  echo "ERROR: GraphQL request failed or returned an unexpected shape" >&2
  exit 1
fi
```

- An "assertion" whose failure branch still exits `0` is not an assertion — exit non-zero on failure.
- Handle the "all findings were false positives → nothing to commit" case so a referenced `$SHA`
  is not an unrelated existing HEAD (guard with `git diff --cached --quiet`).
- Cross-platform test assertions: don't hard-code the `/` path separator (`[\\/]` in regexes),
  and include `stderr` in failure messages so CI shows why a spawned CLI exited non-zero.

### 7. Repo health

- `package-lock.json` in sync — after a dependency bump, `npm ci` must exit `0`
  (a drifted lockfile fails with `Missing … from lock file`). Regenerate with
  `npm install --package-lock-only` and verify `npm ci`.
- CI matrix / workflow config sanity (a `workflow_run` trigger names a workflow whose `name:`
  actually exists; `on:` events match intent; least-privilege `permissions:`).

## Highest-recall patterns (from real review rounds)

A few patterns account for **most** reviewer findings — and they are exactly the ones a
diff-focused read misses, because the defect lives in a file the change only touches the
*meaning* of. **Check these first.** (Percentages below are from an actual review round of this
skill's own PR, where a reviewer found 10 issues the initial self-review missed.)

### P1 — Propagate a reframe to *every* description of the concept (highest yield)

When you rename or reframe anything (a term, a default, a capability), the change must reach
**every surface that describes it** — not only the canonical/body text, but each one-line
description: README tables, per-agent asset maps (`AGENTS.md`, `AGENTS.codex.md`), directory
trees, and the CHANGELOG summary. **A concept described two ways is a guaranteed finding** — half
the findings in the reference round were this single class (the body was reframed; the index rows
still advertised the old wording).

**Technique — the reframe sweep:** after any rename/reframe, grep the whole repo for the *old*
term and each synonym, then reconcile every hit.

```bash
# e.g. after reframing "subagent" → "read-only pass", hunt every lingering description
grep -rn "subagent" . --include="*.md"
```

### P2 — Keep the *mechanism* branch-specific, never the *scope/contract*

When guidance branches per agent / platform / environment, only the **mechanism** may differ; the
**scope or contract** must stay identical across every branch.

```text
❌ "Copilot runs it inline over the changed files and their neighbors."   (silently narrowed scope)
✅ "Copilot runs it inline over the whole repository."                     (mechanism differs, scope constant)
```

### P3 — "We updated X" must match the diff

Every CHANGELOG / PR / summary claim that an artifact was changed must correspond to a file
**actually in the diff**, and the named target must be a place that could plausibly hold that
content.

```text
❌ CHANGELOG: "the prompts README now lists the new skill"  (that file is not in the diff, and a
   prompts index would not list skills anyway)
✅ Record only the indexes actually updated (here: the skills README + the asset maps).
```

### P4 — When you touch an inventory, cross-check *every* sibling

Editing a tree/table to add your entry re-presents the whole inventory as complete — so a
**pre-existing** omission now reads as your bug. Enumerate what exists on disk and reconcile.

```bash
# every directory here must appear in the README tree AND the skills table
ls -1 templates/shared/skills
```

### P5 — A generated procedure that makes fixes must commit before it pushes

Any documented step that can create fixes and then pushes must **explicitly commit** them and
confirm a clean worktree (`git status`) first — otherwise the fixes are silently omitted from the
push, and a referenced `$SHA` points at the wrong commit.

## Output contract

Report findings as a **prioritized list**, most severe first, one row each:

```text
severity | file:line | problem | suggested fix
```

- **severity** — `critical` (compile/CI break, wrong behavior claim), `warning` (stale doc,
  broken link, missing index entry), `nit` (wording, formatting).
- **file:line** — a clickable anchor so the fix is one jump away.
- **suggested fix** — concrete enough to apply directly.

Empty output ("no findings") is a valid, good result — say so explicitly rather than inventing nits.

## Acting on findings & convergence

These steps are performed by the **caller** (the agent flow that invoked this skill), not by the
read-only review pass itself — the pass only inspects and reports.

1. The caller applies every `critical` and `warning`; applies `nit`s unless there is a reason not to.
2. The caller re-runs the project's checks (`lint`, `type-check`, `tsc --noEmit`, `test`, `build` — whichever exist).
3. The caller re-runs the review over the whole repo. **Loop until the pass reports zero findings
   *within the change's blast radius***, *then* push. Pre-existing issues outside that scope are
   noted (see "What NOT to flag" below) but do not block convergence.

Because these repos guide agents, an inaccurate doc induces downstream errors — so it is worth
iterating N times to reach an optimal, consistent result rather than stopping at the first
"good enough" pass. Convergence here means the review pass finds nothing new, not merely
that CI is green.

## What NOT to flag (avoid false positives)

- Intentional, documented deviations (a snippet explicitly labeled "❌ INCORRECT" is *meant* to be wrong).
- Style preferences the repo has not adopted — match the surrounding code, don't impose new conventions.
- Truncated inventories that already declare a total ("… 13 skills total").
- Pre-existing, unrelated issues outside the change's blast radius — note them separately, do not
  block the push on them.
