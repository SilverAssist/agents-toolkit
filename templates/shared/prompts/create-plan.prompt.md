---
agent: agent
description: Create a detailed implementation plan for a feature
---

# Create Implementation Plan

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

Include these sections:

---

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

---

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
