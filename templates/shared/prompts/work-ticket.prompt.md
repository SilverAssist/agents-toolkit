---
agent: agent
description: Start working on a Jira ticket with full workflow setup
model: Claude Sonnet 5
---

# Work on Jira Ticket

> **Model:** Smart tier — `Claude Sonnet 5` on Copilot, `sonnet` on Claude Code (implementation orchestration). To change it, edit the `model:` line in this file's frontmatter; the pin wins over the Copilot picker and Claude `/model`. Codex ignores `model:` — set the session model with `codex --model`.

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

Create planning document at `docs/{feature-name}-plan.md`.

**Its first line must be the removal marker**, exactly:

```markdown
<!-- agents-toolkit:planning-doc ticket={ticket-id} -->
```

`create-pr` / `create-github-pr` delete the plan at PR time by grepping for this marker, and
they delete **nothing** without it — a plan written without the marker survives into the base
branch. The marker, not the filename, is what identifies the file as temporary, so a legitimate
deliverable like `docs/rollout-plan.md` is never at risk.

Then the body:

- Problem statement
- Current architecture
- Proposed changes
- Phase breakdown
- Testing strategy

### 6. Create Working Branch

Resolve base branch from config, then branch from latest base:

```bash
BASE_BRANCH=$(node -e "try{const c=require('./.agents-toolkit.json');console.log(c.pr?.targetBranch||c.git?.defaultBranch||'main')}catch{console.log('main')}")
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
