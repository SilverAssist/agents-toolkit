# @silverassist/agents-toolkit

Reusable AI agent prompts for development workflows — supports **GitHub Copilot**, **Claude Code**, and **Codex** with multi-stack and multi-tracker filtering.

[![npm version](https://img.shields.io/npm/v/@silverassist/agents-toolkit.svg)](https://www.npmjs.com/package/@silverassist/agents-toolkit)
[![License](https://img.shields.io/badge/license-PolyForm%20Noncommercial-blue.svg)](https://github.com/SilverAssist/agents-toolkit/blob/main/LICENSE)

## Features

- ✅ **Complete Workflow Prompts**: From ticket analysis to PR merge
- ✅ **Multi-Agent Support**: Works with GitHub Copilot, Claude Code, and Codex
- ✅ **Multi-Stack Filtering**: Install only React or WordPress content with `--stack`
- ✅ **Multi-Tracker Support**: Choose GitHub Issues or Jira workflows with `--tracker`
- ✅ **Modular Partials**: Reusable prompt fragments
- ✅ **Customizable**: Easy to extend and modify
- ✅ **CLI Tool**: Quick installation in any project

## Installation

**For GitHub Copilot:**

```bash
npx @silverassist/agents-toolkit@latest install
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
│   └── ...
├── instructions/
│   ├── typescript.instructions.md
│   ├── react-components.instructions.md
│   ├── server-actions.instructions.md
│   ├── tests.instructions.md
│   └── css-styling.instructions.md
└── skills/
    ├── component-architecture/
    ├── domain-driven-design/
    └── testing-patterns/
```

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
.claude/
└── commands/
    ├── _partials/
    ├── analyze-ticket.md
    ├── create-plan.md
    ├── work-ticket.md
    └── ...
.github/
├── instructions/                     # Shared with Copilot
└── skills/                           # Shared with Copilot
```

**Running commands in Claude Code:**

Type `/` in the chat to see all available slash commands:

```
/analyze-ticket
/work-ticket
/create-pr
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
│   └── ...
├── instructions/
│   ├── typescript.instructions.md
│   ├── react-components.instructions.md
│   ├── server-actions.instructions.md
│   ├── tests.instructions.md
│   └── css-styling.instructions.md
└── skills/
    ├── component-architecture/
    ├── domain-driven-design/
    └── testing-patterns/
```

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
| `create-pr` | Create a pull request | `{ticket-id}` | Jira |
| `finalize-pr` | Finalize and merge PR | `{ticket-id}` | Jira |

### Utility

| Prompt / Command | Description | Variables |
|------------------|-------------|-----------|
| `review-code` | Quick code review | — |
| `fix-issues` | Fix lint/type/test errors | — |
| `add-tests` | Add tests for components | `{target-file}` |

### Workflow Stages

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

## CLI Reference

### install

Install prompts into your project. **Does not overwrite existing files by default** — safe to run multiple times.

```bash
npx @silverassist/agents-toolkit@latest install [options]
```

| Option | Description |
|--------|-------------|
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
```

### update

Update all prompts to the latest version. **Overwrites existing files** (equivalent to `install --force`).

```bash
npx @silverassist/agents-toolkit@latest update [options]
npx @silverassist/agents-toolkit@latest update --claude
npx @silverassist/agents-toolkit@latest update --codex
```

> ⚠️ **Warning:** This will replace any customizations you've made to the installed files.

### list

List all available prompts and skills.

```bash
npx @silverassist/agents-toolkit@latest list
```

### Command Comparison

| Scenario | Command |
|----------|---------|
| First time installation (Copilot) | `install` |
| First time installation (Any target) | `install --target <copilot|claude|codex>` |
| First time installation (Claude) | `install --claude` |
| First time installation (Codex) | `install --codex` |
| Add only new files (keep customizations) | `install` |
| Get latest version (discard customizations) | `update` |
| Update specific category only | `update --prompts-only` |
| Preview what would change | `install --dry-run` |

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

**GitHub Copilot** — reference a skill explicitly:

```
@workspace Use the component-architecture skill to create a new payment form
```

**Claude Code** — skills are stored in `.github/skills/` and can be referenced in any prompt or command.

**Codex** — skills are stored in `.github/skills/` and can be referenced from `AGENTS.md` and task context.

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
- **For Jira tracker:** Atlassian MCP configured
- **For GitHub tracker:** GitHub MCP configured
- **For GitHub Copilot:** VS Code with GitHub Copilot extension
- **For Claude Code:** Claude Code CLI or VS Code extension
- **For Codex:** Codex CLI/session running at project root

## License

[PolyForm Noncommercial License 1.0.0](https://github.com/SilverAssist/agents-toolkit/blob/main/LICENSE)

## Links

- [GitHub Repository](https://github.com/SilverAssist/agents-toolkit)
- [npm Package](https://www.npmjs.com/package/@silverassist/agents-toolkit)
- [GitHub Copilot Documentation](https://docs.github.com/en/copilot)
- [Claude Code Documentation](https://docs.anthropic.com/en/docs/claude-code)
