---
description: TSDoc documentation standard (not JSDoc) for TypeScript — allowed tags, forbidden JSDoc patterns, and comment templates
name: TSDoc Standards
applyTo: "**/*.{ts,tsx}"
---

# TSDoc Standards

All documentation comments in this project follow the **TSDoc** standard (not JSDoc).

---

## Core Rules

### 1. No type annotations in `@param` or `@returns`

```typescript
// ❌ JSDoc style — FORBIDDEN
/** @param {string} name - The user's name */
/** @returns {boolean} True if valid */

// ✅ TSDoc style — CORRECT
/** @param name - The user's name */
/** @returns True if valid */
```

### 2. Use `@typeParam` for generics (not `@template`)

```typescript
// ❌ FORBIDDEN
/** @template T - The item type */

// ✅ CORRECT
/** @typeParam T - The item type */
```

### 3. Use `@packageDocumentation` for file headers (not `@module`)

```typescript
// ❌ FORBIDDEN
/** @module lib/ccds/client */

// ✅ CORRECT
/**
 * @packageDocumentation
 * Base client for making requests to the CCDS API.
 */
```

### 4. Document interface members inline (not `@property`)

```typescript
// ❌ FORBIDDEN
/**
 * @property {string} name - The community name
 * @property {string} city - The city
 */
interface Community { name: string; city: string; }

// ✅ CORRECT
interface Community {
  /** The community name. */
  name: string;
  /** The city where the community is located. */
  city: string;
}
```

---

## Allowed TSDoc Tags

| Tag | Format | Usage |
|-----|--------|-------|
| `@param` | `@param name - Description` | Function parameter (hyphen required) |
| `@returns` | `@returns Description` | Return value (no type braces) |
| `@remarks` | Block | Extended description, side effects |
| `@example` | Block | Code example with fenced ` ```typescript ``` ` |
| `@throws` | Block | Documented exceptions |
| `@see` | Block | References to other symbols or URLs |
| `@deprecated` | Block | Mark deprecated with migration guidance |
| `@defaultValue` | Block | Default value of a property |
| `@typeParam` | `@typeParam T - Description` | Generic type parameter |
| `@packageDocumentation` | Modifier | Module-level doc (first comment in file) |
| `{@link symbol}` | Inline | Hyperlink to a symbol |

> **Note:** `@param` and `@returns` are optional — add them when they genuinely add clarity
> (e.g., non-obvious parameters, complex return shapes). Do NOT add them to interfaces,
> types, or constants.

---

## Comment Patterns

### Server Action

````typescript
/**
 * Submits the contact form and sends a notification email.
 *
 * @remarks
 * Validates server-side, creates a DB record, dispatches email.
 *
 * @param formData - Submitted form data from the contact page
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
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", { dateStyle: "long" });
}
````

### File Header

```typescript
/**
 * @packageDocumentation
 * CCDS geo-search utilities for state, city, and community lookups.
 */
```

---

## Forbidden Patterns

```typescript
// ❌ Type braces in @param
/** @param {string} name - Description */

// ❌ Type braces in @returns
/** @returns {boolean} True if valid */

// ❌ @template (use @typeParam)
/** @template T - The type */

// ❌ @module (use @packageDocumentation)
/** @module path/to/module */

// ❌ @fileoverview (not a TSDoc tag)
/** @fileoverview Description */

// ❌ @typedef, @callback, @type (use TypeScript types instead)
/** @typedef {Object} MyType */

// ❌ @function, @async, @class, @enum (redundant with TypeScript)
/** @function myFunction */
```
