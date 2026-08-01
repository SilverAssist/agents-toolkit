---
agent: agent
description: Create a detailed implementation plan for a feature
model: Claude Sonnet 5
---

# Create Implementation Plan

> **Model:** Smart tier — `Claude Sonnet 5` on Copilot, `sonnet` on Claude Code (planning is real design reasoning). To change it, edit the `model:` line in this file's frontmatter; the pin wins over the Copilot picker and Claude `/model`. Codex ignores `model:` — set the session model with `codex --model`.

Create a detailed implementation plan for: **{feature-description}**

## Prerequisites
- Reference: `.github/prompts/_partials/documentation.md` for plan template
- Reference: `AGENTS.md` for agent workflow conventions
- Reference: `.github/copilot-instructions.md` (if present) for additional project conventions

## Steps

### 1. Analyze Request
- Break down the feature into components
- Identify affected areas of the codebase
- Search for related implementations

### 2. Research Current State
- Read relevant source files
- Understand current architecture
- Document existing patterns

### 3. Create Planning Document

Save to: `docs/{feature-name}-plan.md`

**The first line must be the removal marker**, exactly:

```markdown
<!-- agents-toolkit:planning-doc ticket={ticket-id} -->
```

`create-pr` / `create-github-pr` delete the plan at PR time by grepping for this marker, and
they delete **nothing** without it — a plan written without the marker survives into the base
branch. The marker, not the filename, is what identifies the file as temporary, so a legitimate
deliverable like `docs/rollout-plan.md` is never at risk.

Write exactly this, starting at line 1 — the marker must be the **first** line of the file,
with no separator, blank line, or frontmatter above it. The removal step reads only `head -n 1`,
so a plan whose first line is anything else is never cleaned up:

```markdown
<!-- agents-toolkit:planning-doc ticket={ticket-id} -->

# {Feature Name} Implementation Plan

## Problem Statement
What problem are we solving? Why is this change needed?

## Current Architecture
- How does the current system work?
- What components are involved?
- What are the limitations?

## Proposed Changes

### Overview
High-level description of the solution.

### Technical Approach
- Component 1: Changes needed
- Component 2: Changes needed
- New components to create

### API Changes
If applicable, document any API changes.

### Caching Impact (Next.js)
If the feature touches data fetching, routes, or `next.config`, state the caching plan:
- Reads vs. mutations (mutations never cached; reads cache regardless of GET/POST)
- `revalidate` tier + cache `tags` for any new fetches
- Whether new routes export `revalidate`, and any on-demand invalidation (Next.js + CDN) needed

See `.github/instructions/caching.instructions.md`.

## Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Risk 1 | Low/Med/High | Low/Med/High | Strategy |
| Risk 2 | Low/Med/High | Low/Med/High | Strategy |

## Phase Breakdown

### Phase 1: {Phase Name}
**Objective**: What this phase accomplishes

- [ ] Task 1
- [ ] Task 2
- [ ] Task 3

**Validation**: How to verify this phase is complete

### Phase 2: {Phase Name}
**Objective**: What this phase accomplishes

- [ ] Task 1
- [ ] Task 2

**Validation**: How to verify this phase is complete

## Testing Strategy

### Unit Tests
- Test case 1
- Test case 2

### Integration Tests
- Scenario 1
- Scenario 2

### Manual Testing
- Steps to manually verify

## Rollback Plan
How to revert changes if issues arise.

## Dependencies
- External dependencies
- Internal dependencies
- Team coordination needed
```

### 4. Commit Plan

```bash
git add docs/{feature-name}-plan.md
# Prefer Jira-prefixed commit messages when ticket ID is known
git commit -m "{ticket-id}: Add {feature-name} implementation plan"
# Fallback when no ticket ID is available:
# git commit -m "docs: Add {feature-name} implementation plan"
```

## Output
The planning document at `docs/{feature-name}-plan.md` ready for implementation.
