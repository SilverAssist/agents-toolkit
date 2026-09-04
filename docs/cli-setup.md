# CLI setup — `gh` and `twg`

The toolkit's workflow prompts drive the forge from the terminal instead of
asking you to click through a web UI. That needs one CLI per host:

| Host                          | CLI   | Used by                                                        |
| ----------------------------- | ----- | -------------------------------------------------------------- |
| GitHub (`github.com`)         | `gh`  | `create-github-pr`, `finalize-github-pr`, `resolve-github-reviews`, `prepare-github-release`, `analyze-github-issue`, `work-github-issue` |
| Bitbucket (`bitbucket.org`)   | `twg` | `create-pr`, `prepare-pr`, `finalize-pr` (the Jira tracker workflow) |

They are not interchangeable: **`gh` cannot talk to Bitbucket**, and `twg`'s
GitHub surface is read-only graph data, not the PR-writing API. Install the one
your repositories actually use — or both, if you work across both hosts, which
most of us do.

Check what a given repository needs:

```bash
git remote get-url origin
```

---

## `gh` — GitHub CLI

### Install

```bash
brew install gh                  # macOS
sudo apt install gh              # Debian/Ubuntu — see cli.github.com for other distros
winget install --id GitHub.cli   # Windows
```

### Authenticate

```bash
gh auth login        # interactive: choose GitHub.com, HTTPS, and authenticate in the browser
```

### Verify

```bash
gh auth status
gh repo view         # from inside a checkout
```

### Gotcha that costs the most time

**Prefix `gh api` with `GH_PAGER=cat`, or append `| cat` to `gh pr` / `gh run`
commands.** Without it the pager blocks on long output and the command looks
like it hung — this is the single most common failure when an agent drives `gh`.

---

## `twg` — Atlassian Teamwork Graph CLI

Covers Bitbucket, Jira, Confluence and the Teamwork Graph. No runtime
dependency — it is a single native binary, no Node.js needed.

### Install

```bash
# macOS / Linux
curl -fsSL --retry 2 https://teamwork-graph.atlassian.com/cli/install | bash
```

```powershell
# Windows (PowerShell)
curl.exe -fsSL https://teamwork-graph.atlassian.com/cli/install.ps1 -o twg-install.ps1
powershell -ExecutionPolicy Bypass -File .\twg-install.ps1
```

The shell installer puts the binary in `~/.local/bin`, so make sure that is on
your `PATH`. A `.pkg` (macOS) and `.msi` (Windows) are also published and install
to `/usr/local/bin` and `C:\Program Files\twg` respectively — see the
[official installation guide](https://developer.atlassian.com/cloud/twg-cli/getting-started/installation/).

### Authenticate — this is two steps, not one

```bash
twg login              # 1. interactive OAuth in the browser (Jira, Confluence, the graph)
twg setup bitbucket    # 2. the Bitbucket token — REQUIRED for every `twg bb` command
```

**Step 2 is the one everyone misses.** `twg login` does not grant Bitbucket
access; the Bitbucket token is a separate, optional credential. Symptom of
skipping it: `twg whoami` works fine, and every single `twg bb` call fails. That
is a missing token, not a permissions problem.

`twg setup` runs the whole flow at once (skills install, login, health check).
Both are interactive and need a browser, so they cannot be completed by an agent
in a non-interactive session — run them yourself once per machine.

### Verify

```bash
twg whoami       # the authenticated Atlassian account
twg doctor       # build metadata, auth resolution, API connectivity
twg bb repo get  # from inside a Bitbucket checkout — proves the Bitbucket token works
twg env          # which auth profile is active, and where it lives
```

Credentials live in `~/.config/twg/`.

### Update

```bash
twg update           # installs the latest release, then refreshes installed skills
twg update --check   # check only
```

> The official docs currently say `twg upgrade`; that command does not exist in
> the shipped CLI (verified on 1.2.7). Use `twg update`.

### Gotchas

- **`twg bb` auto-detects workspace and repo from the git remote** — run it from
  inside the checkout and you rarely need `-w` / `-r`.
- **Use `--description-file` for PR bodies**, never `-d` for anything longer than
  a sentence. The file is read verbatim: real newlines, real Markdown.
- **Reviewers take a display nickname (`"Jane Smith"`) or a 24-character
  Atlassian account ID** — a username slug silently does not match.
- Jira issue keys in a PR description are auto-linked by Bitbucket; plain text is
  enough.
- `twg bb prs merge` is irreversible. The prompts require confirmation first.

---

## What the prompts do when a CLI is missing

They degrade instead of stopping. The branch still gets pushed and you get the
PR title, the description file, and a ready-to-open create-PR URL to finish by
hand. What they will **not** do is report "there is no access here" without
having checked first — an empty `env | grep -i bitbucket` proves nothing,
because `twg` authenticates from its own saved profile rather than from
environment variables.
