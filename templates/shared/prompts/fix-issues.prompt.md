---
agent: agent
description: Fix failing tests and lint errors
---

# Fix Code Issues

Fix failing tests, lint errors, and type errors in the codebase.

## Steps

### 1. Run All Checks

```bash
npm run lint --if-present 2>&1 | head -100
npm run type-check --if-present 2>&1 | head -100
if [ -f tsconfig.json ]; then npx tsc --noEmit 2>&1 | head -100; fi
npm run test --if-present 2>&1 | head -100
```

### 2. Categorize Issues

Sort issues by type:
- **Lint errors**: ESLint violations
- **Type errors**: TypeScript compilation errors
- **Test failures**: Failed unit tests

### 3. Fix Lint Errors

#### Auto-fixable
```bash
npm run lint --if-present -- --fix
```

#### Manual fixes
For each remaining lint error:
1. Read the error message
2. Locate the file and line
3. Apply the appropriate fix
4. Verify fix resolved the issue

### 4. Fix Type Errors

For each type error:
1. Read the TypeScript error message
2. Understand the type mismatch
3. Apply fix:
   - Add missing type
   - Fix type assertion
   - Update interface
   - Handle null/undefined

### 5. Fix Test Failures

For each failing test:
1. Read the test output
2. Understand what's expected vs actual
3. Determine if issue is:
   - **Test is wrong**: Update test
   - **Code is wrong**: Fix implementation
   - **Missing mock**: Add mock data

### 6. Verify All Fixed

```bash
npm run lint --if-present
npm run type-check --if-present
if [ -f tsconfig.json ]; then npx tsc --noEmit; fi
npm run test --if-present
npm run build --if-present
```

## Output

### Fixed Issues

| Type | Count | Files |
|------|-------|-------|
| Lint | N | file1, file2 |
| Types | N | file3, file4 |
| Tests | N | test1, test2 |

### Remaining Issues
List any issues that couldn't be auto-fixed.

### Changes Made
Summary of fixes applied.

## Notes
- Always commit after fixing each category
- Run full validation after all fixes
- Some issues may require architectural changes
