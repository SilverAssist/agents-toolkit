# GitHub Integration Partial

Reusable GitHub issue and PR operations for prompts.

## Usage

Include these steps in prompts that require GitHub integration.

---

## Issue Operations

### Step: Read GitHub Issue

1. **Fetch issue details**:
   - Use `mcp_github_github_issue_read` with owner, repo, and issue number
   - Or use `gh issue view <number> | cat` via terminal

2. **Extract key information**:
   - **Title**: Issue title
   - **Body**: Full description and context
   - **Labels**: Category and priority labels
   - **Assignees**: Who is responsible
   - **Milestone**: Target milestone if set
   - **State**: Open / Closed

3. **Read issue comments**:
   - Fetch all comments for additional context
   - Note any clarifications or updates from maintainers

4. **Identify acceptance criteria**:
   - Look in body for "Acceptance Criteria" section
   - List all checkable requirements

---

### Step: Search Related Issues

1. **Search by label**:
   - Use `gh issue list --label "<label>" | cat`
   - Find related issues in the same phase or category

2. **Search by keyword**:
   - Use `gh search issues "<keyword>" --repo owner/repo | cat`
   - Find duplicates or related work

---

## Issue Update Operations

### Step: Add Comment to Issue

1. **Add progress comment**:
   - Use `gh issue comment <number> --body "message" | cat`
   - Include relevant links (PR, branch, etc.)
   - Use Markdown formatting for readability

2. **Comment templates**:
   ```markdown
   ## Development Started
   - Branch: `feature/<number>-description`
   - PR: [Link to PR]

   ## Progress
   - [x] Initial implementation
   - [ ] Tests
   - [ ] Documentation
   ```

---

### Step: Close Issue

1. **Close with comment**:
   - Use `gh issue close <number> --comment "Completed in PR #XX" | cat`

2. **Close as not planned**:
   - Use `gh issue close <number> --reason "not planned" --comment "Reason" | cat`

---

## Issue Analysis

### Step: Analyze Issue Impact

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
