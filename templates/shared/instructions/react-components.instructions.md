---
applyTo: "**/components/**/*.tsx"
---
# React Component Standards

## Component Structure

**✅ ALWAYS use folder structure** with `index.tsx`:

```text
components/
└── domain/                    # Domain folder (auth, checkout, etc.)
    ├── index.ts               # Barrel export for domain
    └── component-name/        # kebab-case folder
        ├── index.tsx          # Main component (export default)
        ├── types.ts           # Component-specific types (if needed)
        └── __tests__/         # Tests folder
            └── component-name.test.tsx
```

## One Component Per File (CRITICAL)

If a file exports more than one component — even a small, closely-related pair like a desktop/mobile
variant, or three sibling skeleton-loader components — split it into one folder per component. Found
independently in 6+ codebases during a 2026-08 audit (`skeleton.tsx` with 3 exports, `menu.tsx` with
2), so treat it as an easy default to fall into, not a one-off:

```text
❌ components/skeleton/index.tsx exports PageSkeleton, CardSkeleton, TextSkeleton
✅ components/page-skeleton/index.tsx, components/card-skeleton/index.tsx, components/text-skeleton/index.tsx
```

## Structured Data — always through a shared `<JsonLD>` component

Never inline `<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ... }} />`
directly in a page (found duplicated in every repo audited in 2026-08, once twice in the same file).
Extract a shared component with an optional `data`/`jsonString` prop pair instead:

```tsx
// src/components/layout/json-ld/index.tsx
interface JsonLDProps { data?: object; jsonString?: string; }
export default function JsonLD({ data, jsonString }: JsonLDProps) {
  const content = jsonString ?? JSON.stringify(data);
  if (!content) return null;
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: content }} />;
}
```

Keep `data` optional, not required — a required `data` prop breaks the component's own
`jsonString`-only usage example, a real bug found in three separate repos forked from one template.

## Export Pattern

### Components: Default Export

Per Next.js recommendation, components use `export default` for better tree-shaking:

```tsx
// ✅ CORRECT: Default export for components
interface ButtonProps {
  onClick: () => void;
  children: React.ReactNode;
}

export default function Button({ onClick, children }: ButtonProps) {
  return <button onClick={onClick}>{children}</button>;
}

// ❌ INCORRECT: Named export for components (worse tree-shaking)
export function Button({ onClick, children }: ButtonProps) {
  return <button onClick={onClick}>{children}</button>;
}

// ❌ INCORRECT: Arrow function (loses name in stack traces)
export default const Button = ({ onClick, children }: ButtonProps) => {
  return <button onClick={onClick}>{children}</button>;
};
```

### Barrel Exports for Domains

Re-export components from domain `index.ts`:

```typescript
// src/components/auth/index.ts
export { default as LoginForm } from "./login-form";
export { default as RegisterForm } from "./register-form";

// Usage - clean imports
import { LoginForm, RegisterForm } from "@/components/auth";
```

### Non-Components: Named Exports

Helpers, types, hooks use named exports:

```typescript
// types.ts
export interface User { }
export type Status = "active" | "inactive";

// helpers.ts
export function formatUserName(user: User): string { }
```

## Server vs Client Components

### Server Component (Default)

```tsx
// src/components/dashboard/stats-card/index.tsx
import { getStats } from "@/data/stats";

interface StatsCardProps {
  title: string;
}

export default async function StatsCard({ title }: StatsCardProps) {
  const stats = await getStats(); // Direct data fetching
  
  return (
    <div>
      <h3>{title}</h3>
      <p>{stats.value}</p>
    </div>
  );
}
```

### Client Component (Interactive)

```tsx
// src/components/checkout/add-to-cart/index.tsx
"use client";

import { useState } from "react";

interface AddToCartProps {
  productId: string;
}

export default function AddToCart({ productId }: AddToCartProps) {
  const [quantity, setQuantity] = useState(1);
  
  return (
    <button onClick={() => setQuantity(q => q + 1)}>
      Add ({quantity})
    </button>
  );
}
```

## Props Interface

**✅ ALWAYS define props interface inside the component file**:

```tsx
// ✅ CORRECT: Interface defined in component file
interface UserCardProps {
  user: User;
  onSelect?: (user: User) => void;
  className?: string;
}

export default function UserCard({ user, onSelect, className }: UserCardProps) {
  return (
    <div className={className}>
      <h2>{user.name}</h2>
    </div>
  );
}
```

## Hook Placement (CRITICAL)

**✅ ALL hooks MUST come BEFORE any conditional returns**:

```tsx
// ✅ CORRECT: Hooks first, then early returns
export default function UserList({ users }: UserListProps) {
  const [filter, setFilter] = useState("");
  const filteredUsers = useMemo(() => 
    users.filter(u => u.name.includes(filter)), 
    [users, filter]
  );

  // Early returns AFTER all hooks
  if (!users?.length) {
    return <p>No users found</p>;
  }

  return <ul>{/* ... */}</ul>;
}

// ❌ INCORRECT: Hook after conditional
export default function UserList({ users }: UserListProps) {
  if (!users?.length) return null;  // ❌ Early return before hooks
  
  const [filter, setFilter] = useState("");  // ❌ Error!
  return <ul>{/* ... */}</ul>;
}
```

## Event Handlers

**✅ Use `handle` prefix** for event handlers:

```tsx
import type { ChangeEvent, SyntheticEvent } from "react";

export default function Form() {
  const handleSubmit = (e: SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    // ...
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    // ...
  };

  return (
    <form onSubmit={handleSubmit}>
      <input onChange={handleInputChange} />
    </form>
  );
}
```
