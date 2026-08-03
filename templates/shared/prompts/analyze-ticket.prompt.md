---
agent: agent
description: Analyze a Jira ticket without creating branches or making changes
model: Claude Haiku 4.5
---

# Analyze Jira Ticket

> **Model:** Cheap tier — `Claude Haiku 4.5` on Copilot, `haiku` on Claude Code (read and summarize). To change it, edit the `model:` line in this file's frontmatter; the pin wins over the Copilot picker and Claude `/model`. Codex ignores `model:` — set the session model with `codex --model`.

Analyze Jira ticket **{ticket-id}** and provide a comprehensive assessment without making any code changes.

## Prerequisites

- Atlassian MCP connection is required
- Reference: `.github/prompts/_partials/jira-integration.md`

## Steps

### 1. Verify Jira Access

- Use `getAccessibleAtlassianResources` to confirm connectivity
- Get the correct cloud ID for subsequent calls

### 2. Fetch Ticket Details

- Use `getJiraIssue` with ticket **{ticket-id}**
- Request fields: `summary`, `description`, `status`, `issuetype`, `priority`, `assignee`
- Read all comments for additional context

### 3. Analyze Codebase Impact

- Search the codebase for related components
- Identify files likely to be modified
- Check for existing implementations or patterns

### 4. Generate Report

Provide the following structured analysis:

#### 📋 Summary

Brief overview of what needs to be done.

#### ✅ Acceptance Criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

#### 🔍 Technical Impact

| Area | Files/Components | Impact Level |
|------|------------------|--------------|
| Components | list | High/Medium/Low |
| Actions | list | High/Medium/Low |
| Types | list | High/Medium/Low |

#### 📊 Complexity Estimate

- **Level**: Simple / Medium / Complex
- **Estimated time**: X hours/days
- **Reasoning**: Why this complexity level

#### ⚠️ Risks & Blockers

- Risk 1: Description and mitigation
- Risk 2: Description and mitigation

#### 🔗 Related

- Related tickets or documentation
- Similar implementations in codebase

## Output Format

Present findings in a clear, structured format that can be referenced during implementation.
