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

## Model-tier discipline

Every shipped `.prompt.md` carries a hardcoded `model:` pin, written as a single value. The rule of thumb:

- **Checklist / mechanical work → cheap tier** (`Claude Haiku 4.5`). Prompts: `quality-check`, `review-code`, `fix-issues`, `add-tests`, `prepare-pr`, `finalize-*`, `analyze-*`, `audit-ai-seo`, `prepare-github-release`, `new-wp-*`.
- **Design / reasoning → smart tier** (`Claude Sonnet 5`). Prompts: `create-plan`, `work-ticket`, `work-github-issue`, `create-pr`, `create-github-pr`, `resolve-github-reviews`.

**Model boundaries on Copilot: prompt files and custom agents yes, skills no.** VS Code Copilot honours `model:` on `.prompt.md` files and `.agent.md` custom agents, but **not** on skills — skills inherit the invoking prompt's model. So a smart-tier orchestrator invoking `core-review` (or any other skill) inline runs the skill on the smart tier too. When a smart-tier orchestrator chains into another **prompt** that establishes a fresh `model:` boundary (an explicit new invocation of `quality-check.prompt.md`, `prepare-pr.prompt.md`, …), the invoked prompt's own pin wins. To force a cheap-tier delegate, invoke it as a **separate chat / fresh prompt invocation** rather than referencing it inline from the orchestrator. Alternatively, invoke `@core-review` — custom agents establish their own model boundary, so the cheap pin in `.github/agents/core-review.agent.md` is honoured when no explicit invocation model is supplied, even from within a smart-tier orchestrator.

**To change a tier, edit the `model:` line in `.github/prompts/<name>.prompt.md`.** There is no tier config and no CLI flag. The pin **wins over the picker** — VS Code Copilot consults the picker only when the invoked prompt has no `model:` frontmatter.

**Keep `model:` a single value, not a list.** A prioritized array is undocumented for prompt files and GitHub Copilot CLI rejects it outright (`model: Expected string, received array`). If the pinned model is unavailable, Copilot falls back to its own default — the toolkit does not ship fallback chains.

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
