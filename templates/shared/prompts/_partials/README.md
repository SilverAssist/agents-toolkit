# Prompts Partials Index

This directory contains reusable prompt fragments that can be referenced in main prompts.

## Available Partials

| Partial | Description | Use Case |
|---------|-------------|----------|
| `validations.md` | Code quality validation steps | Pre-PR checks, CI validation |
| `git-operations.md` | Git workflow operations | Branch management, commits |
| `jira-integration.md` | Jira/Atlassian MCP operations | Ticket reading, updates |
| `documentation.md` | Documentation standards | JSDoc, README, planning docs |
| `pr-template.md` | Pull request templates | PR creation, review |

## How to Reference

In your prompt files, reference partials like this:

```markdown
## Prerequisites
- Reference: `.github/prompts/_partials/validations.md`
```

The agent will read the referenced partial when needed.

## Creating New Partials

1. Create a new `.md` file in this directory
2. Use clear section headings with `###`
3. Include reusable steps with `Step:` prefix
4. Add this file to the README table
5. Reference from main prompts as needed

## Partial Structure

```markdown
# Partial Name

Description of what this partial provides.

## Usage
When and how to use this partial.

---

## Section 1

### Step: Step Name
1. First action
2. Second action
3. Third action

---

## Section 2
...
```
