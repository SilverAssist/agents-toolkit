# Jira Integration Partial

Reusable Jira/Atlassian MCP operations for prompts.

## Usage

Include these steps in prompts that require Jira integration.

---

## Ticket Operations

### Step: Verify Jira Access

1. **Test MCP connectivity**:
   - Use Atlassian MCP `getAccessibleAtlassianResources` to verify access
   - Confirm the correct cloud ID is available

---

### Step: Read Jira Ticket

1. **Fetch ticket details**:
   - Use `getJiraIssue` with the ticket ID
   - Request fields: `summary`, `description`, `status`, `issuetype`, `priority`

2. **Extract key information**:
   - **Summary**: Main ticket title
   - **Description**: Full details and context
   - **Issue Type**: Feature, Bug, Task, etc.
   - **Priority**: Critical, High, Medium, Low
   - **Status**: Current workflow state

3. **Read ticket comments**:
   - Fetch all comments for additional context
   - Note any clarifications or updates

4. **Identify acceptance criteria**:
   - Look in description for "Acceptance Criteria" section
   - List all checkable requirements

---

### Step: Search Jira

1. **Search using Rovo**:
   - Use `search` tool for natural language queries
   - Find related tickets or documentation

2. **Search using JQL** (advanced):
   - Use `searchJiraIssuesUsingJql` for specific queries
   - Example: `project = WEB AND status = "In Progress"`

---

## Update Operations

### Step: Add Comment to Ticket

1. **Add progress comment**:
   - Use `addCommentToJiraIssue`
   - Include relevant links (PR, branch, etc.)
   - Use Markdown formatting for readability

2. **Comment templates**:
   ```markdown
   ## Development Started
   - Branch: `feature/WEB-XXX-description`
   - PR: [Link to PR]
   
   ## Progress
   - [x] Initial implementation
   - [ ] Tests
   - [ ] Documentation
   ```

---

### Step: Transition Ticket Status

1. **Get available transitions**:
   - Use `getTransitionsForJiraIssue` to see valid next states

2. **Transition ticket**:
   - Use `transitionJiraIssue` with the transition ID
   - Common transitions:
     - "In Progress" → Development started
     - "In Review" → PR created
     - "Ready for QA" → PR merged
     - "Done" → Verified and complete

---

### Step: Link PR to Ticket

1. **Add PR comment**:
   ```markdown
   ## Pull Request
   - PR Link: [PR Title](PR_URL)
   - Target: `dev` branch
   - Reviewers: @team-member
   ```

2. **The Bitbucket-Jira integration** will automatically link PRs if:
   - Ticket ID is in branch name
   - Ticket ID is in PR title

---

## Ticket Analysis

### Step: Analyze Ticket Impact

1. **Identify affected areas**:
   - Components that need changes
   - Files likely to be modified
   - Dependencies and integrations

2. **Estimate complexity**:
   - **Simple**: 1-2 files, straightforward change
   - **Medium**: 3-5 files, some logic changes
   - **Complex**: 6+ files, architectural changes

3. **Identify risks**:
   - Breaking changes
   - Migration requirements
   - External dependencies
   - Testing complexity

---

## Common JQL Queries

| Purpose | JQL Query |
|---------|-----------|
| My open tickets | `assignee = currentUser() AND status != Done` |
| Sprint tickets | `project = WEB AND sprint in openSprints()` |
| Recently updated | `project = WEB AND updated >= -7d` |
| Blockers | `project = WEB AND priority = Highest` |
| PR ready | `project = WEB AND status = "In Review"` |

---

## Ticket Workflow States

```
┌──────────┐    ┌─────────────┐    ┌───────────┐
│   Open   │───▶│ In Progress │───▶│ In Review │
└──────────┘    └─────────────┘    └───────────┘
                                         │
                                         ▼
                ┌──────────┐     ┌──────────────┐
                │   Done   │◀────│ Ready for QA │
                └──────────┘     └──────────────┘
```
