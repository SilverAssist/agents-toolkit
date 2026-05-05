# Copilot Instructions

This file contains project-wide instructions for GitHub Copilot.

## 🔄 Copilot Agent Workflow for Complex Tasks

When implementing new features, refactoring code, or fixing complex issues, **always follow this systematic workflow**:

### Phase 1: Initial Analysis
1. **Analyze the request** - Understand the full scope, dependencies, and potential impacts
2. **Search existing code** - Use semantic search and grep to understand current implementation
3. **Identify components** - List all files, functions, and components that need changes
4. **Review documentation** - Check existing docs for patterns and conventions

### Phase 2: Planning Documentation
1. **Create planning document** - `docs/[feature-name]-plan.md` with:
   - Problem statement and objectives
   - Current architecture analysis
   - Proposed changes with before/after code examples
   - Risk assessment and mitigation strategies
   - Phase breakdown if complex
2. **Add action plan** - Detailed step-by-step implementation guide
3. **Create TODO list** - Use `manage_todo_list` tool to track all phases
4. **Commit planning** - `git commit -m "PROJECT-XXX: Add [feature] implementation plan"`

### Phase 3: Implementation by Phases
For each phase:
1. **Mark TODO as in-progress** - Update status before starting work
2. **Implement changes** - Make code changes following the plan
3. **Write/update tests** - Add unit tests, ensure regression tests pass
4. **Run tests** - `npm test` to verify no regressions
5. **Mark TODO as completed** - Update status after successful implementation
6. **Commit phase** - `git commit -m "PROJECT-XXX: Implement [feature] - Phase N"`

### Phase 4: Final Documentation
1. **Create final documentation** - `docs/[feature-name].md`
2. **Update related docs** - Update `project-overview.md`, `readme.md`, etc.
3. **Delete planning docs** - Remove temporary planning documents
4. **Final commit** - `git commit -m "PROJECT-XXX: Add [feature] documentation"`

### Key Principles
- ✅ **One commit per phase** - Create clear checkpoint commits
- ✅ **Test everything** - Run full test suite after each phase
- ✅ **No breaking changes** - Ensure backward compatibility
- ✅ **Document as you go** - Update docs with each phase
- ✅ **Type safety** - Maintain full TypeScript coverage

## Key Technologies & Frameworks

- **Next.js 15.x** with App Router for modern React development
- **React 19** for latest React features and optimizations
- **TypeScript** for comprehensive type safety
- **Tailwind CSS v4** with custom CSS variables and shadcn/ui design system
- **Jest & React Testing Library** for comprehensive testing

## Domain-Driven Design (DDD) Principles

This project follows **Domain-Driven Design** principles. See the `domain-driven-design` skill for detailed guidelines.

**Core Principles**:
1. **Group by Domain, Not by Type** - Organize files by business domain rather than technical type
2. **Clear Boundaries** - Each domain has well-defined responsibilities
3. **Colocation** - Related code (components, utils, tests) lives together

**Quick Rules**:
- ✅ Create domain folders that match business concepts
- ✅ Keep domain-specific utilities inside domain folders
- ✅ Place tests in `__tests__/` subfolders within each domain
- ❌ Don't create generic folders like "helpers", "services", "utils" at root level

## Barrel Export Pattern

Use **barrel exports** (`index.ts`) for folders with multiple internal files:

```typescript
// src/lib/api/index.ts
export * from "./client";
export * from "./endpoints";
export * from "./types";

// Usage - Clean imports from domain
import { apiClient, fetchUser } from "@/lib/api";
```
