# Validations Partial

Reusable validation steps for code quality checks.

## Usage

Include these steps in prompts that require code validation before proceeding.

---

## Code Quality Validation Steps

### Step: Run Validations

Before running checks, inspect `package.json` scripts and use project-supported commands.

Use this order:
- Lint: `npm run lint` (if script exists)
- TypeScript: `npm run type-check` (if script exists), otherwise `npx tsc --noEmit` when `tsconfig.json` exists
- Tests: `npm run test` (if script exists)
- Build (recommended before PR to protected branches): `npm run build` (if script exists)

**Run all code quality checks:**

1. **Lint check**:
   - Run `npm run lint --if-present` to check for linting errors
   - Fix any auto-fixable issues with `npm run lint --if-present -- --fix`
   - Report any remaining issues that need manual attention

2. **Type check**:
   - Run `npm run type-check --if-present` if available
   - If there is no `type-check` script and `tsconfig.json` exists, run `npx tsc --noEmit`
   - Identify and fix any type errors
   - Ensure no `any` types were introduced

3. **Test suite**:
   - Run `npm run test --if-present` to execute all unit tests
   - Review test coverage if available
   - Identify any failing tests and suggest fixes
   - Ensure no regressions were introduced

4. **Build check**:
   - Run `npm run build --if-present` before PR/push to protected branches
   - Ensure no build-time regressions

5. **Report results**:
   - ✅ List all passed checks
   - ⚠️ List warnings that should be addressed
   - ❌ List blockers that must be fixed before proceeding

---

## Quick Validation (Minimal)

For quick checks without full test suite:

```bash
npm run lint --if-present
npm run type-check --if-present
if [ -f tsconfig.json ]; then npx tsc --noEmit; fi
```

---

## Full Validation (Comprehensive)

For complete validation before PR:

```bash
npm run lint --if-present
npm run type-check --if-present
if [ -f tsconfig.json ]; then npx tsc --noEmit; fi
npm run test --if-present
npm run build --if-present
```

---

## Validation Checklist

- [ ] No linting errors
- [ ] No TypeScript errors
- [ ] All tests pass
- [ ] No `console.log` or debug statements
- [ ] No sensitive data exposed (API keys, secrets)
- [ ] No `any` types introduced
- [ ] JSDoc comments on new functions
