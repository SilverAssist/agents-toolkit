---
applyTo: "**/actions/**/*.ts"
---
# Server Actions Standards

> **Security First**: Server Actions create public HTTP endpoints. Treat them with the same
> security assumptions as any public API endpoint.

## File Structure

Organize actions by domain (consistent with DDD principles):

```
actions/
├── auth/
│   ├── login.ts
│   └── register.ts
├── user/
│   └── update-profile.ts
└── contact/
    └── submit-form.ts
data/                    # Data Access Layer (DAL)
├── user-dto.ts
├── auth.ts
└── db.ts
```

For smaller projects, flat structure is acceptable:

```
actions/
├── auth-actions.ts
├── user-actions.ts
└── contact-actions.ts
data/
├── dal.ts               # Centralized Data Access Layer
└── dto.ts               # Data Transfer Objects
```

## Security Architecture

### Data Access Layer (DAL)

**CRITICAL**: Create a dedicated Data Access Layer for all data operations. Never access
databases or sensitive data directly in Server Actions.

```typescript
// data/dal.ts
import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";

/**
 * Cached user retrieval - safe to call multiple times
 * Uses React cache to deduplicate requests within a render
 */
export const getCurrentUser = cache(async () => {
  const cookieStore = await cookies();
  const token = cookieStore.get("AUTH_TOKEN");
  const decodedToken = await decryptAndValidate(token);

  // Return minimal, safe user object - NOT the full database record
  return new User(decodedToken.id);
});

/**
 * Get user profile with authorization checks
 * Returns only safe, filtered data (DTO pattern)
 */
export async function getUserProfileDTO(userId: string) {
  const currentUser = await getCurrentUser();
  const userData = await db.user.findUnique({ where: { id: userId } });

  // Return only authorized fields
  return {
    username: canSeeUsername(currentUser) ? userData.username : null,
    email: canSeeEmail(currentUser, userData) ? userData.email : null,
    // Never expose: password, tokens, internal IDs, etc.
  };
}
```

### Server-Only Marker

**CRITICAL**: Always mark DAL files with `server-only` to prevent client-side imports:

```typescript
// data/dal.ts
import "server-only";

// This file will cause a build error if imported in client code
```

Install the package: `npm install server-only`

## Action Pattern

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/data/dal";
import { createUserInDB } from "@/data/user-dto";

/**
 * State returned from server actions
 */
interface ActionState {
  success: boolean;
  message: string;
  data?: unknown;
  errors?: Record<string, string>;
}

/**
 * Creates a new user
 * @param prevState - Previous form state
 * @param formData - Form data from submission
 * @returns Action result state
 */
export async function createUser(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  try {
    // 1. ALWAYS verify authentication first
    const user = await getCurrentUser();
    if (!user) {
      return {
        success: false,
        message: "You must be signed in to perform this action",
      };
    }

    // 2. ALWAYS verify authorization
    if (!user.canCreateUsers) {
      return {
        success: false,
        message: "You do not have permission to create users",
      };
    }

    // 3. ALWAYS validate ALL inputs (never trust client data)
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;

    if (!name || !email) {
      return {
        success: false,
        message: "Missing required fields",
        errors: {
          name: !name ? "Name is required" : "",
          email: !email ? "Email is required" : "",
        },
      };
    }

    // 4. Use DAL for data operations (never direct DB access)
    const result = await createUserInDB({ name, email });

    // 5. Revalidate cache after mutations
    revalidatePath("/users");

    return {
      success: true,
      message: "User created successfully",
      data: result, // Return only safe DTO, not raw DB result
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
```

## Security Rules (CRITICAL)

### 1. Always use "use server" directive
```typescript
"use server";
```

### 2. ALWAYS authenticate and authorize
```typescript
// ❌ INCORRECT: No auth check
export async function deleteUser(userId: string) {
  await db.user.delete({ where: { id: userId } });
}

// ✅ CORRECT: Auth + authz before any operation
export async function deleteUser(userId: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    throw new Error("You must be signed in");
  }
  if (!currentUser.isAdmin && currentUser.id !== userId) {
    throw new Error("Not authorized");
  }
  await deleteUserFromDB(userId); // Use DAL
}
```

### 3. NEVER trust client input
```typescript
// ❌ INCORRECT: Trusting client data
export async function updateRole(formData: FormData) {
  const isAdmin = formData.get("isAdmin") === "true";
  await db.user.update({ data: { isAdmin } }); // Vulnerable!
}

// ✅ CORRECT: Re-verify permissions server-side
export async function updateRole(formData: FormData) {
  const currentUser = await getCurrentUser();
  if (!currentUser?.isSuperAdmin) {
    return { success: false, message: "Not authorized" };
  }
  // Now safe to proceed...
}
```

### 4. Return state, don't redirect
```typescript
// ❌ INCORRECT: Don't call redirect in actions
redirect("/success");

// ✅ CORRECT: Return state and handle redirect in client
return { success: true, redirectTo: "/success" };
```

### 5. Validate all inputs with schema validation
```typescript
import { z } from "zod";

const CreateUserSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
});

export async function createUser(prevState: ActionState, formData: FormData) {
  const validatedFields = CreateUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
  });

  if (!validatedFields.success) {
    return {
      success: false,
      message: "Invalid fields",
      errors: validatedFields.error.flatten().fieldErrors,
    };
  }

  // Use validatedFields.data (sanitized)
}
```

### 6. Handle errors gracefully (don't leak internals)
```typescript
try {
  // action logic
} catch (error) {
  // Log full error server-side
  console.error("Action error:", error);

  // Return generic message to client (don't expose internals)
  return {
    success: false,
    message: "An error occurred. Please try again.",
  };
}
```

### 7. Revalidate after mutations
```typescript
revalidatePath("/affected-path");
// or
revalidateTag("users");
```

### 8. Avoid mutations during rendering
```typescript
// ❌ INCORRECT: Side effect during render
export default async function Page({ searchParams }) {
  if (searchParams.get("logout")) {
    cookies().delete("AUTH_TOKEN"); // Bad!
  }
  return <div>...</div>;
}

// ✅ CORRECT: Use Server Action
export default function Page() {
  return (
    <form action={logout}>
      <button type="submit">Logout</button>
    </form>
  );
}
```

## Closures Security

When defining Server Actions inside components, be aware that closed-over variables
are sent to the client (encrypted). Never close over sensitive data:

```typescript
// ⚠️ Sensitive data in closure (encrypted but still transmitted)
export default async function Page() {
  const secretKey = process.env.SECRET_KEY; // Don't do this!

  async function submit() {
    "use server";
    // secretKey is captured and sent to client (encrypted)
  }

  return <form action={submit}>...</form>;
}

// ✅ CORRECT: Read secrets inside the action
export default function Page() {
  async function submit() {
    "use server";
    const secretKey = process.env.SECRET_KEY; // Safe - read server-side
  }

  return <form action={submit}>...</form>;
}
```

## Using with useActionState

```tsx
"use client";

import { useActionState } from "react";
import { createUser } from "@/actions/user-actions";

const initialState = { success: false, message: "" };

export function UserForm() {
  const [state, formAction, isPending] = useActionState(
    createUser,
    initialState
  );

  return (
    <form action={formAction}>
      <input name="name" required />
      <input name="email" type="email" required />
      <button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : "Save"}
      </button>
      {state.message && (
        <p role="alert" className={state.success ? "text-green-600" : "text-red-600"}>
          {state.message}
        </p>
      )}
    </form>
  );
}
```

## Troubleshooting

### Error: "Failed to find Server Action"

**Cause**: Next.js creates encrypted, non-deterministic IDs for Server Actions. These IDs
are recalculated between builds. In multi-server environments (self-hosted), each instance
may have different encryption keys.

**Solutions**:

1. **Self-hosting with multiple servers**: Configure a consistent encryption key:
   ```bash
   # .env
   NEXT_SERVER_ACTIONS_ENCRYPTION_KEY="your-aes-gcm-encrypted-key"
   ```
   The key must be AES-GCM encrypted and consistent across all servers.

2. **Vercel**: Use [Skew Protection](https://vercel.com/docs/deployments/skew-protection) to
   keep assets and functions from previous versions available after a deploy.

3. **Local development**: If it occurs in development, restart the dev server (`npm run dev`).

4. **Corrupted cache**: Clear the Next.js cache:
   ```bash
   rm -rf .next
   npm run build
   ```

### Error: Action doesn't execute / Does nothing

Verify that:
- The function has `"use server"` at the top of the file OR inside the function
- The form uses `action={formAction}` (not `onSubmit`)
- There are no JavaScript errors in the browser console

### Error: "Functions cannot be passed directly to Client Components"

```typescript
// ❌ INCORRECT: Passing function directly
<ClientComponent onSubmit={serverAction} />

// ✅ CORRECT: Use in form action or useActionState
<form action={serverAction}>...</form>

// ✅ CORRECT: Wrap in client component
"use client";
export function FormWrapper({ action }) {
  const [state, formAction] = useActionState(action, initialState);
  return <form action={formAction}>...</form>;
}
```

## Security Checklist

Before deploying any Server Action, verify:

- [ ] `"use server"` directive is present
- [ ] User is authenticated (if required)
- [ ] User is authorized for the specific action
- [ ] All inputs are validated (use Zod or similar)
- [ ] Data access goes through DAL (not direct DB queries)
- [ ] No sensitive data in closures
- [ ] Error messages don't leak internal details
- [ ] Cache is revalidated after mutations
- [ ] DAL files are marked with `server-only`
- [ ] `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` configured (if multi-server self-hosting)
