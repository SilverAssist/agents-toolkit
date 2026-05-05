---
agent: agent
description: Start working on a Jira ticket with full workflow setup
---

# Work on Jira Ticket

Start working on Jira ticket **{ticket-id}** with complete workflow setup.

## Prerequisites
- Atlassian MCP connection required
- Reference: `.github/prompts/_partials/jira-integration.md`
- Reference: `.github/prompts/_partials/git-operations.md`

## Steps

### 1. Verify Jira Access
- Use `getAccessibleAtlassianResources` to confirm connectivity
- Get the correct cloud ID

### 2. Read Complete Ticket

Fetch ticket **{ticket-id}** with all details:
- Summary and description
- Issue type and priority
- Current status
- All comments for context
- Acceptance criteria

### 3. Analyze Project Context

Read project conventions:
- `AGENTS.md` - Main agent workflow guidelines
- `.github/copilot-instructions.md` - Additional project guidelines (if present)
- `.github/instructions/` - File-type specific instructions
- `docs/` - Related documentation

### 4. Analyze Technical Impact

Search codebase for:
- Related components
- Existing patterns
- Files to modify
- Dependencies

### 5. Create Work Plan

Create planning document at `docs/{feature-name}-plan.md`:
- Problem statement
- Current architecture
- Proposed changes
- Phase breakdown
- Testing strategy

### 6. Create Working Branch

Resolve base branch from config, then branch from latest base:
```bash
BASE_BRANCH=$(node -e "try{const c=require('./.copilot-prompts.json');console.log(c.pr?.targetBranch||c.git?.defaultBranch||'main')}catch{console.log('main')}")
git checkout "$BASE_BRANCH"
git pull origin "$BASE_BRANCH"
git checkout -b feature/{ticket-id}-short-description
# or for bugs:
git checkout -b bugfix/{ticket-id}-short-description
```

### 7. Initial Commit

```bash
git add docs/{feature-name}-plan.md
git commit -m "{ticket-id}: Add implementation plan"
```

### 8. Update Jira Ticket

Add comment with development started:
```markdown
## Development Started
- Branch: `feature/{ticket-id}-description`
- Plan: `docs/{feature-name}-plan.md`

## Phases
- [ ] Phase 1: ...
- [ ] Phase 2: ...
```

## Output

Report:
1. ✅ Jira ticket summary
2. ✅ Branch created
3. ✅ Planning document created
4. ✅ Ready to start implementation

## Next Steps
- Begin implementation following the plan
- Use `prepare-pr` when ready for review
- Use `create-pr` to submit pull request
