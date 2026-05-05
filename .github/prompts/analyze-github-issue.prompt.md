---
agent: agent
description: Analyze a GitHub issue without creating branches or making changes
---

# Analyze GitHub Issue

Analyze GitHub issue **#{issue-number}** in repository **{owner}/{repo}** and provide a comprehensive assessment without making any code changes.

## Prerequisites

- GitHub MCP connection or `gh` CLI required
- Reference: `.github/prompts/_partials/github-integration.md`

## Steps

### 1. Fetch Issue Details

- Use `mcp_github_github_issue_read` with the issue number, or `gh issue view {issue-number} | cat`
- Read: title, body, labels, assignees, milestone, and linked pull requests
- Read all comments for additional context and discussion

### 2. Analyze Codebase Impact

- Search the codebase for related components, files, and patterns
- Identify files likely to be created or modified
- Check for existing implementations or patterns that should be followed
- Review project conventions (README, copilot-instructions.md, existing architecture)

### 3. Check Related Issues

- Search for related or dependent issues using labels or keywords
- Identify blockers or prerequisites
- Note any duplicate or overlapping issues

### 4. Generate Report

Provide the following structured analysis:

#### Summary
Brief overview of what needs to be done.

#### Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

(Extract from issue body if present, or derive from the description)

#### Technical Impact
| Area | Files/Components | Impact Level |
|------|------------------|--------------|
| Components | list | High/Medium/Low |
| Tests | list | High/Medium/Low |
| Config | list | High/Medium/Low |

#### Complexity Estimate
- **Level**: Simple / Medium / Complex
- **Estimated effort**: X hours/days
- **Reasoning**: Why this complexity level

#### Risks & Blockers
- Risk 1: Description and mitigation
- Risk 2: Description and mitigation

#### Dependencies
- Related issues: #X, #Y
- External dependencies: packages, services
- Prerequisites that must be completed first

## Output Format

Present findings in a clear, structured format that can be referenced during implementation. Do NOT create branches, write code, or make any changes — analysis only.
