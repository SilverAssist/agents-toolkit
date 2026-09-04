# Bitbucket Integration Partial

Reusable Bitbucket pull request and repository operations for prompts, driven by
the **TWG CLI** (`twg bb`).

## Usage

Include these steps in prompts that act on a Bitbucket repository — the Jira
tracker workflow (`create-pr`, `prepare-pr`, `finalize-pr`). For GitHub
repositories use `github-integration.md` and the `gh` CLI instead.

---

## Prerequisite: verify the CLI before relying on it

`gh` does not talk to Bitbucket. The tool is `twg`, and **`twg bb` needs a
Bitbucket token that `twg login` does not create** — OAuth login covers Jira and
Confluence only.

```bash
command -v twg >/dev/null 2>&1 && twg bb repo get >/dev/null 2>&1 && echo "twg bb ready"
```

- **Ready** → use the commands below to create, review, and merge PRs directly.
- **`twg` missing** → see `docs/cli-setup.md` for installation.
- **`twg` present but `twg bb` fails** → the Bitbucket token is missing. Tell the
  user to run `twg setup bitbucket` (interactive; it cannot be automated in a
  non-interactive session). Do **not** report this as "no Bitbucket access".

**Fallback when the CLI is unavailable:** do not abandon the work. Push the
branch, then give the user the ready-to-paste PR title, the description (as a
file path they can copy from), and the create-PR URL:

```text
https://bitbucket.org/<workspace>/<repo>/pull-requests/new?source=<branch>&dest=<base>
```

`twg bb` **auto-detects workspace and repo from the git remote**, so run it from
inside the checkout; `-w <workspace> -r <repo>` overrides that.

---

## Pull Request Operations

### Step: Create a Pull Request

1. **Push the branch first** — `twg` does not push for you.
2. **Write the description to a file**, then pass it verbatim:

```bash
twg bb prs create \
  --title "{ticket-id}: {Ticket Summary}" \
  --source "$(git branch --show-current)" \
  --dest "$BASE_BRANCH" \
  --description-file /path/to/pr-body.md
```

- **Always `--description-file`, never `-d`**, for a multi-paragraph body. It is
  read verbatim — write real newlines and real Markdown, not escaped `\n`.
- The file must hold **only the body**; a `Title:` line at the top renders
  inside the description.
- Jira issue keys in the body (`WEB-1234`) are auto-linked by Bitbucket, so plain
  text is enough — no manual URL needed.
- Optional: `--reviewer <users...>`, `--draft`, `--close-source-branch`.
- **Reviewers take a display nickname (`"Jane Smith"`) or a 24-character
  Atlassian account ID — not a username slug.**

### Step: Read a Pull Request

```bash
twg bb prs query                 # open PRs for this repo
twg bb prs get <id>              # full detail
twg bb prs diff <id>             # raw unified diff
twg bb prs diffstat <id>         # per-file scope
twg bb prs activity <id>         # approvals, comments, status changes
twg bb prs commits <id>
twg bb inbox                     # PRs awaiting your attention
```

`--state` accepts `OPEN` (default), `MERGED`, `DECLINED`, `SUPERSEDED`.

### Step: Comment and Approve

```bash
twg bb prs comment query <id>
twg bb prs comment create --pull-request <id> --text "..."
twg bb prs comment create --pull-request <id> --text "..." --path src/file.ts --line 42
twg bb prs approve <id>
```

Use `twg bb prs diff-line <id>` to resolve the exact line number an inline
comment can anchor to, rather than guessing from the diff.

### Step: Merge

```bash
twg bb prs merge --pull-request <id> \
  --merge-strategy squash \
  --close-source-branch \
  --wait
```

**Merging is irreversible — confirm with the user before running it** unless
they explicitly asked for the merge in the current request. Strategies:
`merge_commit` (default), `squash`, `fast_forward`.

---

## Repository Operations

```bash
twg bb repo get [slug]                        # metadata, main branch, clone URLs
twg bb repo file <path> --ref main            # read a file without cloning
twg bb repo list-files --path src --ref main
twg bb branch query -q feature/
twg bb commit query --branch main
```

---

## CI: debugging a failed pipeline

```bash
twg bb pipeline latest-failure --branch "$(git branch --show-current)"
twg bb pipeline get <build-number|uuid|url>
twg bb pipeline grep "error TS" --pipeline <build-number> -C 3
```

`latest-failure` finds the most recent failed run for the branch and hydrates
the failing step's log tail in one call — use it before asking the user to paste
CI output.

---

## Scripting

Add `-o json` for machine-readable output and `--select` to keep only the fields
you need:

```bash
twg bb prs query -o json --select "data.items.id,data.items.title,data.items.state"
```
