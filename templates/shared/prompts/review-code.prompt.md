---
agent: agent
description: Quick code review of current changes
model: Claude Haiku 4.5
tools:
  - read_file
  - grep_search
  - run_in_terminal
---

# Quick Code Review

> **Model:** Cheap tier — `Claude Haiku 4.5` on Copilot, `haiku` on Claude Code (a deterministic checklist). To change it, edit the `model:` line in this file's frontmatter; the pin wins over the Copilot picker and Claude `/model`. Codex ignores `model:` — set the session model with `codex --model`.

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
- [ ] A dynamic route (`[slug]`-style) exports `revalidate` AND has a `generateStaticParams` (even
      `return []`) — `revalidate` alone is a silent no-op without it
- [ ] Data fetchers return a discriminated union (`found`/`not_found`/`incomplete`/`api_error`), not
      `T | null` — a collapsed error gets cached as a permanent 404
- [ ] Any CDN/edge cache override (e.g. `proxy.ts`) checks `response.status` before applying a public
      cache, or is only applied to routes that provably can't throw
- [ ] No `loading.tsx` sits as an ancestor of a route that calls `notFound()` — verify with a status
      check (`curl -sv`), not just that the UI looks right

### 6. Component Architecture (React/Next.js)

> See `.github/instructions/react-components.instructions.md`.

- [ ] Components use `export default function`, not a named export
- [ ] Each file exports exactly one component — a desktop/mobile pair or a set of small related
      variants (e.g. skeleton loaders) still gets one folder each, not one file with multiple exports
- [ ] Folder is kebab-case with an `index.tsx`, props interface defined in the same file
- [ ] Domain barrel (`index.ts`) re-exports new components with a named alias
- [ ] No inline `<script type="application/ld+json" dangerouslySetInnerHTML>` — structured data goes
      through a shared `<JsonLD>`-style component

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
