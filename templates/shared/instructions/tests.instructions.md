---
applyTo: "**/*.test.{ts,tsx}"
---
# Testing Standards

## Test File Location

Place tests in `__tests__/` folders next to the code:

```
components/
└── button/
    ├── index.tsx
    └── __tests__/
        └── button.test.tsx
```

## Test Structure

Use `describe` and `it` blocks:

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Button } from '../index';

describe('Button', () => {
  const defaultProps = {
    onClick: jest.fn(),
    children: 'Click me',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders children correctly', () => {
      render(<Button {...defaultProps} />);
      expect(screen.getByText('Click me')).toBeInTheDocument();
    });
  });

  describe('behavior', () => {
    it('calls onClick when clicked', async () => {
      const user = userEvent.setup();
      render(<Button {...defaultProps} />);
      
      await user.click(screen.getByRole('button'));
      
      expect(defaultProps.onClick).toHaveBeenCalledTimes(1);
    });
  });
});
```

## Test Categories

Include tests for:

### Rendering
- Component renders without crashing
- All expected elements are present
- Conditional rendering works

### Props
- Default props work correctly
- Custom props are applied
- Required props are validated

### User Interactions
- Click handlers work
- Form inputs update
- Keyboard navigation

### Edge Cases
- Empty data handled
- Null/undefined handled
- Error states displayed

## Mocking

```typescript
// Mock a module
jest.mock('@/lib/api', () => ({
  fetchData: jest.fn(),
}));

// Mock a hook
jest.mock('@/hooks/use-user', () => ({
  useUser: () => ({ user: { name: 'Test' }, isLoading: false }),
}));
```

## Assertions

```typescript
// Prefer specific assertions
expect(screen.getByRole('button')).toBeInTheDocument();
expect(screen.getByText('Hello')).toBeVisible();
expect(element).toHaveClass('active');
expect(handler).toHaveBeenCalledWith(expectedArgs);
```
