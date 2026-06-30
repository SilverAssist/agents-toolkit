---
agent: agent
description: Quick code review of current changes
---

# Quick Code Review

Perform a quick code review of the current changes.

## Steps

### 1. Get Changed Files

```bash
git diff --name-only HEAD~1
# or for unstaged changes:
git diff --name-only
```

### 2. Review Each File

For each changed file:

#### Code Quality
- [ ] No `console.log` or debug statements
- [ ] No `any` types
- [ ] No hardcoded values (use constants)
- [ ] No commented-out code

#### Style & Conventions
- [ ] Follows project naming conventions
- [ ] Imports organized alphabetically
- [ ] Proper TypeScript types
- [ ] Consistent formatting

#### Logic
- [ ] No nested ternaries
- [ ] Early returns used appropriately
- [ ] Error handling in place
- [ ] Edge cases considered

#### Documentation
- [ ] JSDoc on new functions
- [ ] Complex logic has comments
- [ ] Props interfaces documented

### 3. Security Check

- [ ] No sensitive data (API keys, secrets)
- [ ] No exposed credentials
- [ ] No unsafe user input handling

### 4. Performance

- [ ] No unnecessary re-renders (React)
- [ ] Efficient data structures
- [ ] No memory leaks potential

### 5. Caching & Data Fetching (Next.js)

> See `.github/instructions/caching.instructions.md`. Caching is decided by **read-vs-mutation**, not the HTTP method.

- [ ] Reads cache regardless of method — a `POST` read (e.g. `geo-search`) sets `next: { revalidate, tags }` (NOT `revalidate: 0`)
- [ ] No `next: method === "GET" ? {...} : { revalidate: 0 }` gating (leaves POST reads uncached → route turns dynamic, `private, no-store`)
- [ ] Mutations (`submit`/lead/`PUT`/`DELETE`) use `cache: "no-store"` and are never cached
- [ ] `tags` always paired with a `revalidate` duration (no bare `next: { tags }`)
- [ ] Cacheable routes export `revalidate`; not added to form/personalized routes
- [ ] `React.cache()` not used as a substitute for cross-request caching
- [ ] On-demand revalidation invalidates both Next.js (`revalidateTag`/`revalidatePath`) and the CDN

## Output

### Review Summary

| File | Status | Issues |
|------|--------|--------|
| file1.ts | ✅/⚠️/❌ | issue description |
| file2.tsx | ✅/⚠️/❌ | issue description |

### Issues Found

#### ❌ Critical (must fix)
- Issue 1: Description and fix

#### ⚠️ Warnings (should fix)
- Warning 1: Description and suggestion

#### 💡 Suggestions (nice to have)
- Suggestion 1: Improvement idea

### Overall
- **Status**: Ready / Needs Work
- **Recommendation**: Summary
