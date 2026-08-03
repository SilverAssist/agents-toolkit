---
name: core-review
description: "Run a consistency review before opening a PR or before pushing fixes in response to a reviewer — as a dedicated read-only pass (inline or via @core-review on Copilot; optionally a subagent on Claude Code) — to preempt Copilot/reviewer iterations. Scope follows `--budget`: the diff (`quick`), the diff plus one-hop neighbours (`medium`, the default), or the whole repository (`thorough`). Use when about to push a branch for review or to push a batch of review fixes."
model: haiku
argument-hint: --budget quick|medium|thorough
---

<!--
  Note on the `model: haiku` pin above:
  - **Claude Code** honours it per-turn — this is why it exists (cheap-tier default so this
    pass, which runs at least once per PR + once per review round, does not multiply the
    cost of every autonomous cycle).
  - **VS Code Copilot's chat-customizations-evaluations linter** flags `model:` as an
    unsupported skill attribute (its allow-list for skills is: `argument-hint`,
    `compatibility`, `context`, `description`, `disable-model-invocation`, `license`,
    `metadata`, `name`, `user-invocable`). That warning in the Problems panel is
    **expected and cosmetic** — Copilot's runtime silently ignores unknown skill
    attributes, and skills have no independent `model:` boundary on Copilot anyway (they
    inherit the invoking prompt's model). Suppress-by-editing is not worth the split-ship
    complexity: keep the pin so Claude Code stays cheap.
  - **Codex** has no per-skill `model:` mechanism at all, so this line is inert there.
-->

# Silver Assist — Core Review (Pre-Review)

A **pre-emptive consistency review** that runs *before* a reviewer (Copilot or a
human) ever sees the branch, over a file set the caller scopes with `--budget` (diff →
one-hop neighbours → whole repo; see the budget table below). It catches the classes of
issues that trigger multi-round review loops — doc↔code drift, invalid code examples, broken links, stale indexes — so they are fixed
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

## Why look beyond the diff

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
and **Claude Code**; only the *mechanism* differs:

- **GitHub Copilot** — run the checklist **inline as a distinct pass** or use `@core-review` (`.github/agents/core-review.agent.md`) for a cheap-tier pass; pass the resolved file list in the brief — the agent has no shell. Trigger before
  pushing (not folded into the edit under review). The scope of the pass is set by the
  caller-supplied `--budget` (see the next section) — `quick` is diff + directly-touched files,
  `medium` adds one-hop neighbours, `thorough` is the whole repo. On Copilot the effective model
  for this pass is whatever the *invoking* prompt pins (skills don't have their own model on
  Copilot), so the shipped `model: haiku` in this skill's frontmatter is **advisory-only on
  Copilot** — it is honoured only when the invoking prompt is itself cheap-pinned (e.g.
  `finalize-github-pr`, which is a cheap-tier orchestrator) or when this skill is invoked
  standalone from a fresh chat. Smart-tier orchestrators (`create-github-pr`,
  `resolve-github-reviews`) run their inline `core-review` pass on the
  smart tier on Copilot; to keep the pass cheap there, invoke this skill as a **standalone
  chat** with the picker set to a cheap model.
- **Codex** — no subagents either; the same **inline pass**, scoped by the caller's `--budget`
  (see below). Codex has no per-prompt or per-skill `model:` field, so the model is set
  session-wide by `codex --model` (or `~/.codex/config.toml`). Consider `codex --model o4-mini`
  (or your provider's cheap tier) for this pass — the checklist is deterministic.
- **Claude Code** — the shipped skill frontmatter already pins `model: haiku` for the duration
  of this pass, so the outer chat's smart tier is preserved. *Optionally* delegate the pass to
  a read-only **subagent** (`Explore` or `general-purpose`).

  **Resolve the file set in the caller and paste it into the brief.** The shipped `Explore`
  override declares `tools: Read, Grep, Glob, WebFetch` — no shell, deliberately, so the
  subagent stays read-only — which means it cannot run `git diff` to work out what changed. A
  brief that only names a budget leaves it with no way to find the diff:

  ```bash
  # quick    → exactly this list
  # medium   → this list plus its one-hop neighbours (importers/consumers, sibling files,
  #            docs/indexes that name the changed symbol), resolved by the caller
  # thorough → send no list; ask for the whole repository
  git diff --name-only "$BASE_BRANCH"
  ```

  Then brief it: "Review these files — `<paste the resolved list>` — against the core-review
  checklist; report findings as `severity | file:line | problem | suggested fix`; do not edit
  any files." Relay its findings back to the main flow. Running the pass **inline** works too,
  and needs none of this: the inline pass has the caller's own tools and resolves the diff itself.

Whichever agent, the contract is identical: **read-only in, prioritized findings out**, then the
caller fixes and re-runs until clean.

## `--budget {quick,medium,thorough}` — cost-aware scoping

The review pass is **cheap-tier by default on Claude Code** (the shipped `model: haiku`
frontmatter is honoured per-turn there). On **Copilot** the pass inherits the invoking prompt's
model (skills have no independent `model:` boundary), so "cheap by default" holds only when the
caller is itself cheap-pinned (`finalize-github-pr`) or the skill is invoked standalone with a
cheap picker; when invoked inline from a smart-tier orchestrator (`create-github-pr`,
`resolve-github-reviews`), the pass runs smart. On **Codex** the pass runs whatever the session
model is (`codex --model`). The skill still ships `model: haiku` because it runs at least once
per PR plus once per review round, so a `sonnet`-tier default would multiply the token cost of
every autonomous cycle wherever the pin *is* honoured. Callers pass `--budget` to scope the pass
to the amount of drift the current step can realistically introduce:

| Budget       | Scope                                                                            | When callers use it                                                             |
| ------------ | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `quick`      | Just the diff (`git diff` vs the base branch) plus the files it directly touches | `finalize-github-pr` and `resolve-github-reviews` pre-push fix batches          |
| `medium`     | Diff + one-hop neighbours: importers/consumers, docs & indexes that list the changed symbol or asset, sibling files in the same folder | `create-github-pr` pre-PR pass — the default when unspecified                   |
| `thorough`   | Whole repository — every file, index, README, workflow, and cross-repo doc claim | Standalone pre-release review, or when the diff touches architecture / renaming |

> **Only the GitHub-tracker orchestrators wire this skill today** (`create-github-pr`,
> `finalize-github-pr`, `resolve-github-reviews`). The Jira-tracker variants (`create-pr`,
> `finalize-pr`) do **not** invoke `core-review` — they run validations and push directly.
> Standalone callers on Jira projects can invoke `core-review` manually with an explicit
> `--budget`; the callers table above lists only the actual auto-wired invocations.

**Cheap tier is safe at every budget.** `thorough` does not automatically switch to the smart
tier — it just widens the file set. Callers who genuinely need reasoning (architecture reviews,
renames that span layers) can pass `--budget thorough` **and** escalate the model. Escalation
mechanics are platform-specific:

- **Copilot** — skills don't have a `model:` boundary, so the invoking prompt's pin (or the
  picker choice when this skill is invoked standalone from a fresh chat) governs. Set the
  picker to a smart model before a one-off standalone run.
- **Codex** — no per-skill pin either; launch the smart-tier session with
  `codex --model gpt-5-codex` (or your provider's smart tier).
- **Claude Code** — the skill's own `model: haiku` frontmatter locks the tier for the pass
  **even on a standalone invocation**: `/model sonnet` in the chat does **not** override a
  `SKILL.md model:` pin. To escalate, edit the `model:` line in the installed
  `.agents/skills/core-review/SKILL.md` before running and revert afterward.

Do **not** hard-code a smart-tier override in the calling prompt: the caller decides, not this
skill.

The default when `--budget` is omitted is `medium`. `--budget quick` still runs the full
checklist below — it just narrows the file set the checklist is applied to.

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

### P2 — Keep the *mechanism* branch-specific, never the *contract*

When guidance branches per agent / platform / environment, only the **mechanism** may differ; the
**contract** (what the caller passes in and what the pass returns out) must stay identical across
every branch. **Scope is caller-selected via `--budget`, not per-agent** — the mechanism chooses
*how* the file set is walked, never *which* file set is walked.

```text
❌ "Copilot runs it inline over only the changed file."                  (silently narrows scope
                                                                            beyond `--budget`)
✅ "Copilot runs it inline over the file set the caller's `--budget`
   selected."                                                              (mechanism differs,
                                                                            scope-selection contract
                                                                            constant)
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
# every skill directory here must appear in the README tree AND the skills table
# (list directories only — a plain `ls` would also print the skills README.md)
ls -d templates/shared/skills/*/
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
3. The caller re-runs the review **at the same `--budget`** the initial pass used. **Loop until
   the pass reports zero findings *within the change's blast radius***, *then* push. Pre-existing
   issues outside that scope are noted (see "What NOT to flag" below) but do not block convergence.
   Escalate the `--budget` (e.g. `quick` → `medium`) only when a fix ripples into files the initial
   scope did not cover.

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
