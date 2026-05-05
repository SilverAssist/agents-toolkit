---
applyTo: "**/*.{css,tsx}"
---
# Tailwind CSS & shadcn/ui Standards

## Use Design Tokens (Semantic Colors)

**✅ ALWAYS use semantic color tokens** instead of hardcoded colors:

```tsx
// ✅ CORRECT: Semantic tokens
<div className="bg-background text-foreground" />
<div className="bg-card text-card-foreground border-border" />
<div className="bg-primary text-primary-foreground" />
<div className="bg-destructive text-destructive-foreground" />
<div className="bg-muted text-muted-foreground" />

// ❌ INCORRECT: Hardcoded colors
<div className="bg-white text-black" />
<div className="bg-blue-500 text-white" />
```

## Use cn() Utility for Conditional Classes

**✅ ALWAYS use cn()** from `@/lib/utils` for conditional styling:

```tsx
import { cn } from "@/lib/utils";

// ✅ CORRECT: Using cn() utility
<button
  className={cn(
    "px-4 py-2 rounded-md font-medium",
    "bg-primary text-primary-foreground",
    isDisabled && "opacity-50 cursor-not-allowed",
    isActive && "ring-2 ring-ring ring-offset-2",
    className  // Allow prop override
  )}
/>

// ❌ INCORRECT: Template literals
<button
  className={`px-4 py-2 ${isDisabled ? 'opacity-50' : ''}`}
/>
```

### Setting Up cn() Utility

If you don't have the `cn()` utility yet (it's installed automatically with shadcn/ui):

```bash
npm install clsx tailwind-merge
```

```typescript
// src/lib/utils.ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges and combines Tailwind CSS classes.
 * Uses clsx for conditional classes and tailwind-merge to handle conflicts.
 * @param inputs - The Tailwind CSS classes to merge
 * @returns The merged Tailwind CSS classes
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
```

## Responsive Design (Mobile-First)

**✅ ALWAYS use mobile-first responsive design**:

```tsx
// ✅ CORRECT: Mobile-first (sm → md → lg → xl)
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" />
<div className="text-sm md:text-base lg:text-lg" />
<div className="p-4 md:p-6 lg:p-8" />
<div className="flex flex-col md:flex-row" />

// ❌ INCORRECT: Desktop-first (working backwards)
<div className="grid grid-cols-4 lg:grid-cols-3 md:grid-cols-2 sm:grid-cols-1" />
```

## shadcn/ui Component Usage

**✅ IMPORT from component path**:

```tsx
// ✅ CORRECT: Import from component path
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

// Use with variants
<Button variant="default">Primary</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="destructive">Delete</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
```

## Typography

**✅ USE prose classes for content** and utility classes for UI:

```tsx
// ✅ CORRECT: UI typography
<h1 className="text-3xl font-bold tracking-tight" />
<p className="text-sm text-muted-foreground" />

// ✅ CORRECT: Content typography (prose)
<article className="prose prose-lg dark:prose-invert" />

// ✅ Font families
<div className="font-sans" />   // Default font
<code className="font-mono" />  // Monospace font
```

## Avoiding Common Mistakes

```tsx
// ❌ AVOID: Conflicting classes
<div className="p-4 p-6" />  // Which one wins?

// ❌ AVOID: Redundant classes
<div className="flex flex-row" />  // flex-row is default

// ❌ AVOID: Inline styles when Tailwind works
<div style={{ padding: '16px' }} />  // Use className="p-4"
```

## Styling Checklist

Before committing styled components, verify:

- [ ] Using semantic color tokens (not hardcoded)
- [ ] Using `cn()` for conditional classes
- [ ] Mobile-first responsive design
- [ ] Consistent spacing from Tailwind scale
- [ ] shadcn/ui components imported correctly
- [ ] No conflicting or redundant classes
