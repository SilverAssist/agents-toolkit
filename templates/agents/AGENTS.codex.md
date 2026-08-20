# Codex Agent Instructions

> **IMPORTANT**: Prefer retrieval-led reasoning over pre-training-led reasoning.
> Always read relevant instruction files from `.github/instructions/` before implementing changes.
>
> **CRITICAL**: This file contains mandatory instructions for Codex when working on this repository.
> The agent MUST follow these rules when working on issues in this repository.
> This file should be placed at the project root.

---

## 📚 Project Documentation Index

```text
[Instructions]|root:.github/instructions
|css-styling.instructions.md       → CSS/Tailwind patterns, cn() utility, responsive design
|react-components.instructions.md  → Component structure, exports, props, early returns
|server-actions.instructions.md    → Server action patterns, validation, error handling
|tests.instructions.md             → Test structure, mocking, assertions
|typescript.instructions.md        → Type safety, destructuring, JSDoc

[Prompts]|root:.github/prompts
|add-tests,analyze-ticket,create-plan,create-pr,finalize-pr,fix-issues,prepare-pr,review-code,work-ticket

[Skills]|root:.github/skills
|component-architecture/SKILL.md → Component design patterns
|core-review/SKILL.md            → Pre-review inline read-only pass, scoped by `--budget`, to preempt reviewer iterations
|domain-driven-design/SKILL.md   → DDD principles and structure
|github-review-management/SKILL.md → Resolve GitHub PR review threads (gh + GraphQL)
|testing-patterns/SKILL.md       → Testing strategies and patterns
```

---

## 🔄 Agent Workflow (Complex Tasks)

| Phase | Actions |
|-------|---------|
| **1. Analysis** | Analyze request → Search existing code → Identify components → Review docs |
| **2. Planning** | Create `docs/[feature]-plan.md` → Track TODOs in the plan doc (or task tracker) → Commit plan |
| **3. Implementation** | For each phase: mark in-progress → implement → test → commit → mark completed |
| **4. Documentation** | Create final docs → Update related files → Cleanup planning docs → Final commit |

### Key Principles

✅ One commit per phase • ✅ Test after each phase • ✅ No breaking changes
✅ Document as you go • ✅ Type safety always • ✅ Follow existing patterns

---

## 💰 Model-tier discipline

Every shipped prompt carries a hardcoded `model:` pin. **Codex ignores it** — the field exists for Copilot and Claude Code, and Codex reads the same files. Treat it as a recommendation and set the session model with `codex --model`. The rule of thumb:

- **Checklist / mechanical work → cheap tier** (pinned `Claude Haiku 4.5`). Examples: `quality-check`, `review-code`, `fix-issues`, `add-tests`, `prepare-pr`, `finalize-*`, `analyze-*`, `audit-ai-seo`, `prepare-github-release`, `new-wp-*`.
- **Design / reasoning → smart tier** (pinned `Claude Sonnet 5`). Examples: `create-plan`, `work-ticket`, `work-github-issue`, `create-pr`, `create-github-pr`, `resolve-github-reviews`.

**Codex is session-wide, so delegates cannot switch mid-session.** Codex has no per-prompt or per-skill `model:` field; the model is set once per session by `codex --model` (or `~/.codex/config.toml`) and every prompt in that session runs on it. To run a cheap-tier delegate (`quality-check`, `core-review`, `finalize-pr`, …) from a smart-tier session, open a **separate** `codex --model <cheap>` session for that step and relay its output back to the orchestrator's session.

Because Codex does not recognise `model:` as a prompt field, your editor's linter may flag it as an unknown key. That warning is **expected and non-blocking** — the field is inert on Codex, not invalid.

**The same applies to `.agent.md` files** that may be present in `.github/agents/` from a Copilot install — Codex does not recognise the custom-agent format, and the `model:` field there is also inert. Use `codex --model` to set the session tier. (Codex skips installing `.agent.md` files itself; these notes apply only when a repo already has them from a Copilot install.)

---

## ⚙️ Code Conventions (Quick Reference)

| Rule | Standard |
|------|----------|
| **Imports** | Alphabetical order, absolute paths with `@/` |
| **Naming** | Files: `kebab-case` • Components: `PascalCase` • Functions: `camelCase` |
| **Types** | No `any` — use `interface` or `type` |
| **Errors** | `try/catch` for all async operations |
| **Comments** | JSDoc in English for public functions |

---

## 🧩 Component Rules (CRITICAL)

| Rule | Requirement |
|------|-------------|
| **Folders** | `kebab-case` only (`user-profile/`, NOT `UserProfile/`) |
| **Structure** | `component-name/index.tsx` (never standalone `.tsx` files) |
| **Exports** | `export default function ComponentName` (default export, PascalCase) |
| **Props** | Interface inside file, before function, named `{Component}Props` |

```text
✅ components/user-card/index.tsx
❌ components/UserCard.tsx
❌ components/userCard/index.tsx
```

📄 **Full details:** `.github/instructions/react-components.instructions.md`

---

## ⚛️ React Rules (CRITICAL)

| Rule | Requirement |
|------|-------------|
| **Hook Placement** | ALL hooks BEFORE any conditional returns |
| **useState** | Simple state (1-3 values) |
| **useReducer** | Complex state (4+ values or complex transitions) |
| **useActionState** | Server actions with forms (React 19) |

```tsx
// ✅ CORRECT: Hooks first, then early returns
export default function Component({ data }: Props) {
  const [state, setState] = useState(initial);
  const handleClick = useCallback(() => {}, []);

  if (!data) return null;  // Early return AFTER hooks
  return <div>...</div>;
}
```

📄 **Full details:** `.github/instructions/react-components.instructions.md`

---

## 🖥️ Server Actions (CRITICAL)

| Rule | Requirement |
|------|-------------|
| **Directive** | Always `"use server"` at top |
| **Signature** | `(prevState: ActionState, formData: FormData) => Promise<ActionState>` |
| **Return** | Always `{ success, message, timestamp }` |

📄 **Full details:** `.github/instructions/server-actions.instructions.md`

---

## 🧪 Testing Rules

| Rule | Requirement |
|------|-------------|
| **Location** | `__tests__/` subfolder in each component/domain |
| **Naming** | `[component-name].test.tsx` or `[feature].test.ts` |
| **Coverage** | 100% for reducers, unit tests for actions & utils |
| **Mocks** | Define mocks BEFORE imports |

```typescript
// ✅ CORRECT: Mock first, then import
const mockFn = jest.fn();
jest.mock('@/lib/api', () => ({ apiClient: mockFn }));
import { myFunction } from '@/lib/my-module';
```

📄 **Full details:** `.github/instructions/tests.instructions.md`

---

## 📝 Git Conventions

| Type | Format |
|------|--------|
| **Commit** | `JIRA-XXX: Brief description` (e.g., `WEB-123: Add user authentication`) |
| **Types** | `feat` • `fix` • `docs` • `refactor` • `test` • `chore` |
| **Branch** | `feature/JIRA-XXX-description` • `bugfix/JIRA-XXX-description` |

> ⚠️ **CRITICAL**: Always include the Jira ticket prefix in commits. Never commit without it.

---

## 🚦 Pre-commit Quality Gates (MANDATORY)

> **CRITICAL**: Before pushing code or creating a PR to protected branches (`dev`, `staging`, `master`, `main`),
> you MUST complete ALL quality checks. This prevents failed pipelines and broken builds.

### Required Checks Before Push/PR

| Check | Command | Must Pass |
|-------|---------|-----------|
| **TypeScript** | `npm run type-check --if-present` (or `npx tsc --noEmit`) | ✅ Zero errors |
| **Linting** | `npm run lint --if-present` | ✅ Zero errors |
| **Unit Tests** | `npm run test --if-present` | ✅ All passing |
| **Build** | `npm run build --if-present` | ✅ Successful |

### Quality Checklist

```text
Before ANY push to dev/staging/main:
□ All TypeScript errors resolved
□ All ESLint warnings addressed
□ All unit tests passing locally
□ Build completes without errors
□ No console.log() left in code
□ Commit message has Jira prefix (e.g., WEB-123: ...)
```

### Why This Matters

- ❌ **Without local testing** → Failed CI/CD pipelines → Wasted time & resources
- ✅ **With local testing** → Clean pipelines → Faster deployments

> If a script is not defined in `package.json`, skip that script check or use the documented fallback command.

📄 **Testing details:** `.github/instructions/tests.instructions.md`
📄 **Testing patterns:** `.github/skills/testing-patterns/SKILL.md`

---

## 🔍 When to Read Instruction Files

| Task | Read This File |
|------|----------------|
| Creating/editing components | `react-components.instructions.md` |
| Writing CSS/Tailwind | `css-styling.instructions.md` |
| Creating server actions | `server-actions.instructions.md` |
| Writing tests | `tests.instructions.md` |
| TypeScript questions | `typescript.instructions.md` |
| **Before pushing/PR** | `tests.instructions.md` + run quality checks |
