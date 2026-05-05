# Documentation Partial

Reusable documentation standards and steps for prompts.

## Usage

Include these steps in prompts that require documentation checks or creation.

---

## Documentation Standards

### Step: Verify Documentation

1. **Check JSDoc comments**:
   - All new/modified functions have JSDoc
   - Include `@param`, `@returns`, `@example` where applicable
   - Write in English

2. **Check component documentation**:
   - Props interfaces are defined and documented
   - Complex logic has inline comments
   - Component usage examples exist

3. **Check README updates**:
   - New features documented if user-facing
   - Configuration changes noted
   - Breaking changes highlighted

---

## JSDoc Standards

### Function Documentation

```typescript
/**
 * Formats a date string for display.
 * 
 * @param date - The date to format (ISO string or Date object)
 * @param locale - The locale for formatting (default: 'en-US')
 * @returns Formatted date string
 * @example
 * formatDate('2024-01-15') // 'January 15, 2024'
 * formatDate('2024-01-15', 'es-ES') // '15 de enero de 2024'
 */
export function formatDate(date: string | Date, locale = 'en-US'): string {
  // implementation
}
```

### Component Documentation

```typescript
/**
 * User profile card displaying avatar and basic information.
 * 
 * @example
 * <UserCard 
 *   user={{ name: 'John Doe', email: 'john@example.com' }}
 *   showEmail={true}
 * />
 */
export default function UserCard({ user, showEmail }: UserCardProps) {
  // implementation
}
```

---

## Documentation Files

### Planning Documents

Location: `docs/{feature-name}-plan.md`

Template:
```markdown
# {Feature Name} Implementation Plan

## Problem Statement
What problem are we solving?

## Current Architecture
How does it work now?

## Proposed Changes
What needs to change?

## Risk Assessment
- Risk 1: Description
- Mitigation: Solution

## Phase Breakdown

### Phase 1: {Name}
- [ ] Task 1
- [ ] Task 2

### Phase 2: {Name}
- [ ] Task 1
- [ ] Task 2

## Testing Strategy
How will we validate this works?

## Rollback Plan
How to revert if issues arise?
```

---

### Feature Documentation

Location: `docs/{feature-name}.md`

Template:
```markdown
# {Feature Name}

## Overview
Brief description of the feature.

## Usage

### Basic Usage
```typescript
// Example code
```

### Advanced Usage
```typescript
// More complex example
```

## Configuration
Any configuration options.

## API Reference
If applicable, API details.

## Troubleshooting
Common issues and solutions.
```

---

## Step: Create Planning Document

1. **Determine file name**:
   - Convert feature to kebab-case
   - Pattern: `docs/{feature-name}-plan.md`

2. **Include sections**:
   - Problem Statement
   - Current Architecture
   - Proposed Changes
   - Risk Assessment
   - Phase Breakdown
   - Testing Strategy

3. **Commit document**:
   ```bash
   git add docs/{feature-name}-plan.md
   git commit -m "TICKET-ID: Add {feature} implementation plan"
   ```

---

## Step: Create Final Documentation

1. **After implementation complete**:
   - Create `docs/{feature-name}.md` with usage guide
   - Update any related documentation
   - Delete planning document if no longer needed

2. **Commit documentation**:
   ```bash
   git add docs/
   git commit -m "TICKET-ID: Add {feature} documentation"
   ```

---

## Documentation Checklist

### Code Documentation
- [ ] JSDoc on all public functions
- [ ] Props interfaces documented
- [ ] Complex logic has comments
- [ ] Type definitions have descriptions

### Project Documentation
- [ ] Feature documented in `docs/`
- [ ] README updated if needed
- [ ] CHANGELOG updated
- [ ] Migration guide if breaking changes

### PR Documentation
- [ ] Clear PR title with ticket ID
- [ ] Description explains changes
- [ ] Testing notes included
- [ ] Screenshots for UI changes
