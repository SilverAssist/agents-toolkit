# Claude Code Instructions

This file contains project-wide instructions for Claude Code.

## Agent Workflow for Complex Tasks

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
3. **Create TODO list** - Use the TodoWrite tool to track all phases
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

## Slash Commands

Custom slash commands are available in `.claude/commands/`:

| Command | Description |
|---------|-------------|
| `/analyze-ticket` | Analyze a Jira ticket without making changes |
| `/create-plan` | Create an implementation plan for a ticket |
| `/work-ticket` | Start working on a Jira ticket with full workflow setup |
| `/prepare-pr` | Prepare code for pull request review |
| `/create-pr` | Create and submit a pull request |
| `/finalize-pr` | Finalize and merge a pull request |
| `/review-code` | Review code for quality and issues |
| `/fix-issues` | Fix identified code issues |
| `/add-tests` | Add tests for existing code |

## Key Technologies & Frameworks

- **Next.js 15.x** with App Router for modern React development
- **React 19** for latest React features and optimizations
- **TypeScript** for comprehensive type safety
- **Tailwind CSS v4** with custom CSS variables and shadcn/ui design system
- **Jest & React Testing Library** for comprehensive testing

## Domain-Driven Design (DDD) Principles

This project follows **Domain-Driven Design** principles.

**Core Principles**:
1. **Group by Domain, Not by Type** - Organize files by business domain rather than technical type
2. **Clear Boundaries** - Each domain has well-defined responsibilities
3. **Colocation** - Related code (components, utils, tests) lives together

**Quick Rules**:
- ✅ Create domain folders that match business concepts
- ✅ Keep domain-specific utilities inside domain folders
- ✅ Place tests in `__tests__/` subfolders within each domain
- ❌ Don't create generic folders like "helpers", "services", "utils" at root level

## Key Conventions

### Code Style & Organization

- **Imports**: Always organize imports alphabetically within each group
- **API Functions**: Must have descriptive JSDoc comments in English
- **Types**: Define interfaces and types properly, not directly in components
- **No `any` Type**: Always define explicit types using `type` or `interface`
- **File Naming**: All files should use kebab-case (e.g., `use-hash.ts`, `contact-form.tsx`)
- **Object Destructuring**: Always use destructuring when iterating over objects
- **Error Handling**: Apply robust error handling with try/catch for async operations
- **Import Paths**: Always use absolute imports with `@/` prefix

### Component Structure & Naming

**CRITICAL: All components must follow these strict conventions:**

#### 1. Folder & File Naming

- **Folder names**: MUST use kebab-case (e.g., `user-profile/`, `checkout-wizard/`)
- **File structure**: Every component MUST be in its own folder with an `index.tsx` file
- **❌ NEVER**: Use camelCase or PascalCase for folder names
- **❌ NEVER**: Create standalone component files like `Component.tsx` at root level

```
✅ CORRECT:
src/components/user-profile/index.tsx
src/components/contact-form/index.tsx

❌ INCORRECT:
src/components/UserProfile.tsx
src/components/userProfile/index.tsx
```

#### 2. Component Export Pattern

- **Function name**: MUST use PascalCase for the exported function
- **Export statement**: MUST use `export default function` for components
- **Barrel file**: Re-export with a named alias from the domain `index.ts`
- **Single responsibility**: Each file should export ONLY the component function

```typescript
// ✅ CORRECT: src/components/user-profile/index.tsx
interface UserProfileProps {
  userId: string;
  className?: string;
}

export default function UserProfile({ userId, className }: UserProfileProps) {
  // Component implementation
}

// ✅ CORRECT: src/components/index.ts (barrel)
export { default as UserProfile } from "./user-profile";
```

#### 3. Props Interface Definition

- **MUST**: Define props interface INSIDE the component file
- **Interface name**: MUST match component name + "Props" suffix (PascalCase)
- **Location**: Define interface immediately BEFORE the component function

#### 4. Separation of Concerns

- **Component file**: ONLY the component function and its props interface
- **Helper functions**: Create separate `helpers.ts` or `utils.ts` in same folder
- **Types/Interfaces**: Create separate `types.ts` if multiple types are shared
- **Constants**: Create separate `constants.ts` for component-specific constants

---

## React Patterns

### Hook Placement Rules (CRITICAL)

**✅ Correct:** All hooks before conditional returns

```typescript
export default function Component({ data }: Props) {
  const [state, setState] = useState(initialState);
  const handleClick = useCallback(() => {}, []);

  // Early returns AFTER all hooks
  if (!data) return null;
  
  return <div>...</div>;
}
```

**❌ Incorrect:** Hooks after conditional returns

```typescript
export function Component({ data }: Props) {
  if (!data) return null; // ❌ Early return before hooks
  
  const [state, setState] = useState(initialState); // ❌ Error!
  return <div>...</div>;
}
```

---

## Git Commit Guidelines

### Commit Message Format

```
TYPE-XXX: Brief description

- Detailed change 1
- Detailed change 2
```

### Commit Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Branch Naming

- `feature/TYPE-XXX-brief-description`
- `bugfix/TYPE-XXX-brief-description`
- `hotfix/TYPE-XXX-brief-description`
