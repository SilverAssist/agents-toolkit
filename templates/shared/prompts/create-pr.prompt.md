---
agent: agent
description: Create a pull request for the current branch
model: Claude Sonnet 5
tools:
  - read_file
  - grep_search
  - replace_string_in_file
  - run_in_terminal
  - atlassian/*
---

# Create Pull Request

> **Model:** Smart tier — `Claude Sonnet 5` on Copilot, `sonnet` on Claude Code (PR authoring). To change it, edit the `model:` line in this file's frontmatter; the pin wins over the Copilot picker and Claude `/model`. Codex ignores `model:` — set the session model with `codex --model`.

Create a pull request for the current branch linked to Jira ticket **{ticket-id}**.

## Prerequisites

- Run `prepare-pr` first to ensure code is ready
- Reference: `.github/prompts/_partials/pr-template.md`
- Reference: `.github/prompts/_partials/git-operations.md`
- Reference: `.github/prompts/_partials/jira-integration.md`
- Reference: `.github/prompts/_partials/bitbucket-integration.md`
- **CLI**: `twg` with a Bitbucket token (`twg login` **and** `twg setup bitbucket`) — see
  `docs/cli-setup.md`. The PR is opened from the terminal; without the CLI this prompt
  falls back to handing you a ready-to-paste description and URL (step 7).

## Steps

### 0. Resolve the ticket ID (non-blocking)

Derive the ticket from the branch name rather than requiring it as an argument:

```bash
BRANCH=$(git branch --show-current)
TICKET=$(printf '%s' "$BRANCH" | grep -oE '[A-Z][A-Z0-9]+-[0-9]+' | head -1)
```

- **`$TICKET` found** → this is ticketed work. Use it for the Jira steps and the PR title.
- **`$TICKET` empty** → this is **not** an error. Branches like `docs/*`, `chore/*`,
  `refactor/*` are legitimately ticketless. **Skip every Jira step (3 and 8) and carry on**,
  then say so in the final report. Do not stop, and do not ask the user to invent a ticket.

Match on the ticket-ID pattern, not on a list of branch prefixes: a prefix list fails
closed on every prefix nobody enumerated, while the pattern handles them all.

Two conflicts to handle rather than resolve silently:

- **An explicit `{ticket-id}` argument that disagrees with the branch** → stop and ask.
  This almost always means the wrong branch is checked out, and guessing writes a comment
  on the wrong ticket. An argument with no ticket in the branch is a valid override.
- **A key that is not the repo's configured one** (`jira.projectKey` in
  `.agents-toolkit.json`) → **warn, do not fail**. Keys legitimately cross projects, and
  hardcoding the accepted set would mean a toolkit release every time a new one appears.

### 1. Verify Current State

```bash
git branch --show-current
git status
```

Verify:

- Branch follows convention: a prefix from `git.branchPrefix` in `.agents-toolkit.json`
  (`feature/`, `bugfix/`, `hotfix/`), or a ticketless `docs/` / `chore/` prefix. This is a
  *convention* check and is independent of step 0: a branch can follow the convention and
  still carry no ticket.
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

### 3. Read Jira Ticket — only when step 0 resolved a ticket

Skip this step entirely for ticketless work.

Fetch ticket **`$TICKET`** details:

- Get summary for PR title
- Extract acceptance criteria
- Get any context from comments

### 4. Run Final Validations

```bash
npm run lint --if-present
npm run type-check --if-present
if [ -f tsconfig.json ]; then npx tsc --noEmit; fi
npm run test --if-present
npm run build --if-present
```

Fix any issues before proceeding. If a validation command fails and the fix is not straightforward (e.g. requires business logic decisions or takes more than one iteration), stop and report the failure to the user with the exact error output before attempting further changes.

### 5. Pre-PR core review

Two things happen here, **in this order**: the planning document is removed, then the branch gets a consistency review. The order is load-bearing — reviewing *after* the removal is what catches the links, indexes and mentions the removal left stale.

**5.1 — Remove the planning document.** It was created by `work-ticket` or `create-plan` and has served its purpose. Delete it now, at PR creation rather than at finalization, so it stays out of the base branch instead of accumulating in `docs/` after the merge.

1. Find `docs/*.md` files **added on this branch** vs `$BASE_BRANCH`.
2. Keep only files whose **first line** matches `<!-- agents-toolkit:planning-doc … -->` (bare token or with optional metadata like `ticket={ticket-id}`).
3. `git rm` matching files and commit. If none match, skip.

```bash
MARKER='agents-toolkit:planning-doc'
PLANS=()
while IFS= read -r -d '' f; do
  head -n 1 "$f" 2>/dev/null | grep -qE "^<!--[[:space:]]*${MARKER}([[:space:]].*)?-->[[:space:]]*$" && PLANS+=("$f")
done < <(git diff --name-only -z "$BASE_BRANCH" --diff-filter=A -- 'docs/*.md' 'docs/**/*.md')

if [ ${#PLANS[@]} -eq 0 ]; then
  echo "No marked planning docs added on this branch — nothing to remove."
else
  echo "Removing planning docs added on this branch:"
  printf '  %s\n' "${PLANS[@]}"
  git rm -- "${PLANS[@]}"
  git commit -m "docs: Remove planning doc for {ticket-id} ahead of PR"
fi
```

**5.2 — Run the consistency review.** This is the pass that catches doc↔code drift, invalid code examples, broken links and stale indexes *before* a reviewer spends a round-trip on them. It is a local, agent-side pass — it reads the branch, never the forge — so it applies to Bitbucket exactly as it does to GitHub; the only difference is that here the reviewer whose time it saves is a person.

Run the **`core-review` skill** (`.agents/skills/core-review/SKILL.md`) with **`--budget medium`** — the diff plus one-hop neighbours (importers, indexes, sibling files). The diff is complete at this point, so `quick` would miss cross-file drift, while `thorough` (whole repo) is overkill unless the change touches architecture or renames symbols across layers. Run it as a dedicated, **read-only** pass; the invocation mechanism varies by agent:

- **GitHub Copilot** — run the checklist inline as a distinct pass over the `--budget medium` scope. Or, if `.github/agents/core-review.agent.md` is installed, @-mention `@core-review` with **`--budget quick`** and **pass the file list from Step 2 in the brief** — the agent has no shell and cannot run `git diff` itself.
- **Codex** — no subagents; run the checklist inline as a distinct pass over the same scope.
- **Claude Code** — optionally delegate to a read-only subagent (`Explore` / `general-purpose`). **Resolve the file list first and paste it into the brief** — the shipped `Explore` override is read-only (`tools: Read, Grep, Glob, WebFetch`) and cannot run `git diff`. Reuse the `git diff --name-only "$BASE_BRANCH"` output from Step 2 plus its one-hop neighbours (importers/consumers, sibling files, docs and indexes naming the changed symbol), then brief it: "review these files — `<list>` — against the core-review checklist; report `severity | file:line | problem | suggested fix`; do not edit files." The explicit list is what scopes the pass to `--budget medium`.

Apply every `critical` and `warning` finding — including any stale reference exposed by removing the planning doc — then re-run the checks from Step 4. **Re-review until the pass reports zero findings** before continuing. See the skill for the full checklist.

**5.3 — Commit and verify a clean tree.** Stage and commit whatever 5.1 and 5.2 produced, then confirm nothing is left behind, so the push in Step 6 can never carry uncommitted work.

```bash
if [ -n "$(git status --porcelain)" ]; then
  git add -A
  git commit -m "{ticket-id}: Apply pre-PR validation and review fixes"
fi

if [ -n "$(git status --porcelain)" ]; then
  echo "Worktree still dirty after commit — resolve before pushing:" >&2
  git status --porcelain >&2
  exit 1
fi
```

<details>
<summary>Why these exact commands?</summary>

**Marker over filename**: `docs/*-plan.md` also matches legitimate deliverables like `docs/rollout-plan.md`, and `docs/*plan*.md` additionally matches `explanation.md` (ex-**plan**-ation). The marker is what `work-ticket`/`create-plan` write as line 1; a plan without it is simply not deleted. Leaving a plan behind is trivial to clean up; deleting a deliverable is not recoverable.

**NUL-delimited paths**: `git diff -z` NUL-delimits output so paths containing spaces don't word-split and break `git rm`. `grep -lZ | xargs -0` is avoided because BSD `grep` on macOS does not NUL-terminate `-l` output, silently breaking that chain. The `while read -d ''` form works on bash 3.2 (macOS's system bash) and needs no `mapfile`.

**`git status --porcelain` over `git diff --quiet`**: A fix that creates a new file (e.g. a new test or snapshot) leaves it untracked; no `git diff` variant reports untracked paths. `git status --porcelain` catches them all. No `|| true` on `git commit`: a failed commit (hooks, signing, identity) must stop the flow, not be masked.

</details>

### 6. Push Branch

```bash
git push -u origin $(git branch --show-current)
```

### 7. Create Pull Request

#### PR Title

Ticketed work:

```text
{ticket-id}: {Ticket Summary}
```

Ticketless work — use a conventional-commit type matching the branch prefix:

```text
docs: {Summary}
chore: {Summary}
```

#### PR Description

Use this template:

```markdown
## Summary
Brief description of what this PR accomplishes.

## Jira Ticket
[{ticket-id}](https://your-org.atlassian.net/browse/{ticket-id})

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

#### PR Settings

- **Source**: Current branch
- **Target**: `<base-branch>` resolved from `.agents-toolkit.json` (fallback: `main`)
- **Reviewers**: Read `.github/CODEOWNERS` and map changed files to owners. If no CODEOWNERS file exists, leave the reviewers field empty and note it in the Output report.

#### Open it

Write the description to a file first — it is passed verbatim, so the body keeps its real
newlines and Markdown instead of being mangled through shell escaping:

```bash
command -v twg >/dev/null 2>&1 && twg bb repo get >/dev/null 2>&1 || echo "twg bb unavailable"

twg bb prs create \
  --title "{ticket-id}: {Ticket Summary}" \
  --source "$(git branch --show-current)" \
  --dest "$BASE_BRANCH" \
  --description-file <path-to-description>
```

The description file holds **only the body** — a `Title:` line at the top renders inside
the PR. Jira issue keys are auto-linked by Bitbucket, so `{ticket-id}` in plain text is
enough. Reviewers, if any, go in `--reviewer` and take a **display nickname or a
24-character Atlassian account ID, not a username slug**.

**If `twg bb` is unavailable**, do not stop and do not report "no Bitbucket access" — the
CLI authenticates from its own saved profile, not from environment variables, so check
before concluding. Report which of the two is missing (the binary, or the Bitbucket token
that `twg setup bitbucket` adds), then hand the user the title, the path to the
description file, and:

```text
https://bitbucket.org/<workspace>/<repo>/pull-requests/new?source=<branch>&dest=<base>
```

See `bitbucket-integration.md` for the full command surface.

### 8. Link PR to Jira — only when step 0 resolved a ticket

Skip for ticketless work and note it in the report instead. If the comment fails (ticket
moved, permissions, MCP unavailable), **the PR is already open — that is the deliverable**.
Report the failure, do not retry in a loop, and never treat it as a reason to undo the PR.

Add comment to Jira ticket:

```markdown
## Pull Request Created
- PR: [PR Title](PR_URL)
- Target: `<base-branch>` branch
- Reviewers: @assigned-reviewers

## Changes
- Summary of changes made
```

## Output

Report:

1. ✅ PR URL
2. Jira ticket linked — or **"no ticket: branch `<name>` carries no ticket ID, Jira steps
   skipped"**, which is a normal outcome for `docs/` and `chore/` work, not a failure
3. ✅ Reviewers assigned

## Next Steps

- Wait for review
- Address feedback
- Use `finalize-pr` after approval
