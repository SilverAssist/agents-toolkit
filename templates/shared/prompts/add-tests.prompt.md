---
agent: agent
description: Add tests for a component or function
---

# Add Tests

Add tests for **{target-file}** or **{component-name}**.

## Prerequisites
- Reference: `.github/instructions/tests.instructions.md`

## Steps

### 1. Analyze Target

Read the target file to understand:
- Exported functions/components
- Props and interfaces
- Dependencies and imports
- Edge cases to test

### 2. Determine Test Location

Based on project structure:
- Components: `src/components/{name}/__tests__/{name}.test.tsx`
- Hooks: `src/hooks/__tests__/{hook-name}.test.ts`
- Utils: `src/lib/__tests__/{util-name}.test.ts`
- Actions: `src/actions/__tests__/{action-name}.test.ts`

### 3. Create Test File

Use this template:

```typescript
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ComponentName from '../index';

describe('ComponentName', () => {
  // Setup
  const defaultProps = {
    // default test props
  };

  // Rendering tests
  describe('rendering', () => {
    it('renders without crashing', () => {
      render(<ComponentName {...defaultProps} />);
      expect(screen.getByRole('...')).toBeInTheDocument();
    });

    it('renders with custom props', () => {
      render(<ComponentName {...defaultProps} customProp="value" />);
      expect(screen.getByText('value')).toBeInTheDocument();
    });
  });

  // Behavior tests
  describe('behavior', () => {
    it('handles click events', async () => {
      const user = userEvent.setup();
      const handleClick = jest.fn();
      
      render(<ComponentName {...defaultProps} onClick={handleClick} />);
      await user.click(screen.getByRole('button'));
      
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  // Edge cases
  describe('edge cases', () => {
    it('handles empty data', () => {
      render(<ComponentName {...defaultProps} data={[]} />);
      expect(screen.getByText('No data')).toBeInTheDocument();
    });

    it('handles null values', () => {
      render(<ComponentName {...defaultProps} value={null} />);
      expect(screen.queryByText('error')).not.toBeInTheDocument();
    });
  });
});
```

### 4. Test Categories

Include tests for:

#### Rendering
- [ ] Renders without crashing
- [ ] Renders all expected elements
- [ ] Conditional rendering works

#### Props
- [ ] Default props work
- [ ] Custom props applied correctly
- [ ] Required props validated

#### User Interactions
- [ ] Click handlers work
- [ ] Form inputs update
- [ ] Keyboard navigation

#### State Changes
- [ ] Initial state correct
- [ ] State updates properly
- [ ] Side effects trigger

#### Edge Cases
- [ ] Empty data handled
- [ ] Null/undefined handled
- [ ] Error states displayed

### 5. Run Tests

```bash
# Preferred when test runner supports file filters (Jest/Vitest):
npm run test -- --testPathPattern="{test-file}"

# Fallback for projects without file-filter flags:
npm run test --if-present
```

### 6. Check Coverage

```bash
# If coverage is configured in the project:
npm run test -- --coverage
```

## Output

### Test Summary
- Tests created: N
- Passing: N
- Coverage: X%

### Test Cases
1. ✅ Test case 1
2. ✅ Test case 2
3. ✅ Test case 3

### Coverage Report
| Metric | Coverage |
|--------|----------|
| Statements | X% |
| Branches | X% |
| Functions | X% |
| Lines | X% |
