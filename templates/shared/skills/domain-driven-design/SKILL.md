---
name: domain-driven-design
description: Guide for organizing code using Domain-Driven Design principles. Use this when creating new features, restructuring folders, or ensuring consistent project organization.
---

# Domain-Driven Design (DDD) Skill

This skill provides guidelines for organizing code following Domain-Driven Design principles.

## Core Principles

1. **Group by Domain, Not by Type** - Organize files by business domain rather than technical type
2. **Clear Boundaries** - Each domain has well-defined responsibilities
3. **Self-Documenting Structure** - Folder names clearly communicate what the code does
4. **Colocation** - Related code (components, utils, tests) lives together

## Domain Organization Rules

### ✅ DO

- Create domain folders that match business concepts
- Keep domain-specific utilities inside domain folders
- Place tests in `__tests__/` subfolders within each domain
- Use clear, descriptive folder names

### ❌ DON'T

- Create generic folders like "helpers", "services", "utils" at root level
- Mix different domain concerns in the same folder
- Create deeply nested folder structures (max 3 levels)
- Use abbreviations in folder names

## Project Structure

### Components Domain

```
src/components/
├── auth/                    # Authentication components
│   ├── login-form/
│   ├── register-form/
│   └── password-reset/
├── dashboard/               # Dashboard components
│   ├── stats-card/
│   ├── activity-feed/
│   └── charts/
├── checkout/                # Checkout flow components
│   ├── cart-summary/
│   ├── payment-form/
│   └── order-confirmation/
├── forms/                   # Reusable form components
│   ├── contact-form/
│   └── newsletter-form/
├── layout/                  # Layout components
│   ├── header/
│   ├── footer/
│   └── sidebar/
├── shared/                  # Cross-domain reusable components
│   ├── loading-spinner/
│   ├── error-boundary/
│   └── empty-state/
└── ui/                      # Primitive UI components
    ├── button/
    ├── input/
    └── modal/
```

### Library Domain

```
src/lib/
├── api/                     # API client utilities
│   ├── client.ts
│   ├── endpoints.ts
│   └── types.ts
├── auth/                    # Authentication utilities
│   ├── session.ts
│   ├── tokens.ts
│   └── permissions.ts
├── email/                   # Email automation
│   ├── templates.ts
│   ├── sender.ts
│   └── types.ts
├── payment/                 # Payment processing
│   ├── stripe.ts
│   ├── checkout.ts
│   └── types.ts
└── utils/                   # Generic utilities (keep minimal)
    ├── formatting.ts
    └── validation.ts
```

### Actions Domain (Next.js Server Actions)

```
src/actions/
├── auth/                    # Auth-related actions
│   ├── index.ts             # Barrel export
│   ├── login.ts
│   ├── logout.ts
│   └── register.ts
├── checkout/                # Checkout actions
│   ├── index.ts             # Barrel export
│   ├── create-order.ts
│   ├── process-payment.ts
│   └── add-to-cart.ts
├── contact/                 # Contact form actions
│   ├── index.ts
│   └── submit-form.ts
└── user/                    # User management actions
    ├── index.ts
    ├── update-profile.ts
    └── change-password.ts
```

### Data Access Layer (DAL)

```
src/data/                    # Data Access Layer - server-only
├── index.ts                 # Barrel export
├── user.ts                  # User data operations
├── product.ts               # Product data operations
├── order.ts                 # Order data operations
└── auth.ts                  # Auth/session utilities
```

> **CRITICAL**: All files in `src/data/` must start with `import "server-only"` to prevent
> accidental client-side imports. See `server-actions.instructions.md` for security details.

## Barrel Export Pattern

Use **barrel exports** (`index.ts`) for folders with multiple internal files.

### Export Strategy by File Type

| File Type | Export Type | Reason |
|-----------|-------------|--------|
| Components | `export default` | Tree-shaking optimization (Next.js recommendation) |
| Helpers/Utils | `export { name }` | Multiple functions per file |
| Types | `export type { }` | Type-only exports |
| Actions | `export { name }` | Named functions for clarity |
| Hooks | `export { name }` | Named functions for clarity |

### When to Create Barrel Exports

- ✅ Domain folders with 3+ files
- ✅ Component folders with multiple related components
- ✅ When you want to hide internal file structure
- ❌ Single-file folders (unnecessary)

### Component Barrel Export

```typescript
// src/components/auth/index.ts
// Components use "export default" in their files,
// barrel re-exports with names for convenient imports
export { default as LoginForm } from "./login-form";
export { default as RegisterForm } from "./register-form";
export { default as PasswordReset } from "./password-reset";

// Usage - Clean named imports
import { LoginForm, RegisterForm } from "@/components/auth";
```

### Library Barrel Export

```typescript
// src/lib/payment/index.ts
// Libraries use named exports throughout
export { createCheckout, validateCart } from "./checkout";
export { processPayment, refundPayment } from "./stripe";
export type { PaymentIntent, CheckoutSession } from "./types";

// Usage
import { 
  createCheckout,
  processPayment,
  type PaymentIntent,
} from "@/lib/payment";
```

### Actions Barrel Export

```typescript
// src/actions/checkout/index.ts
export { createOrder } from "./create-order";
export { processPayment } from "./process-payment";
export { addToCart } from "./add-to-cart";

// Usage
import { createOrder, addToCart } from "@/actions/checkout";
```

### Import Rules

```typescript
// ✅ CORRECT: Import from domain barrel
import { LoginForm } from "@/components/auth";
import { createCheckout } from "@/lib/payment";
import { createOrder } from "@/actions/checkout";

// ❌ INCORRECT: Deep imports when barrel exists
import LoginForm from "@/components/auth/login-form";
import { createCheckout } from "@/lib/payment/checkout";
```

## Domain Boundaries

### Identifying Domains

Ask these questions to identify domains:

1. **What business concept does this code represent?**
2. **Who is the primary user of this functionality?**
3. **What would change together?**

### Example Domain Identification

| Feature | Domain | Reason |
|---------|--------|--------|
| Login form | `auth` | Authentication concern |
| Product card | `products` or `catalog` | Product display concern |
| Shopping cart | `checkout` | Purchase flow concern |
| User settings | `user` or `settings` | User management concern |

## Avoiding Common Mistakes

### ❌ Generic Folder Anti-Patterns

```
# ❌ BAD: Generic folders
src/
├── components/
├── helpers/        # What kind of helpers?
├── services/       # Too vague
├── utils/          # Catch-all folder
└── types/          # Types should live with their domain
```

### ✅ Domain-Oriented Structure

```
# ✅ GOOD: Domain-oriented
src/
├── components/
│   ├── auth/
│   ├── checkout/
│   └── shared/
├── lib/
│   ├── auth/
│   ├── payment/
│   └── api/
└── actions/
    ├── auth/
    └── checkout/
```

## Migration Strategy

When refactoring to DDD:

1. **Identify current pain points** - What's hard to find?
2. **Map business domains** - List all business concepts
3. **Plan folder structure** - Design new organization
4. **Migrate incrementally** - Move one domain at a time
5. **Update imports** - Use find-and-replace for import paths
6. **Add barrel exports** - Create index.ts files as you go

## Checklist

Before creating new code, verify:

- [ ] Code belongs to an identifiable business domain
- [ ] Domain folder already exists or should be created
- [ ] Related tests will live in `__tests__/` within the domain
- [ ] Imports use domain paths (not deep internal paths)
- [ ] No generic "utils" or "helpers" at root level
