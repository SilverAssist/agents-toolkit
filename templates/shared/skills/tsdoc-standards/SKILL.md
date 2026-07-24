---
name: tsdoc-standards
description: Write and enforce TSDoc (not JSDoc) in TypeScript. Use when adding or reviewing doc comments on functions, components, interfaces, or file headers. Covers allowed tags, forbidden JSDoc patterns, and templates.
---

# Silver Assist — TSDoc Standards

This skill is the deep reference for writing and reviewing documentation comments in
TypeScript. All doc comments follow the **[TSDoc](https://tsdoc.org/)** standard — **not
JSDoc**. The enforced, always-on rules live in `tsdoc-standards.instructions.md`
(`applyTo: "**/*.{ts,tsx}"`); this skill adds the *why*, expanded examples, and a review
checklist for on-demand use.

## When to Use

- Adding doc comments to functions, Server Actions, React components, hooks, or utilities
- Documenting interfaces, types, enums, or module/file headers
- Reviewing a PR and deciding whether a comment is TSDoc-correct
- Migrating an existing file from JSDoc (`{type}` braces, `@template`, `@module`) to TSDoc
- Answering "which tag do I use for X?" or "is `@fileoverview` allowed?"

## Why TSDoc, not JSDoc

TypeScript already carries the type information. JSDoc duplicates it in `{braces}`, which:

- **Drifts** — the `{string}` in the comment and the `: string` in the signature diverge over time.
- **Is redundant** — editors and `tsc` read the real types; the comment adds nothing.
- **Breaks API extractors** — tools like [API Extractor](https://api-extractor.com/) and the
  TSDoc parser reject JSDoc-only tags (`@typedef`, `@callback`, `@fileoverview`).

TSDoc keeps prose in the comment and types in the code — one source of truth for each.

## Core Rules (with rationale)

### 1. No type annotations in `@param` / `@returns`

The type is in the signature; the comment describes *meaning*, not *type*.

```typescript
// ❌ JSDoc — the {string} duplicates the signature
/** @param {string} slug - Community slug */

// ✅ TSDoc — hyphen required after the name; no braces
/** @param slug - Community slug */
```

### 2. `@typeParam` for generics (not `@template`)

```typescript
// ❌ @template is a JSDoc/Closure tag
/** @template T */

// ✅ TSDoc generic parameter
/** @typeParam T - The item shape returned by the fetcher */
```

### 3. `@packageDocumentation` for file/module headers (not `@module`)

Place it in the **first** comment of the file. It marks module-level docs for extractors.

```typescript
/**
 * @packageDocumentation
 * CCDS geo-search utilities for state, city, and community lookups.
 */
```

### 4. Document interface members inline (not `@property`)

Each member gets its own leading comment — it shows on hover for that specific field.

```typescript
interface Community {
  /** The community name. */
  name: string;
  /** The city where the community is located. */
  city: string;
  /** @defaultValue `false` */
  featured?: boolean;
}
```

## Allowed Tags — quick reference

| Tag | Format | Notes |
|-----|--------|-------|
| `@param` | `@param name - Description` | Hyphen required; no type braces |
| `@returns` | `@returns Description` | No type braces |
| `@remarks` | Block | Extended description / side effects |
| `@example` | Block | Fenced code (` ```typescript `) |
| `@throws` | Block | Documented exceptions |
| `@see` | Block | Cross-reference or URL |
| `@deprecated` | Block | Add migration guidance |
| `@defaultValue` | Block | Default of a property |
| `@typeParam` | `@typeParam T - Description` | Generic parameter |
| `@packageDocumentation` | Modifier | First comment in the file |
| `{@link symbol}` | Inline | Hyperlink to a symbol |

> `@param` / `@returns` are **optional** — add them only when they add clarity (non-obvious
> params, complex return shapes). Never add them to interfaces, types, or constants.

## Templates

### Server Action

````typescript
/**
 * Submits the contact form and sends a notification email.
 *
 * @remarks
 * Validates server-side, creates a DB record, dispatches email.
 *
 * @param formData - Submitted form data from the contact page
 * @returns Redirect response to the thank-you page
 *
 * @throws When the email service is unavailable
 */
export async function submitContactForm(formData: FormData): Promise<void> {}
````

### React Component

````typescript
/**
 * Renders a responsive community card with name and location.
 *
 * @param props - Component props
 * @param props.community - The community data to display
 * @param props.className - Optional additional CSS classes
 * @returns The community card JSX element
 *
 * @example
 * ```tsx
 * <CommunityCard community={community} className="mt-4" />
 * ```
 */
export function CommunityCard({ community, className }: CommunityCardProps) {}
````

### Utility Function

````typescript
/**
 * Formats a date string for display.
 *
 * @param dateString - ISO 8601 date string
 * @returns Human-readable date (e.g., "January 15, 2025")
 *
 * @example
 * ```typescript
 * formatDate("2025-01-15"); // "January 15, 2025"
 * ```
 */
export function formatDate(dateString: string): string {}
````

### Generic Utility (`@typeParam`)

````typescript
/**
 * Returns the first element matching the predicate, or `undefined`.
 *
 * @typeParam T - The element type of the array
 * @param items - The array to search
 * @param predicate - Returns `true` for the desired element
 * @returns The first matching element, or `undefined` if none match
 */
export function findFirst<T>(items: T[], predicate: (item: T) => boolean): T | undefined {}
````

## Forbidden Patterns → Fixes

| ❌ Forbidden (JSDoc) | ✅ TSDoc fix |
|----------------------|--------------|
| `@param {string} name` | `@param name` |
| `@returns {boolean} …` | `@returns …` |
| `@template T` | `@typeParam T` |
| `@module path/to/mod` | `@packageDocumentation` |
| `@fileoverview …` | `@packageDocumentation` |
| `@typedef {Object} X` | Define a TypeScript `interface`/`type` |
| `@callback X` | Define a TypeScript function type |
| `@type {X}` | Annotate the value: `const x: X = …` |
| `@property {T} name` | Inline `/** … */` on the interface member |
| `@function` / `@async` / `@class` / `@enum` | Remove — redundant with TypeScript |

## Review Checklist

When reviewing doc comments, confirm:

- [ ] No `{type}` braces in `@param` / `@returns`.
- [ ] `@param name - Description` uses the hyphen and matches the actual parameter name.
- [ ] Generics use `@typeParam`, not `@template`.
- [ ] File-level docs use `@packageDocumentation` in the first comment, not `@module` / `@fileoverview`.
- [ ] Interface/type members are documented inline, not via `@property`.
- [ ] No redundant `@function` / `@async` / `@class` / `@enum` / `@typedef` / `@callback` / `@type`.
- [ ] `@param` / `@returns` are present only where they add real clarity.
