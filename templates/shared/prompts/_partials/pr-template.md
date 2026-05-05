# Pull Request Template Partial

Reusable PR templates and steps for prompts.

## Usage

Include these templates when creating or reviewing pull requests. Choose the format matching your project's issue tracker.

---

## Format A: GitHub Issues (Conventional Commits)

### PR Title Format

```
type: Short description of changes
```

Examples:
- `feat: Add rate limiting middleware`
- `fix: Resolve CORS headers for image requests`
- `refactor: Extract validation into middleware`

### PR Description Template

```markdown
## Description
Brief summary of what this PR accomplishes.

## Related Issue
Closes #ISSUE_NUMBER

## Changes Made
- Change 1: Description
- Change 2: Description
- Change 3: Description

## Type of Change
- [ ] Bug fix (non-breaking change fixing an issue)
- [ ] New feature (non-breaking change adding functionality)
- [ ] Breaking change (fix or feature causing existing functionality to break)
- [ ] Documentation update
- [ ] Refactoring (no functional changes)

## Testing
- [ ] Unit tests added/updated
- [ ] Manual testing performed
- [ ] Integration tests added/updated

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests pass locally
- [ ] No new warnings introduced
```

---

## Format B: Jira Ticket Reference

### PR Title Format

```
{TICKET-ID}: Short description of changes
```

Examples:
- `WEB-726: Add font size accessibility controls`
- `WEB-734: Fix responsive logo sizing in mobile header`
- `WEB-800: Refactor contact form validation`

### PR Description Template

```markdown
## Summary
Brief description of what this PR accomplishes.

## Jira Ticket
[{TICKET-ID}](https://your-org.atlassian.net/browse/{TICKET-ID})

## Changes Made
- Change 1: Description
- Change 2: Description
- Change 3: Description

## Type of Change
- [ ] 🐛 Bug fix (non-breaking change fixing an issue)
- [ ] ✨ New feature (non-breaking change adding functionality)
- [ ] 💥 Breaking change (fix or feature causing existing functionality to break)
- [ ] 📝 Documentation update
- [ ] 🔧 Refactoring (no functional changes)
- [ ] 🧪 Test addition or update

## Testing
Describe how changes were tested:
- [ ] Unit tests added/updated
- [ ] Manual testing performed
- [ ] E2E tests added/updated

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Comments added for complex logic
- [ ] Documentation updated
- [ ] No new warnings introduced
- [ ] Tests pass locally

## Deployment Notes
Any special deployment considerations:
- Database migrations needed
- Environment variables to add
- Cache invalidation required
```

---

## PR Checklist Steps

### Step: Prepare PR Description

1. **Gather information**:
   - Get issue/ticket title and description
   - List all changed files
   - Identify type of change

2. **Fill template sections**:
   - Summary from issue description
   - Link to issue (GitHub `Closes #N` or Jira URL)
   - List key changes made
   - Describe testing performed

3. **Add context**:
   - Screenshots for UI changes
   - Before/after comparisons
   - Architecture diagrams if complex

---

### Step: Set PR Metadata

1. **Title**: `type: description` (GitHub) or `{TICKET-ID}: description` (Jira)
2. **Source branch**: Your feature/fix branch
3. **Target branch**: `main` (or project default from `.agents-toolkit.json`)
4. **Reviewers**: Based on code owners or changed files
5. **Labels**: Match issue labels where appropriate

---

## PR Size Guidelines

| Size | Files Changed | Recommendation |
|------|---------------|----------------|
| Small | 1-5 files | ✅ Ideal |
| Medium | 6-15 files | ⚠️ Acceptable |
| Large | 16+ files | ❌ Consider splitting |

---

## PR Merge Checklist

Before merging:
- [ ] All review comments addressed
- [ ] CI/CD pipeline passes
- [ ] Branch is up-to-date with target
- [ ] No merge conflicts
- [ ] Documentation complete
- [ ] Issue linked and will auto-close

## PR Size Guidelines

| Size | Files Changed | Recommendation |
|------|---------------|----------------|
| Small | 1-5 files | ✅ Ideal |
| Medium | 6-15 files | ⚠️ Acceptable |
| Large | 16+ files | ❌ Consider splitting |

**Tips for large PRs**:
- Split into multiple smaller PRs
- Create base branch for related changes
- Use feature flags for partial releases

---

## Common PR Comments

### Request Changes
```markdown
**Suggestion:** Consider using X instead of Y because...

**Issue:** This could cause Z problem in edge case...

**Question:** What happens when...?
```

### Approval
```markdown
✅ LGTM! 

Reviewed:
- Code quality
- Test coverage
- Documentation
```

---

## PR Merge Checklist

Before merging:
- [ ] All review comments addressed
- [ ] CI/CD pipeline passes
- [ ] Branch is up-to-date with target
- [ ] No merge conflicts
- [ ] Documentation complete
- [ ] Jira ticket updated
