# Prompts / Commands

Reusable prompt templates for AI agent workflows — compatible with **GitHub Copilot** (VS Code), **Claude Code**, and **Codex**.

## Overview

This package provides a collection of modular, reusable prompts for common development workflows. Each prompt integrates with Jira via the Atlassian MCP.

- **GitHub Copilot**: files live in `.github/prompts/` with `.prompt.md` extension
- **Claude Code**: files live in `.claude/commands/` with `.md` extension (auto-converted by the CLI)
- **Codex**: prompts live in `.github/prompts/` as reusable workflow references

## Structure

```
prompts/
├── README.md                    # This documentation
├── _partials/                   # Shared prompt fragments
│   ├── README.md               # Partials documentation
│   ├── validations.md          # Code quality validation steps
│   ├── git-operations.md       # Git workflow operations
│   ├── jira-integration.md     # Jira/Atlassian MCP operations
│   ├── documentation.md        # Documentation standards
│   └── pr-template.md          # Pull request templates
│
├── # Workflow Prompts
├── analyze-ticket.prompt.md         # Analyze a Jira ticket
├── analyze-github-issue.prompt.md   # Analyze a GitHub issue
├── create-plan.prompt.md            # Create implementation plan
├── work-ticket.prompt.md            # Start working on a Jira ticket
├── work-github-issue.prompt.md      # Start working on a GitHub issue
├── prepare-pr.prompt.md             # Prepare code for PR
├── create-pr.prompt.md              # Create a pull request (Jira)
├── create-github-pr.prompt.md       # Create a pull request (GitHub)
├── finalize-pr.prompt.md            # Finalize and merge PR (Jira)
├── finalize-github-pr.prompt.md     # Finalize and merge PR (GitHub)
├── prepare-github-release.prompt.md # Prepare a GitHub release
│
├── # Utility Prompts
├── review-code.prompt.md            # Quick code review
├── fix-issues.prompt.md             # Fix lint/type/test errors
├── add-tests.prompt.md              # Add tests for components
├── audit-ai-seo.prompt.md           # Audit a page for AI Search / agent-friendliness
├── resolve-github-reviews.prompt.md # Fetch/reply/resolve GitHub PR review threads
│
└── # WordPress Prompts
    ├── new-wp-component.prompt.md    # Scaffold a WordPress plugin component
    ├── new-wp-plugin.prompt.md       # Scaffold a WordPress plugin
    └── quality-check.prompt.md       # Run PHPCS / PHPStan / PHPUnit
```

## Model tiers

Every shipped prompt carries an explicit `model:` pin so a fresh install runs cost-optimally with no configuration at all. The pins are **hardcoded in the files** — there is no tier config, no CLI flag, and nothing to resolve at install time. **To change a tier, edit the `model:` line in the installed file.** That is the whole mechanism, and it is deliberate: a model picker spanning three agents whose model catalogues move independently would cost more to maintain than it saves.

| Tier | Copilot / Codex | Claude Code | Used for |
| --- | --- | --- | --- |
| **Cheap** | `Claude Haiku 4.5` | `haiku` | Checklist / mechanical work — 13 prompts |
| **Smart** | `Claude Sonnet 5` | `sonnet` | Design / reasoning work — 6 prompts |

| Prompt | Tier | Rationale |
| --- | --- | --- |
| `analyze-ticket`, `analyze-github-issue` | Cheap | Read + summarize |
| `add-tests`, `audit-ai-seo`, `fix-issues`, `review-code` | Cheap | Deterministic checklists |
| `new-wp-component`, `new-wp-plugin`, `quality-check` | Cheap | Scaffolding / tool runs |
| `prepare-pr`, `prepare-github-release`, `finalize-pr`, `finalize-github-pr` | Cheap | Validation + git/gh mechanics |
| `create-plan` | Smart | Real design reasoning |
| `work-ticket`, `work-github-issue` | Smart | Implementation orchestration |
| `create-pr`, `create-github-pr` | Smart | PR authoring + review orchestration |
| `resolve-github-reviews` | Smart | The *fix* step needs reasoning |

### How each agent reads the pin

- **Claude Code** — the installer rewrites the Copilot model name to the matching alias, so `Claude Haiku 4.5` installs as `model: haiku`. Aliases track the current generation, so they do not go stale. The pin **wins over `/model`**, which is only consulted when no `model:` is set.
- **Copilot** — the pin is used as shipped. It **wins over the picker**, which is only consulted when no `model:` is set. Note that only `.prompt.md` files establish a model boundary: skills inherit the invoking prompt's model, so an inline `core-review` from a smart-tier orchestrator runs smart. Invoke the skill as a standalone chat to keep it cheap.
- **Codex** — `model:` is **ignored entirely**; the session runs whatever `codex --model` set. The field is left in place because the Codex installer copies these same shared templates into the same `.github/prompts/` directory Copilot uses, so the frontmatter Copilot needs is simply along for the ride; it produces a non-blocking lint warning and nothing else.

Because the pin is a single scalar, an unavailable model falls back to the agent's own default rather than to a second entry — the toolkit does not ship fallback chains. A prioritized `model:` array is undocumented for prompt files and is rejected outright by GitHub Copilot CLI.

## Workflow Stages

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

## Usage

### GitHub Copilot (VS Code)

1. Open the Command Palette (`Cmd+Shift+P`)
2. Search for "GitHub Copilot: Run Prompt"
3. Select the desired prompt
4. Fill in the required variables (e.g., `{ticket-id}`)

### Claude Code

Type `/` in the chat to open the command palette and select the desired command:

```
/analyze-ticket
/work-ticket
/create-pr
```

### Codex

Run Codex from the project root after installing with `--codex`. Use prompts in `.github/prompts/` as workflow templates and task checklists.

### Variables

Each prompt may require input variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `{ticket-id}` | Jira ticket identifier | `WEB-726` |
| `{feature-description}` | Brief feature description | `Add font size controls` |
| `{feature-name}` | Kebab-case feature name | `font-accessibility` |

## Customization

### Adding Custom Prompts

1. Create a new `.prompt.md` file
2. Use the frontmatter format:

   ```markdown
   ---
   agent: agent
   description: Brief description of the prompt
   ---
   
   Your prompt content here...
   ```

### Frontmatter Options

| Field | Description |
|-------|-------------|
| `description` | A short description of the prompt |
| `name` | The name shown after typing `/` in chat (defaults to filename) |
| `agent` | The agent to use: `ask`, `edit`, `agent`, or custom agent name |
| `model` | Language model to use (defaults to selected model) |
| `tools` | List of tools available for this prompt |

### Using Partials

Reference shared fragments in your prompts:

```markdown
## Prerequisites
- Reference: `.github/prompts/_partials/validations.md`
```

## Integration

### Required Tools/MCPs

- **Atlassian MCP**: For Jira ticket operations
- **Git**: For version control operations
- **npm/Node.js**: For running validations
