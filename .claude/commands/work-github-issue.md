---
agent: agent
description: Start working on a GitHub issue with full workflow setup
---

# Work on GitHub Issue

Start working on GitHub issue **#{issue-number}** in repository **{owner}/{repo}** with complete workflow setup.

## Prerequisites

- GitHub MCP connection or `gh` CLI required
- Reference: `.github/prompts/_partials/github-integration.md`
- Reference: `.github/prompts/_partials/git-operations.md`

## Steps

### 1. Read Complete Issue

Fetch issue **#{issue-number}** with all details:
- Title and description
- Labels and priority
- Current state
- All comments for context
- Acceptance criteria

### 2. Analyze Project Context

Read project conventions:
- `AGENTS.md` — Agent instructions (Copilot/Codex)
- `CLAUDE.md` — Agent instructions (Claude Code)
- `copilot-instructions.md` or `.github/copilot-instructions.md` — Project guidelines
- `.github/instructions/` — File-type specific instructions
- `docs/` — Related documentation

### 3. Analyze Technical Impact

Search codebase for:
- Related components
- Existing patterns
- Files to modify
- Dependencies

### 4. Create Work Plan

Create planning document at `docs/{feature-name}-plan.md`:
- Problem statement
- Current architecture
- Proposed changes
- Phase breakdown
- Testing strategy

### 5. Create Working Branch

From latest `main`:
```bash
git checkout main
git pull origin main
git checkout -b feature/{issue-number}-short-description
# or for bugs:
git checkout -b fix/{issue-number}-short-description
```

### 6. Initial Commit

```bash
git add docs/{feature-name}-plan.md
git commit -m "docs: Add implementation plan for #{issue-number}"
```

### 7. Update GitHub Issue

Add comment to the issue:
```markdown
## Development Started
- Branch: `feature/{issue-number}-description`
- Plan: `docs/{feature-name}-plan.md`

## Phases
- [ ] Phase 1: ...
- [ ] Phase 2: ...
```

## Output

Report:
1. ✅ Issue summary
2. ✅ Branch created
3. ✅ Planning document created
4. ✅ Ready to start implementation

## Next Steps

- Begin implementation following the plan
- Use `prepare-pr` when ready for review
- Use `create-github-pr` to submit pull request
