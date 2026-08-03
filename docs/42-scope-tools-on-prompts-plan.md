<!-- agents-toolkit:planning-doc issue=42 -->

# Implementation Plan: Scope `tools:` on Copilot Prompts (#42)

## Problem Statement

15 of 19 shipped prompts omit the `tools:` frontmatter block, so Copilot exposes the agent's full default tool set — including every connected MCP server — on every turn of those prompts. The Atlassian MCP alone exposes ~30 tools; the GitHub MCP a comparable number. Scoping each prompt to only the tools it actually calls reduces the schema payload sent per turn and prevents accidental side-effects.

## Current State

4 prompts already have `tools:` (`new-wp-component`, `new-wp-plugin`, `prepare-github-release`, `quality-check`). The remaining 15 declare nothing.

`validate-prompts.mjs` already contains a comment at line 26 anticipating this change: _"making it required is tracked as part of the tools-scoping work, which adds the declarations and flips `REQUIRED_KEYS` in the same change."_

## Proposed Changes

### Phase 1 — Add `tools:` to 15 undeclared prompts

**GitHub group** (GitHub MCP + `gh` CLI + codebase):

| Prompt | `tools:` |
|---|---|
| `analyze-github-issue` | `read_file`, `grep_search`, `github/*` |
| `work-github-issue` | `read_file`, `grep_search`, `create_file`, `replace_string_in_file`, `run_in_terminal`, `github/*` |
| `create-github-pr` | `read_file`, `grep_search`, `replace_string_in_file`, `run_in_terminal`, `github/*` |
| `finalize-github-pr` | `read_file`, `run_in_terminal`, `github/*` |
| `resolve-github-reviews` | `read_file`, `replace_string_in_file`, `run_in_terminal`, `github/*` |

**Atlassian/Jira group** (Atlassian MCP + `gh`/`git` + codebase):

| Prompt | `tools:` |
|---|---|
| `analyze-ticket` | `read_file`, `grep_search`, `atlassian/*` |
| `work-ticket` | `read_file`, `grep_search`, `create_file`, `replace_string_in_file`, `run_in_terminal`, `atlassian/*` |
| `create-pr` | `read_file`, `grep_search`, `replace_string_in_file`, `run_in_terminal`, `atlassian/*` |
| `finalize-pr` | `read_file`, `run_in_terminal`, `atlassian/*` |

**Read-only code prompts** (no MCP, no terminal):

| Prompt | `tools:` |
|---|---|
| `review-code` | `read_file`, `grep_search` |
| `audit-ai-seo` | `read_file`, `grep_search` |

**Editing prompts** (no MCP):

| Prompt | `tools:` |
|---|---|
| `fix-issues` | `read_file`, `grep_search`, `replace_string_in_file`, `run_in_terminal` |
| `add-tests` | `read_file`, `grep_search`, `create_file`, `replace_string_in_file`, `run_in_terminal` |
| `create-plan` | `read_file`, `grep_search`, `create_file` |
| `prepare-pr` | `read_file`, `run_in_terminal` |

### Phase 2 — Gate: flip `REQUIRED_KEYS` in `validate-prompts.mjs`

Add `'tools'` to `REQUIRED_KEYS`. The existing `SCALAR_ONLY_KEYS` check will not be extended — `tools:` is a list, so the existing "must not be array" check for scalar keys does not apply.

Also add a `LIST_KEYS` check to confirm `tools:` is a non-empty array (not a scalar).

### Phase 3 — Document MCP wildcard naming in `README.md`

Add a "Tool scoping and MCP portability" section explaining:

- `atlassian/*` resolves only when the server is registered under the name `atlassian` in `mcp.json`
- `github/*` resolves only when the server is registered under the name `github`
- Both are the common default names; users with non-default names must edit the installed files

### Phase 4 — Record Claude rationale in `AGENTS.md` + `CLAUDE.md`

`allowed-tools` on Claude Code is a permission pre-approval (does not reduce context). `disallowed-tools` is a denylist (breaks when new tools appear). Neither delivers the token savings VS Code `tools:` provides. `bin/cli.js` already strips `tools:` when converting to Claude commands.

## Testing Strategy

- `validate:prompts` script enforces `tools:` is present and non-empty on every prompt (non-zero exit otherwise)
- Add a test in `src/cli.test.js`: assert that every name in `PROMPTS.workflow` and `PROMPTS.utility` corresponds to a prompt file that has a non-empty `tools:` block

## Risk Assessment

- **Over-scoping** (tool listed but unavailable) → runtime failure mid-prompt. Mitigated by verifying every entry against the actual prompt body.
- **MCP name portability** → silent no-op if server registered under a different name. Mitigated by documentation.
- `bin/cli.js` already strips `tools:` for Claude — no risk of unintended `allowed-tools` entries.
