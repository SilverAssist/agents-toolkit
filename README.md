# @silverassist/agents-toolkit

Reusable AI agent prompts for development workflows — supports **GitHub Copilot**, **Claude Code**, and **Codex** with multi-stack and multi-tracker filtering.

[![npm version](https://img.shields.io/npm/v/@silverassist/agents-toolkit.svg)](https://www.npmjs.com/package/@silverassist/agents-toolkit)
[![License](https://img.shields.io/badge/license-PolyForm%20Noncommercial-blue.svg)](https://github.com/SilverAssist/agents-toolkit/blob/main/LICENSE)

## Features

- ✅ **Complete Workflow Prompts**: From ticket analysis to PR merge
- ✅ **Multi-Agent Support**: Works with GitHub Copilot, Claude Code, and Codex
- ✅ **Multi-Stack Filtering**: Install only React or WordPress content with `--stack`
- ✅ **Multi-Tracker Support**: Choose GitHub Issues or Jira workflows with `--tracker`
- ✅ **Global Install**: Install once for all projects with `--global`
- ✅ **Modular Partials**: Reusable prompt fragments
- ✅ **Customizable**: Easy to extend and modify
- ✅ **PostToolUse Hooks**: Automated validation and formatting after Copilot edits
- ✅ **CLI Tool**: Quick installation in any project

## Installation

**For GitHub Copilot (project):**

```bash
npx @silverassist/agents-toolkit@latest install
```

**For GitHub Copilot (global — all projects):**

```bash
npx @silverassist/agents-toolkit@latest install --global
```

**For Claude Code:**

```bash
npx @silverassist/agents-toolkit@latest install --claude
```

**For Codex:**

```bash
npx @silverassist/agents-toolkit@latest install --codex
```

## Setup

### GitHub Copilot

Run the CLI to install prompts into your project:

```bash
npx @silverassist/agents-toolkit@latest install
```

This creates the following structure:

```
AGENTS.md                             # Copilot Coding Agent instructions (project root)
.github/
├── copilot-instructions.md           # Project-wide Copilot instructions
├── prompts/
│   ├── _partials/
│   ├── analyze-ticket.prompt.md
│   ├── create-plan.prompt.md
│   ├── work-ticket.prompt.md
│   └── ...                           # 10 prompts total (depends on --tracker)
├── instructions/
│   ├── typescript.instructions.md
│   ├── react-components.instructions.md
│   └── ...                           # filtered by --stack
└── skills/                           # Symlinks → ../../.agents/skills/ (npx skills standard)
    ├── domain-driven-design   -> ../../.agents/skills/domain-driven-design
    ├── testing-patterns       -> ../../.agents/skills/testing-patterns
    └── ...                           # filtered by --stack
.agents/
└── skills/                           # Canonical store (single source of truth)
    ├── domain-driven-design/
    ├── testing-patterns/
    └── ...                           # 9 skills total, filtered by --stack
```

> **Skills follow the [`npx skills`](https://github.com/vercel-labs/skills) standard.** The real skill files live once in the canonical `.agents/skills/` store, and each agent's `skills/` directory contains symlinks to it — a single source of truth shared across Copilot, Claude Code, and Codex. Use `--copy` to materialize real copies instead of symlinks (e.g. on Windows without developer mode; symlinks also fall back to copies automatically when unsupported).

**Running prompts in VS Code:**

1. Open Command Palette (`Cmd+Shift+P` / `Ctrl+Shift+P`)
2. Search for "GitHub Copilot: Run Prompt"
3. Select the desired prompt
4. Fill in variables (e.g., `{ticket-id}`)

### Claude Code

Run the CLI with the `--claude` flag:

```bash
npx @silverassist/agents-toolkit@latest install --claude
```

This creates the following structure:

```
CLAUDE.md                             # Project instructions for Claude Code (project root)
.agents/
└── skills/                           # Canonical skills store (single source of truth)
    ├── domain-driven-design/
    ├── testing-patterns/
    └── ...                           # 9 skills total, filtered by --stack
.claude/
├── commands/
│   ├── _partials/
│   ├── analyze-ticket.md
│   ├── create-plan.md
│   ├── work-ticket.md
│   └── ...                           # 10 commands total (depends on --tracker)
└── skills/                           # Symlinks → ../../.agents/skills/ (read natively by Claude Code)
    ├── domain-driven-design   -> ../../.agents/skills/domain-driven-design
    ├── testing-patterns       -> ../../.agents/skills/testing-patterns
    └── ...                           # filtered by --stack
.github/
└── instructions/                     # Shared with Copilot
```

> Skills now install to `.claude/skills/` (where Claude Code reads them natively) as symlinks to the canonical `.agents/skills/` store — no longer to `.github/skills/`.

**Running commands in Claude Code:**

Type `/` in the chat to see all available slash commands:

```
/analyze-github-issue
/work-github-issue
/create-github-pr
/finalize-github-pr
```

### Codex

Run the CLI with the `--codex` flag:

```bash
npx @silverassist/agents-toolkit@latest install --codex
```

This creates the following structure:

```
AGENTS.md                             # Project instructions for Codex (project root)
.github/
├── prompts/
│   ├── _partials/
│   ├── analyze-ticket.prompt.md
│   ├── create-plan.prompt.md
│   ├── work-ticket.prompt.md
│   └── ...                           # 10 prompts total (depends on --tracker)
├── instructions/
│   ├── typescript.instructions.md
│   ├── react-components.instructions.md
│   └── ...                           # filtered by --stack
└── skills/                           # Symlinks → ../../.agents/skills/ (npx skills standard)
    ├── domain-driven-design   -> ../../.agents/skills/domain-driven-design
    ├── testing-patterns       -> ../../.agents/skills/testing-patterns
    └── ...                           # filtered by --stack
.agents/
└── skills/                           # Canonical store (single source of truth)
    ├── domain-driven-design/
    ├── testing-patterns/
    └── ...                           # 9 skills total, filtered by --stack
```

### Global Install (Optional)

Install once and have instructions, prompts, and skills available across **all your projects** without running `install` in each one:

```bash
# Install everything to ~/.copilot/
npx @silverassist/agents-toolkit@latest install --global

# Filter by stack/tracker
npx @silverassist/agents-toolkit@latest install --global --stack wordpress
npx @silverassist/agents-toolkit@latest install --global --stack react --tracker github

# Update global install
npx @silverassist/agents-toolkit@latest update --global
```

This installs to `~/.copilot/` (instructions, prompts, skills) and creates `~/.agents-toolkit.json` as the global config. Project-level files (AGENTS.md, copilot-instructions.md) are skipped since they are project-specific.

> **Config resolution order:** CLI flags → project `.agents-toolkit.json` → global `~/.agents-toolkit.json` → defaults.

### Configure Project (Optional)

Update `.agents-toolkit.json` in your project root (created automatically):

```json
{
  "stack": "react",
  "tracker": "github",
  "jira": {
    "projectKey": "WEB",
    "baseUrl": "https://your-org.atlassian.net"
  },
  "git": {
    "defaultBranch": "dev"
  }
}
```

| Field | Values | Description |
|-------|--------|-------------|
| `stack` | `react`, `wordpress`, `all` | Filter instructions/skills by tech stack |
| `tracker` | `github`, `jira`, `all` | Filter prompts/partials by issue tracker |
| `jira` | object | Jira connection settings (when tracker is `jira`) |
| `git` | object | Git workflow settings |

## Available Prompts / Commands

The same set of prompts is available for all supported tools.

### Workflow

| Prompt / Command | Description | Variables | Tracker |
|------------------|-------------|-----------|---------|
| `analyze-ticket` | Analyze a Jira ticket | `{ticket-id}` | Jira |
| `analyze-github-issue` | Analyze a GitHub issue | `{issue-number}` | GitHub |
| `create-plan` | Create implementation plan | `{feature-description}` | All |
| `work-ticket` | Start working on a Jira ticket | `{ticket-id}` | Jira |
| `work-github-issue` | Start working on a GitHub issue | `{issue-number}` | GitHub |
| `prepare-pr` | Prepare code for PR | — | All |
| `create-pr` | Create a pull request (Jira) | `{ticket-id}` | Jira |
| `create-github-pr` | Create a pull request (GitHub) | `{issue-number}` | GitHub |
| `finalize-pr` | Finalize and merge PR (Jira) | `{ticket-id}` | Jira |
| `finalize-github-pr` | Finalize and merge PR (GitHub) | `{issue-number}` | GitHub |

### Utility

| Prompt / Command | Description | Variables |
|------------------|-------------|-----------|
| `review-code` | Quick code review | — |
| `fix-issues` | Fix lint/type/test errors | — |
| `add-tests` | Add tests for components | `{target-file}` |

### Workflow Stages

**Jira workflow:**
```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  1. Analyze     │────▶│  2. Plan        │────▶│  3. Work        │
│  analyze-ticket │     │  create-plan    │     │  work-ticket    │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  6. Finalize    │◀────│  5. Create PR   │◀────│  4. Prepare     │
│  finalize-pr    │     │  create-pr      │     │  prepare-pr     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

**GitHub workflow:**
```
┌──────────────────────┐     ┌─────────────────┐     ┌──────────────────────┐
│  1. Analyze          │────▶│  2. Plan        │────▶│  3. Work             │
│  analyze-github-issue│     │  create-plan    │     │  work-github-issue   │
└──────────────────────┘     └─────────────────┘     └──────────────────────┘
                                                               │
                                                               ▼
┌──────────────────────┐     ┌──────────────────────┐  ┌─────────────────┐
│  6. Finalize         │◀────│  5. Create PR         │◀─│  4. Prepare     │
│  finalize-github-pr  │     │  create-github-pr     │  │  prepare-pr     │
└──────────────────────┘     └──────────────────────┘  └─────────────────┘
```

## CLI Reference

### install

Install prompts into your project. **Does not overwrite existing files by default** — safe to run multiple times.

```bash
npx @silverassist/agents-toolkit@latest install [options]
```

| Option | Description |
|--------|-------------|
| `--global`, `-g` | Install to `~/.copilot/` for all projects (user-level) |
| `--target <name>` | Target installer: `copilot`, `claude`, or `codex` |
| `--stack <name>` | Filter by tech stack: `react`, `wordpress`, or `all` (default) |
| `--tracker <name>` | Filter by issue tracker: `github`, `jira`, or `all` (default) |
| `--claude` | Install for Claude Code (`.claude/commands/` + `CLAUDE.md`) |
| `--codex` | Install for Codex (`AGENTS.md` + shared `.github` files) |
| `--append` | Append missing sections to existing `AGENTS.md` (instead of overwrite) |
| `--force`, `-f` | Overwrite existing files |
| `--prompts-only` | Only install prompts / commands |
| `--instructions-only` | Only install instructions and instructions file |
| `--partials-only` | Only install partials |
| `--skills-only` | Only install skills |
| `--hooks-only` | Only install hooks (PostToolUse validation scripts) |
| `--copy` | Copy skills into each agent dir instead of symlinking to `.agents/skills/` |
| `--dry-run` | Show what would be installed without making changes |

**Examples:**

```bash
# GitHub Copilot — first install
npx @silverassist/agents-toolkit@latest install

# Claude Code — first install
npx @silverassist/agents-toolkit@latest install --claude

# Codex — first install
npx @silverassist/agents-toolkit@latest install --codex
npx @silverassist/agents-toolkit@latest install --target codex
npx @silverassist/agents-toolkit@latest install --target=claude

# Force overwrite all files
npx @silverassist/agents-toolkit@latest install --force
npx @silverassist/agents-toolkit@latest install --claude --force
npx @silverassist/agents-toolkit@latest install --codex --force

# Merge AGENTS.md sections without overwriting
npx @silverassist/agents-toolkit@latest install --codex --instructions-only --append

# Preview without installing
npx @silverassist/agents-toolkit@latest install --dry-run
npx @silverassist/agents-toolkit@latest install --claude --dry-run
npx @silverassist/agents-toolkit@latest install --codex --dry-run

# Filter by tech stack
npx @silverassist/agents-toolkit@latest install --stack react
npx @silverassist/agents-toolkit@latest install --stack wordpress

# Filter by issue tracker
npx @silverassist/agents-toolkit@latest install --tracker github
npx @silverassist/agents-toolkit@latest install --tracker jira

# Combine stack + tracker
npx @silverassist/agents-toolkit@latest install --stack react --tracker github
npx @silverassist/agents-toolkit@latest install --stack wordpress --tracker jira --claude

# Global install (all projects, no per-project setup needed)
npx @silverassist/agents-toolkit@latest install --global
npx @silverassist/agents-toolkit@latest install --global --stack wordpress
npx @silverassist/agents-toolkit@latest update --global
```

### update

Update all prompts to the latest version. **Overwrites existing files and refreshes the skills lockfile** (equivalent to `install --force`).

```bash
npx @silverassist/agents-toolkit@latest update [options]
npx @silverassist/agents-toolkit@latest update --claude
npx @silverassist/agents-toolkit@latest update --codex
```

> ⚠️ **Warning:** This will replace any customizations you've made to the installed files.

### restore

Restore skills from the lockfile. Reads `agents-toolkit-lock.json` and reinstalls all skills with the correct symlinks. Designed for post-clone setup and CI pipelines.

```bash
npx @silverassist/agents-toolkit@latest restore
npx @silverassist/agents-toolkit@latest restore --force   # overwrite existing files
npx @silverassist/agents-toolkit@latest restore --dry-run # preview only
```

> If the lockfile was written by a different package version, `restore` warns but still proceeds.

### status

Check whether installed skills match the lockfile. Useful in CI to detect drift (manually edited skills or stale installs).

```bash
npx @silverassist/agents-toolkit@latest status
```

Exits with code `0` if all skills are up-to-date, `1` if any skill is `missing` or `modified`.

### list

List all available prompts and skills.

```bash
npx @silverassist/agents-toolkit@latest list
```

### Command Comparison

| Scenario | Command |
|----------|---------|
| First time installation (Copilot) | `install` |
| First time installation (Any target) | `install --target <copilot\|claude\|codex>` |
| First time installation (Claude) | `install --claude` |
| First time installation (Codex) | `install --codex` |
| Install once for all projects | `install --global` |
| Update global install | `update --global` |
| Add only new files (keep customizations) | `install` |
| Get latest version (discard customizations) | `update` |
| Update specific category only | `update --prompts-only` |
| Preview what would change | `install --dry-run` |
| Restore skills after clone / CI | `restore` |
| Check if skills are in sync | `status` |

## Partials

Reusable prompt fragments shared between tools:

| Partial | Description |
|---------|-------------|
| `validations.md` | Code quality validation steps |
| `git-operations.md` | Git workflow operations |
| `jira-integration.md` | Jira/Atlassian MCP operations |
| `github-integration.md` | GitHub issue operations (MCP) |
| `documentation.md` | Documentation standards |
| `pr-template.md` | Pull request templates (GitHub Issues + Jira) |

## Instructions

File-type specific guidelines applied automatically by Copilot and available as shared references for Claude/Codex:

| Instruction | Applies To | Description |
|-------------|------------|-------------|
| `typescript.instructions.md` | `*.ts, *.tsx` | TypeScript best practices |
| `react-components.instructions.md` | `*.tsx` | React component patterns |
| `server-actions.instructions.md` | `**/actions/*.ts` | Next.js Server Actions |
| `tests.instructions.md` | `*.test.ts, *.test.tsx` | Testing patterns |
| `css-styling.instructions.md` | `*.css, *.tsx` | Tailwind CSS & shadcn/ui standards |

## Skills

Specialized knowledge guides for domain-specific patterns:

| Skill | Description |
|-------|-------------|
| `component-architecture` | React component patterns, folder structure, naming conventions |
| `domain-driven-design` | DDD principles, domain organization, barrel exports |
| `testing-patterns` | Jest + RTL patterns for Next.js 15 and Server Actions |

Skills follow the [`npx skills`](https://github.com/vercel-labs/skills) standard: the real files live once in the canonical `.agents/skills/` store, and each agent's `skills/` directory symlinks to it (single source of truth, easy updates). Pass `--copy` to materialize real copies instead.

**GitHub Copilot** — skills are symlinked into `.github/skills/`. Reference a skill explicitly:

```
@workspace Use the component-architecture skill to create a new payment form
```

**Claude Code** — skills are symlinked into `.claude/skills/`, where Claude Code reads them natively, and can be referenced in any prompt or command.

**Codex** — skills are symlinked into `.github/skills/` and can be referenced from `AGENTS.md` and task context.

### Skills Lockfile

When skills are installed, a `agents-toolkit-lock.json` file is written to the project root. This lockfile records each installed skill with its SHA-256 hash (same algorithm used by `npx skills`), allowing teammates and CI pipelines to restore the exact same skill files without committing them to the repository.

**Recommended `.gitignore` entries** (automatically appended by `install`):

```gitignore
# agents-toolkit managed — regenerate with: npx @silverassist/agents-toolkit restore
.agents/skills/
.github/skills/
.claude/skills/
```

**Workflow:**

```bash
# Developer A — installs and commits only the lockfile
npx @silverassist/agents-toolkit@latest install
git add agents-toolkit-lock.json
git commit -m "chore: add agents-toolkit skills"

# Developer B / CI — after cloning, restores skills from the lockfile
npx @silverassist/agents-toolkit@latest restore

# Check sync status in CI
npx @silverassist/agents-toolkit@latest status   # exits 1 if any skill is missing/modified

# Update skills to latest package version
npx @silverassist/agents-toolkit@latest update   # rewrites lockfile with new hashes
```

## Hooks

PostToolUse hooks run automatically after GitHub Copilot edits files. They provide real-time validation and formatting without manual intervention.

| Hook | Trigger | Description |
|------|---------|-------------|
| `validate-tsx` | `*.tsx` in `components/` | Validates kebab-case folders, `index.tsx` naming, default export, and Props interface |
| `lint-format` | `*.ts, *.tsx, *.js, *.jsx, *.css` | Runs ESLint `--fix` and Prettier `--write` on the modified file |

Hooks are installed to:

- **Project** (default): `.github/hooks/`
- **Global** (`--global`): `~/.copilot/hooks/`

```
.github/hooks/              # or ~/.copilot/hooks/ for global
├── validate-tsx.json       # Hook config (PostToolUse trigger)
├── lint-format.json        # Hook config (PostToolUse trigger)
└── scripts/
    ├── validate-tsx.sh     # Validation logic (exit 1 = warning)
    └── lint-format.sh      # Auto-fix logic (always exit 0)
```

Install only hooks:

```bash
# Project-level (hooks apply to this project only)
npx @silverassist/agents-toolkit@latest install --hooks-only

# Global (hooks apply to all Copilot sessions)
npx @silverassist/agents-toolkit@latest install --hooks-only --global
```

> **How hook paths resolve.** Copilot runs a hook `command` from the workspace root, not
> the hooks directory. Each generated config therefore sets a `cwd` so `scripts/<name>.sh`
> resolves: `.github/hooks` (relative, portable) for project installs and the absolute hooks
> path for global installs. Configs also declare the required `version: 1` field. If you
> installed hooks with an older version and see `scripts/<name>.sh: No such file or directory`,
> re-run the install with `--force` to regenerate the configs.

## Agent Instructions Files

### AGENTS.md (Copilot/Codex Agent)

Installed at the project root. Contains mandatory instructions for the coding agent working on issues autonomously:

- 4-phase workflow: Analysis → Planning → Implementation → Documentation
- Code conventions, React patterns, testing requirements, git guidelines

### CLAUDE.md (Claude Code)

Installed at the project root with `--claude`. Contains project-wide instructions for Claude Code:

- Same 4-phase workflow adapted for Claude Code conventions
- Slash commands reference table
- Code conventions, React patterns, git guidelines

## Requirements

- Node.js 18+
- Git installed and configured
- **For Jira tracker:** Atlassian MCP configured (see below)
- **For GitHub tracker:** GitHub MCP configured (see below)
- **For GitHub Copilot:** VS Code with GitHub Copilot extension
- **For Claude Code:** Claude Code CLI or VS Code extension
- **For Codex:** Codex CLI/session running at project root

### MCP Server Configuration

The Jira and GitHub workflow prompts rely on MCP servers to read/write tickets and pull requests.
Add a `.mcp.json` file to your project root (or use VS Code's MCP settings) to register the servers:

```json
{
  "servers": {
    "atlassian": {
      "type": "http",
      "url": "https://mcp.atlassian.com/v1/mcp"
    },
    "github": {
      "type": "http",
      "url": "https://api.githubcopilot.com/mcp/"
    }
  }
}
```

> You only need to include the server(s) matching your `--tracker` choice.
> The Atlassian MCP uses OAuth — authenticate once with `npx @atlassian/mcp-server auth` or via the VS Code MCP UI.
> The GitHub MCP is authenticated automatically when you are signed in to GitHub Copilot.

## License

[PolyForm Noncommercial License 1.0.0](https://github.com/SilverAssist/agents-toolkit/blob/main/LICENSE)

## Links

- [GitHub Repository](https://github.com/SilverAssist/agents-toolkit)
- [npm Package](https://www.npmjs.com/package/@silverassist/agents-toolkit)
- [GitHub Copilot Documentation](https://docs.github.com/en/copilot)
- [Claude Code Documentation](https://docs.anthropic.com/en/docs/claude-code)
