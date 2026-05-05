---
applyTo: "**/components/**/*.tsx"
---
# React Component Standards

## Component Structure

**✅ ALWAYS use folder structure** with `index.tsx`:

```
components/
└── domain/                    # Domain folder (auth, checkout, etc.)
    ├── index.ts               # Barrel export for domain
    └── component-name/        # kebab-case folder
        ├── index.tsx          # Main component (export default)
        ├── types.ts           # Component-specific types (if needed)
        └── __tests__/         # Tests folder
            └── component-name.test.tsx
```

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
