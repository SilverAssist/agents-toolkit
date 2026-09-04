---
name: bitbucket-review-management
description: Fetch, reply to, and resolve Bitbucket pull-request review comments with the twg CLI. Use when handling reviewer feedback on a Bitbucket PR end-to-end, or when a PR needs creating, approving, or merging from the terminal.
---

# Silver Assist — Bitbucket Review Management

Reference knowledge for driving Bitbucket pull requests from the terminal. This skill
backs the Jira tracker workflow (`/create-pr`, `/prepare-pr`, `/finalize-pr`): it covers
the tool, the auth model, the exact commands, and the gotchas that waste the most time.

Its GitHub counterpart is `github-review-management`; the two do not overlap, because
neither CLI works against the other host.

## Tool preference

**The `twg` CLI is the primary tool for every Bitbucket operation in this skill.**
`gh` does not talk to Bitbucket at all — it is not a fallback, it simply does not apply.

**`twg bb` needs a Bitbucket token that `twg login` does not create.** OAuth login covers
Jira, Confluence and the graph; Bitbucket is a separate, optional credential added with
`twg setup bitbucket`. If `twg whoami` succeeds and every `twg bb` call fails, that
missing token is the reason — not a permissions problem, and not an absent credential.

**Never report "there is no Bitbucket access here" without running the check below.**
`twg` reads its own saved profile in `~/.config/twg/`, so an empty
`env | grep -i bitbucket` proves nothing.

```bash
command -v twg >/dev/null 2>&1 && twg bb repo get >/dev/null 2>&1 && echo "twg bb ready"
```

`twg bb` auto-detects workspace and repo from the git remote, so run it from inside the
checkout; `-w <workspace> -r <repo>` overrides that.

## When to Use

- A Bitbucket PR has reviewer comments to address, reply to, and resolve before merge
- A branch is ready and the PR needs creating from the terminal
- A PR is approved and needs merging with a specific strategy
- A Bitbucket pipeline failed and you need the failing step's log
- You need to read a file or diff from a Bitbucket repo you have not cloned

## The review loop

Bitbucket comment threads resolve individually, by comment id — there is no
GraphQL-style thread mutation to learn, unlike GitHub.

```bash
# 1. Read every comment on the PR
twg bb prs comment query <pr-id> -n 100

# 2. Reply in the thread
twg bb prs comment create --pull-request <pr-id> --text "Fixed in <sha>." --reply-to <comment-id>

# 3. Resolve the thread once the change is pushed
twg bb prs comment resolve --pull-request <pr-id> --comment <comment-id>

# 4. Verify nothing is left open
twg bb prs comment query <pr-id> -o json
```

`reopen` is the inverse of `resolve`. `update` edits a comment body; `delete` is
permanent and unrecoverable — prefer editing.

**Resolve only threads you actually addressed.** A reply explaining what changed, posted
before resolving, is what makes the thread readable later.

### Inline comments

```bash
# Find the anchor by searching the diff for distinctive text, not by eyeballing line numbers
twg bb prs diff-line <pr-id> --text "validateInput" --path src/file.ts

twg bb prs comment create --pull-request <pr-id> --text "..." --path src/file.ts --line <line-from-above>
```

Anchor line numbers must come from `diff-line`, not from reading the diff by eye — the
new-side and old-side numbering differ and a wrong anchor silently lands the comment in
the wrong place. Ranges use `--start-line`/`--end-line`.

## Creating a PR

```bash
git push -u origin "$(git branch --show-current)"

twg bb prs create \
  --title "{ticket-id}: {Summary}" \
  --source "$(git branch --show-current)" \
  --dest "$BASE_BRANCH" \
  --description-file /path/to/pr-body.md
```

- **Always `--description-file`, never `-d`** for a multi-paragraph body: it is read
  verbatim, so write real newlines and real Markdown, not escaped `\n`.
- The file holds **only the body** — a `Title:` line at the top renders inside the
  description.
- Jira issue keys in the body are auto-linked by Bitbucket; plain text is enough.
- **Reviewers take a display nickname (`"Jane Smith"`) or a 24-character Atlassian
  account ID — not a username slug**, which silently fails to match.

## Inspecting and merging

```bash
twg bb prs query                  # open PRs (--state MERGED|DECLINED|SUPERSEDED)
twg bb prs get <id>
twg bb prs diff <id>
twg bb prs diffstat <id>          # scope a review before reading the diff
twg bb prs activity <id>          # approvals, comments, status changes, in order
twg bb inbox                      # PRs awaiting your attention across repos
twg bb prs approve <id>

twg bb prs merge --pull-request <id> --merge-strategy squash --close-source-branch --wait
```

**Merging is irreversible.** Confirm with the user before running it unless they asked
for the merge in the current request. Strategies: `merge_commit` (default), `squash`,
`fast_forward`. `--wait` blocks until Bitbucket confirms `MERGED`.

## Failing pipelines

```bash
twg bb pipeline latest-failure --branch "$(git branch --show-current)"
twg bb pipeline grep "error TS" --pipeline <build-number> -C 3
twg bb pipeline tail <build-number|url>
```

`latest-failure` locates the most recent failed run for a branch and hydrates the failing
step's log tail in one call — reach for it before asking the user to paste CI output.

## Reading a repo you have not cloned

```bash
twg bb repo file <path> --ref main
twg bb repo list-files --path src --ref main
twg bb commit query --branch main
```

Cheaper than cloning a sibling repository to check one file.

## Scripting

`-o json` (or `-o jsonl`) on any command, `--select` to keep only the fields you need,
`--output-summary` to write large payloads to a file instead of the transcript.

```bash
twg bb prs query -o json --select "data.items.id,data.items.title,data.items.state"
```

## Where this does not apply

- **GitHub repositories** — use `github-review-management` and `gh`. Check
  `git remote get-url origin` first.
- Cross-provider or org-wide PR discovery — `twg pull-requests` (without `bb`) is the
  graph-backed surface spanning Bitbucket, GitHub and GitLab.
