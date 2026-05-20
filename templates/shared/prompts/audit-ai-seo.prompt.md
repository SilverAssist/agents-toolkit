---
agent: agent
description: Run a comprehensive AI SEO optimization audit on the current project. Checks agent-friendly UX, E-E-A-T signals, content quality, technical SEO, and structured data.
---

# AI SEO Optimization Audit

Run a comprehensive audit of this project for Google AI Search visibility and browser agent readiness.

## Context

Use the `ai-seo-optimization` skill as reference for all criteria. This audit follows Google's official AI Optimization Guide (May 2026).

## Audit Steps

### 1. Technical Baseline

> **Scope**: The checks below use Next.js App Router terminology (Server Components, `generateMetadata`). For non-Next.js projects, adapt to the equivalent patterns (e.g., SSR/SSG for content rendering, `<meta>` tags for metadata).

Check the following in the codebase:

- [ ] Pages use Server Components or SSR (content is rendered server-side, not client-only)
- [ ] No `nosnippet` or `data-nosnippet` on key content
- [ ] Metadata (title, description, OpenGraph) is set for all pages
- [ ] Canonical tags are properly set (no duplicates)
- [ ] XML sitemap exists and includes all valuable pages
- [ ] `robots.txt` doesn't block critical resources

### 2. Agent-Friendly UX

Audit components for:

- [ ] No `<div onClick>` patterns (must use `<button>` or `<a>`)
- [ ] All `<input>` elements have associated `<label htmlFor>`
- [ ] Heading hierarchy is correct (`h1` → `h2` → `h3`, no skips)
- [ ] Skip-to-content link exists as first focusable element
- [ ] Interactive elements have `cursor: pointer`
- [ ] No ghost overlays blocking interactive elements
- [ ] All interactive elements have accessible names

### 3. E-E-A-T Signals (YMYL Sites)

Check for existence of:

- [ ] Author pages with credentials and `Person` schema
- [ ] About/Mission page with team information
- [ ] Methodology or "How we rate" page
- [ ] Data source disclosures
- [ ] Contact information easily accessible
- [ ] Privacy policy and terms linked from all pages
- [ ] Content dates (published/modified) visible

### 4. Content Quality Assessment

Review top landing pages for:

- [ ] Unique data or insights not available elsewhere
- [ ] First-hand experience signals
- [ ] Expert commentary with attribution
- [ ] Interactive tools or calculators
- [ ] No thin/commodity content on indexed pages

### 5. Structured Data Validation

Check JSON-LD implementation:

- [ ] `LocalBusiness` on community/location pages (with address, geo, priceRange)
- [ ] `Person` on author pages (with knowsAbout, jobTitle)
- [ ] `Article` on blog posts (with author, datePublished, dateModified)
- [ ] `BreadcrumbList` on all pages
- [ ] `Organization` on homepage
- [ ] No validation errors (test with Rich Results Test)

### 6. Performance & Core Web Vitals

- [ ] LCP < 2.5s on key templates
- [ ] CLS < 0.1 (no layout shifts)
- [ ] INP < 200ms (responsive interactions)
- [ ] Images have explicit dimensions
- [ ] Fonts use `display: swap`

## Output Format

Provide results as:

```markdown
## AI SEO Audit Results — [Project Name]

### Score Summary
| Area | Status | Score |
|------|--------|-------|
| Technical Baseline | 🟢/🟡/🔴 | X/Y |
| Agent-Friendly UX | 🟢/🟡/🔴 | X/Y |
| E-E-A-T Signals | 🟢/🟡/🔴 | X/Y |
| Content Quality | 🟢/🟡/🔴 | X/Y |
| Structured Data | 🟢/🟡/🔴 | X/Y |
| Performance | 🟢/🟡/🔴 | X/Y |

### Critical Issues (Fix Immediately)
- ...

### Improvements (High Impact)
- ...

### Recommendations (Nice to Have)
- ...
```
