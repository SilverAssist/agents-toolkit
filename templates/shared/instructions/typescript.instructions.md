---
applyTo: "**/*.{ts,tsx}"
---
# TypeScript Code Style Standards

## Export Rules

**Components** use `export default`, everything else uses **named exports**:

```typescript
// ✅ Components: default export
// components/auth/login-form/index.tsx
export default function LoginForm() { }

// ✅ Everything else: named exports
// lib/utils.ts
export function formatDate(date: Date): string { }
export function validateEmail(email: string): boolean { }

// types/user.ts
export interface User { }
export type UserRole = "admin" | "user";

// actions/auth/login.ts
export async function login(formData: FormData) { }

// hooks/use-form.ts
export function useForm() { }
```

## Avoid Nested Ternaries
**❌ NEVER use nested ternary operators** - they reduce readability significantly.

```typescript
// ❌ INCORRECT: Nested ternaries
const status = isLoading ? 'loading' : hasError ? 'error' : 'success';

// ✅ CORRECT: Use if/else or early returns
function getStatus(isLoading: boolean, hasError: boolean): string {
  if (isLoading) return 'loading';
  if (hasError) return 'error';
  return 'success';
}

// ✅ CORRECT: Simple ternary is OK (no nesting)
const greeting = isLoggedIn ? 'Welcome back!' : 'Please log in';
```

## Clarity Over Brevity

**✅ PREFER explicit, readable code** over compact one-liners.

```typescript
// ❌ INCORRECT: Too compact, hard to understand
const result = data?.items?.filter(i => i.active).map(i => i.id).join(',') || '';

// ✅ CORRECT: Clear and maintainable
const activeItems = data?.items?.filter(item => item.active) ?? [];
const itemIds = activeItems.map(item => item.id);
const result = itemIds.join(',');
```

## Object Destructuring

**✅ ALWAYS use destructuring** for function parameters and object properties.

```typescript
// ✅ CORRECT: Destructure at the start
function processData(data: DataType) {
  const { name, email, phone, address } = data;
  console.log(email);
  sendEmail(email);
}
```

## No `any` Type

**❌ NEVER use `any`** - always define explicit types.

```typescript
// ❌ INCORRECT
function processData(data: any) { ... }

// ✅ CORRECT
interface DataType {
  name: string;
  email: string;
}
function processData(data: DataType) { ... }
```

## JSDoc Comments

**✅ ALWAYS add JSDoc** to public functions.

```typescript
/**
 * Formats a date for display.
 * @param date - The date to format
 * @param locale - The locale (default: 'en-US')
 * @returns Formatted date string
 */
export function formatDate(date: Date, locale = 'en-US'): string {
  return date.toLocaleDateString(locale);
}
```
