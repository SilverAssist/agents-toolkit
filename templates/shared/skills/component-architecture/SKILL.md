---
name: component-architecture
description: Guide for creating and organizing React components. Use this when creating new components, restructuring folders, or ensuring consistent component patterns.
---

# Component Architecture Skill

When creating or modifying React components in this project, follow these strict conventions.

## Folder Structure Rules

### CRITICAL: Naming Conventions

```text
✅ CORRECT (kebab-case folders):
src/components/user-profile/index.tsx
src/components/checkout-wizard/index.tsx
src/components/contact-form/index.tsx

❌ INCORRECT (never use):
src/components/UserProfile.tsx          # No standalone files
src/components/userProfile/index.tsx    # No camelCase folders
src/components/UserProfile/index.tsx    # No PascalCase folders
```

### Component Folder Pattern

Every component MUST be in its own folder with `index.tsx`:

```text
src/components/payment-form/
├── index.tsx           # ONLY the component + props interface
├── types.ts            # Shared types (if multiple)
├── helpers.ts          # Helper functions
├── constants.ts        # Component constants
└── __tests__/
    └── payment-form.test.tsx
```

## One Component Per File (CRITICAL)

If a file exports more than one component, split it — even when the components are small and closely
related. This surfaced repeatedly in a 2026-08 multi-repo audit: a `skeleton/index.tsx` exporting
`PageSkeleton`/`CardSkeleton`/`TextSkeleton`, and a `menu/index.tsx` exporting `Menu`/`MobileMenu`,
each in a **single file with multiple named exports** — found independently in 6+ separate codebases
that had never seen each other's code, meaning it's an easy default to fall into, not a one-off
mistake.

```text
❌ INCORRECT: components/skeleton/index.tsx exports PageSkeleton, CardSkeleton, TextSkeleton

✅ CORRECT: split into sibling folders, one export each
components/page-skeleton/index.tsx    → export default function PageSkeleton
components/card-skeleton/index.tsx    → export default function CardSkeleton
components/text-skeleton/index.tsx    → export default function TextSkeleton
components/skeleton-base/index.tsx    → export default function SkeletonBase (the shared primitive
                                          all three compose, if one exists — don't duplicate it
                                          three times just to avoid a fourth folder)
```

The same applies to a desktop/mobile variant pair (`Menu`/`MobileMenu`) — two folders, not one file
with two exports, even though they're visually/logically paired. If they share a prop type, put it in
one of the two folders' `types.ts` and have the other import it from there.

## Structured Data / JSON-LD: always through a shared component

Never inline `<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ... }} />`
directly in a page or component. This was found duplicated across **every** repo in a 2026-08 audit —
in one file, twice in the same component (once per conditional branch). Extract one reusable
component instead:

```tsx
// src/components/layout/json-ld/index.tsx
interface JsonLDProps {
  data?: object;        // a typed schema object — optional so `jsonString`-only usage still type-checks
  jsonString?: string;  // a pre-built string (e.g. from a buildJsonLdGraph()-style helper)
}

export default function JsonLD({ data, jsonString }: JsonLDProps) {
  const content = jsonString ?? JSON.stringify(data);
  if (!content) return null;
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: content }} />;
}
```

```tsx
// ✅ CORRECT: every page renders structured data through the shared component
import JsonLD from "@/components/layout/json-ld";
<JsonLD data={{ "@context": "https://schema.org", "@type": "WebSite", name, url }} />

// ❌ INCORRECT: hand-rolled script tag, easy to duplicate and easy to typo the __html key
<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ ... }) }} />
```

A double-optional `data`/`jsonString` prop type (rather than making `data` required) matters: a
component whose only documented usage example is `jsonString`-only will fail its own JSDoc example
under a required `data` prop — a real bug independently found and fixed in three separate repos during
the same audit, all forked from a common template that had the bug at its source.

## Component File Template

### Server Component (Default)

```typescript
// src/components/auth/user-profile/index.tsx
import { getUserProfile } from "@/data/user";

interface UserProfileProps {
  /** User ID to display */
  userId: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Displays user profile information
 * Server Component - fetches data directly
 */
export default async function UserProfile({
  userId,
  className,
}: UserProfileProps) {
  const user = await getUserProfile(userId);

  return (
    <div className={className}>
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </div>
  );
}
```

### Client Component (Interactive)

```typescript
// src/components/checkout/add-to-cart-button/index.tsx
"use client";

import { useState } from "react";
import { addToCart } from "@/actions/checkout/add-to-cart";

interface AddToCartButtonProps {
  /** Product ID to add */
  productId: string;
  /** Button variant */
  variant?: "primary" | "secondary";
}

/**
 * Interactive button to add products to cart
 * Client Component - uses state and event handlers
 */
export default function AddToCartButton({
  productId,
  variant = "primary",
}: AddToCartButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    await addToCart(productId);
    setIsLoading(false);
  };

  return (
    <button onClick={handleClick} disabled={isLoading}>
      {isLoading ? "Adding..." : "Add to Cart"}
    </button>
  );
}
```

> **Note**: If using Tailwind CSS with shadcn/ui, see `css-styling.instructions.md` for `cn()` utility usage.

## Props Interface Rules

### MUST Define Inside Component File

```typescript
// ✅ CORRECT: Props interface in same file, before component
interface ContactFormProps {
  onSubmit: (data: FormData) => void;
  initialValues?: Record<string, string>;
}

export default function ContactForm({ onSubmit, initialValues }: ContactFormProps) {
  // Implementation
}
```

### Props Interface Naming

```typescript
// Interface name = ComponentName + "Props"
interface PaymentFormProps { }
interface CheckoutWizardProps { }
interface UserProfileProps { }
```

## Export Pattern

### Components: Default Export

Per Next.js recommendation, components use `export default` for better tree-shaking:

```typescript
// ✅ CORRECT: Components use default export
export default function UserProfile() { }
export default async function ProductList() { }  // Server Component

// ❌ INCORRECT for components
export function UserProfile() { }             // Named export - worse tree-shaking
export const UserProfile = () => { }          // Arrow functions lose name in stack traces
```

### Everything Else: Named Exports

Helpers, types, utilities, hooks, and actions use named exports:

```typescript
// ✅ CORRECT: Named exports for non-components
// helpers.ts
export function formatDate(date: Date): string { }
export function validateEmail(email: string): boolean { }

// types.ts
export interface User { }
export type PaymentStatus = "pending" | "completed";

// hooks/use-form-state.ts
export function useFormState() { }

// actions/checkout/create-order.ts
export async function createOrder(data: FormData) { }
```

### Barrel Exports for Domains

Use barrel exports (`index.ts`) to expose the domain's public API:

```typescript
// src/components/auth/index.ts
export { default as LoginForm } from "./login-form";
export { default as RegisterForm } from "./register-form";
export { default as PasswordReset } from "./password-reset";

// Usage
import { LoginForm, RegisterForm } from "@/components/auth";
```

## Separation of Concerns

### When to Create Separate Files

| File | When to Create |
|------|----------------|
| `types.ts` | Multiple types shared within component folder |
| `helpers.ts` | Pure utility functions for the component |
| `constants.ts` | Component-specific constants, configs |
| `hooks/` | Component-specific custom hooks |

### Example: Complex Component Structure

```text
src/components/checkout-wizard/
├── index.tsx                    # Main wizard component
├── types.ts                     # WizardState, WizardAction, etc.
├── constants.ts                 # Step IDs, default values
├── hooks/
│   ├── use-wizard-state.ts     # State management hook
│   └── use-submission.ts       # Form submission hook
├── steps/
│   ├── shipping-step.tsx       # Shipping info step
│   └── payment-step.tsx        # Payment info step
└── __tests__/
    └── checkout-wizard.test.tsx
```

## Import Rules

### ALWAYS Use Absolute Imports

```typescript
// ✅ CORRECT: Absolute imports with @/
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { User } from "@/types";

// ❌ INCORRECT: Relative imports
import { Button } from "../../ui/button";
import { cn } from "../../../lib/utils";
```

## Domain Organization (DDD)

Components are organized by business domain with barrel exports:

```text
src/components/
├── auth/                      # Authentication domain
│   ├── index.ts               # Barrel export
│   ├── login-form/
│   │   └── index.tsx          # export default function LoginForm
│   ├── register-form/
│   │   └── index.tsx
│   └── password-reset/
│       └── index.tsx
├── checkout/                  # Checkout domain
│   ├── index.ts               # Barrel export
│   ├── cart-summary/
│   ├── payment-form/
│   └── add-to-cart-button/
├── dashboard/                 # Dashboard domain
│   ├── index.ts
│   ├── stats-card/
│   └── activity-feed/
├── layout/                    # Layout components
│   ├── index.ts
│   ├── header/
│   ├── footer/
│   └── sidebar/
├── shared/                    # Cross-domain components
│   ├── index.ts
│   ├── loading-spinner/
│   └── error-boundary/
└── ui/                        # Primitive UI (shadcn/ui)
    ├── button.tsx             # UI primitives can be single files
    ├── input.tsx
    └── modal.tsx
```

### Barrel Export Example

```typescript
// src/components/auth/index.ts
export { default as LoginForm } from "./login-form";
export { default as RegisterForm } from "./register-form";
export { default as PasswordReset } from "./password-reset";

// src/components/checkout/index.ts
export { default as CartSummary } from "./cart-summary";
export { default as PaymentForm } from "./payment-form";
export { default as AddToCartButton } from "./add-to-cart-button";
```

### Clean Imports

```typescript
// ✅ CORRECT: Import from domain barrel
import { LoginForm, RegisterForm } from "@/components/auth";
import { CartSummary, PaymentForm } from "@/components/checkout";

// ❌ INCORRECT: Deep imports when barrel exists
import LoginForm from "@/components/auth/login-form";
```

## Hook Placement Rules

### CRITICAL: All hooks BEFORE conditional returns

```typescript
// ✅ CORRECT
export default function Component({ data }: Props) {
  const [state, setState] = useState(initialState);
  const handleClick = useCallback(() => {}, []);

  // Early returns AFTER all hooks
  if (!data) return null;
  
  return <div>...</div>;
}

// ❌ INCORRECT: Hooks after conditional
export function Component({ data }: Props) {
  if (!data) return null;  // ❌ Early return before hooks
  
  const [state, setState] = useState(initialState);  // ❌ Error!
  return <div>...</div>;
}
```
