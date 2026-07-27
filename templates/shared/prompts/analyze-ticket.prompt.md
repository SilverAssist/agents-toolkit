---
agent: agent
description: Analyze a Jira ticket without creating branches or making changes
model:
  - Claude Haiku 4.5 (copilot)
  - GPT-5 mini (copilot)
---

# Analyze Jira Ticket

> **Model:** Default cheap tier (`Claude Haiku 4.5` → `GPT-5 mini`). The `model:` pin wins over the Copilot picker and Claude `/model` (both are only consulted when no `model:` is set). To change it, edit this file's frontmatter or reinstall with `--model-pins off` (strips all pins so the picker/session default wins) or `.agents-toolkit.json` `models.{copilot,claude}` overrides. Codex has no per-prompt field, so `codex --model` is the effective session-level override there.

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