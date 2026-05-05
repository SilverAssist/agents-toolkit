---
name: testing-patterns
description: Guide for writing tests with Jest and React Testing Library. Use this when creating tests, debugging test failures, or implementing test patterns for Server Actions and Next.js 15.
---

# Testing Patterns Skill

When writing tests in this project, follow these patterns specific to Next.js 15 and React 19.

## Critical Next.js 15 Testing Constraints

### ❌ Async Server Components - NOT Fully Supported

```typescript
// ❌ CANNOT test async Server Components with Jest
export default async function ServerComponent() {
  const data = await fetch('https://api.example.com/data');
  return <div>{data.title}</div>;
}

// ❌ This will fail in Jest
describe('ServerComponent', () => {
  it('should render', async () => {
    const { container } = render(await ServerComponent());  // Error!
  });
});

// ✅ Solution: Use E2E tests (Playwright) for async components
```

### ❌ API Routes - Avoid Testing in Jest

```typescript
// ❌ Web API compatibility issues
import { POST } from '@/app/api/webhook/route';

describe('Webhook', () => {
  it('should process', async () => {
    const request = new NextRequest(...);  // ❌ Error: Request not defined
    await POST(request);
  });
});

// ✅ Solution: Test Server Actions instead
```

## Mock Setup Order - CRITICAL

### Mocks MUST come BEFORE imports

```typescript
// ✅ CORRECT: Mock first, then import
const mockStripeCreate = jest.fn();

jest.mock('stripe', () => {
  return class MockStripe {
    checkout = {
      sessions: {
        create: (...args: unknown[]) => mockStripeCreate(...args)
      }
    };
  };
});

// THEN import
import { createCheckoutSession } from '@/actions/checkout';

// ❌ INCORRECT: Import before mock
import { createCheckoutSession } from '@/actions/checkout';  // Too early!

jest.mock('stripe', () => ({
  // Mock comes too late - already imported
}));
```

## Server Action Testing Pattern

### Basic Server Action Test

```typescript
// 1. Setup mocks BEFORE imports
const mockCreateLead = jest.fn();
jest.mock('@/lib/salesforce', () => ({
  createSalesforceRecord: mockCreateLead,
}));

// 2. Import AFTER mocks
import { submitWizardToSalesforce } from '@/actions/salesforce-wizard';

describe('submitWizardToSalesforce', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockCreateLead.mockResolvedValue({
      id: 'a1B123ABC',
      success: true,
    });
  });

  it('should create Salesforce lead', async () => {
    // 3. Create FormData
    const formData = new FormData();
    formData.append('email', 'test@example.com');
    formData.append('firstName', 'John');

    // 4. Call with prevState (useActionState signature)
    const result = await submitWizardToSalesforce(
      { success: false, message: '', timestamp: 0 },
      formData
    );

    // 5. Assert
    expect(result.success).toBe(true);
    expect(result.leadId).toBeDefined();
  });
});
```

### useActionState Signature - CRITICAL

```typescript
// Server Actions for useActionState MUST have this signature:
export async function action(
  prevState: ActionState,    // First param: previous state
  formData: FormData         // Second param: form data
): Promise<ActionState> {
  // Implementation
}

// ❌ INCORRECT signature
export async function action(formData: FormData) { }  // Missing prevState!
```

## Type Safety in Tests

### Type Check BEFORE Tests

```bash
# Type check only (no test execution)
npm run type-check

# Both type check + tests (CI mode)
npm run test:ci
```

## beforeEach Pattern

```typescript
describe('MyTests', () => {
  beforeEach(() => {
    // ✅ ALWAYS clear mocks
    jest.clearAllMocks();
    
    // Reset mock implementations
    mockFunction.mockResolvedValue(defaultResponse);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });
});
```

## Integration Testing Pattern

```typescript
// src/__tests__/integration/flow.test.ts

// 1. MOCKS SETUP (before imports)
const mockStripeCreate = jest.fn();
jest.mock('stripe', () => class MockStripe {
  checkout = { sessions: { create: mockStripeCreate } };
});

// 2. IMPORTS (after mocks)
import { createCheckoutSessionAction } from '@/actions/create-checkout-session';

// 3. TEST SUITE
describe('Payment Flow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    mockStripeCreate.mockResolvedValue({
      id: 'cs_test_123',
      url: 'https://checkout.stripe.com/pay/cs_test_123',
    });
  });
  
  it('should complete full flow', async () => {
    const formData = new FormData();
    formData.append('email', 'test@example.com');
    
    const result = await createCheckoutSessionAction(
      { success: false, url: '', error: '', timestamp: 0 },
      formData
    );
    
    expect(result.success).toBe(true);
  });
});
```

## Testing Checklist

Before committing tests:

- [ ] **Mock before import** - All mocks defined before imports
- [ ] **Clear mocks** - `jest.clearAllMocks()` in `beforeEach`
- [ ] **Test Server Actions** - Not API routes
- [ ] **Match actual types** - Assertions match real return types
- [ ] **Type check passes** - `npm run type-check` succeeds
- [ ] **All tests pass** - `npm test` succeeds

## Quick Commands

```bash
# Run all tests
npm test

# Run specific test file
npm test -- payment-flow-integration

# Run tests in watch mode
npm test -- --watch

# Type check without tests
npm run type-check

# Both type check and tests
npm run test:ci
```

## Common Pitfalls

### ❌ Testing Implementation Details

```typescript
// ❌ BAD: Testing internal state
expect(component.state.isLoading).toBe(true);

// ✅ GOOD: Testing user-visible behavior
expect(screen.getByText('Loading...')).toBeInTheDocument();
```
