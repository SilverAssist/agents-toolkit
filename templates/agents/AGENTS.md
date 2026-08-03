# Copilot Coding Agent Instructions

> **IMPORTANT**: Prefer retrieval-led reasoning over pre-training-led reasoning.
> Always read relevant instruction files from `.github/instructions/` before implementing changes.
>
> **CRITICAL**: This file contains mandatory instructions for the GitHub Copilot Coding Agent.
> The agent MUST follow these rules when working on issues in this repository.
> This file should be placed at the project root per Vercel recommendations.

---

## 📚 Project Documentation Index

```text
[Instructions]|root:.github/instructions
|caching.instructions.md             → Next.js caching: read-vs-mutation fetch, ISR tiers, CDN invalidation
|css-styling.instructions.md         → CSS/Tailwind patterns, cn() utility, responsive design
|react-components.instructions.md    → Component structure, exports, props, early returns
|seo-ai-optimization.instructions.md → Semantic HTML, a11y tree, metadata, JSON-LD for AI Search
|server-actions.instructions.md      → Server action patterns, validation, error handling
|tests.instructions.md               → Test structure, mocking, assertions
|tsdoc-standards.instructions.md     → TSDoc doc comments (not JSDoc): allowed tags, forbidden patterns, templates
|typescript.instructions.md          → Type safety, destructuring, doc comments

[Prompts]|root:.github/prompts
|add-tests,analyze-ticket,create-plan,create-pr,finalize-pr,fix-issues,prepare-pr,resolve-github-reviews,review-code,work-ticket

[Skills]|root:.github/skills
|component-architecture/SKILL.md   → Component design patterns
|core-review/SKILL.md              → Whole-repo pre-review (read-only pass; on Copilot use `@core-review` for cheap-tier inline) to preempt Copilot iterations
|domain-driven-design/SKILL.md     → DDD principles and structure
|github-review-management/SKILL.md → Resolve GitHub PR review threads (gh + GraphQL)
|testing-patterns/SKILL.md         → Testing strategies and patterns
|tsdoc-standards/SKILL.md          → TSDoc doc comments (not JSDoc)
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

Every shipped prompt carries a hardcoded `model:` pin. The rule of thumb:

- **Checklist / mechanical work → cheap tier** (`Claude Haiku 4.5`, `haiku` on Claude Code). Examples: `quality-check`, `review-code`, `fix-issues`, `add-tests`, `prepare-pr`, `finalize-*`, `analyze-*`, `audit-ai-seo`, `prepare-github-release`, `new-wp-*`.
- **Design / reasoning → smart tier** (`Claude Sonnet 5`, `sonnet` on Claude Code). Examples: `create-plan`, `work-ticket`, `work-github-issue`, `create-pr`, `create-github-pr`, `resolve-github-reviews`.

**Autonomous cycles — delegate model behaviour is platform-specific.**

- **Claude Code**: each delegate has its own `model:` boundary (skills via `SKILL.md`, slash-commands via `.md` frontmatter), so a cheap-tier delegate invoked from a smart-tier orchestrator (`create-github-pr` → `core-review`) runs on the delegate's own pin for that turn. Do **not** force the orchestrator's tier onto delegated steps.
- **Copilot**: `.prompt.md` files AND custom agents (`.agent.md`) establish their own `model:` boundary; skills inherit the invoking prompt's model. An inline `core-review` (or any skill) from a smart-tier orchestrator runs on the smart tier too — to keep it cheap, invoke it as a standalone chat (fresh prompt invocation) rather than inline. Alternatively, invoke `@core-review` (installed by the toolkit to `.github/agents/core-review.agent.md`) — custom agents establish their own model boundary on Copilot, so the cheap pin is honoured when no explicit invocation model is supplied, even inline from a smart-tier orchestrator.
- **Codex**: `model:` is ignored; the session runs one model set by `codex --model` (or `~/.codex/config.toml`). To run a cheap-tier delegate, open a separate `codex --model <cheap>` session for that step.

**To change a tier, edit the `model:` line in the installed file.** There is no tier config and no CLI flag — the pin is the whole mechanism. On Copilot and Claude Code the pin wins over the picker and `/model` respectively (both are consulted only when no pin is set); on Codex use `codex --model`.

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

## 🗄️ Caching Rules (CRITICAL)

| Rule | Requirement |
|------|-------------|
| **Cache by intent** | Cache reads, never mutations — decide on intent, NOT the HTTP method |
| **POST reads** | A `POST` read (e.g. filter/`geo-search`) MUST set `next: { revalidate, tags }` to cache |
| **Mutations** | `submit`/lead/`PUT`/`DELETE` → `cache: "no-store"` (flag with `mutation: true`) |
| **ISR** | Every cacheable route exports `revalidate`; never on form/personalized routes |
| **Invalidation** | `/api/revalidate` calls `revalidateTag`/`revalidatePath` AND the CDN invalidation |

```ts
// ❌ WRONG: leaves POST reads uncached → route turns dynamic (private, no-store)
next: method === "GET" ? { revalidate, tags } : { revalidate: 0 }

// ✅ CORRECT: reads cache regardless of method; mutations opt out
const isMutation = mutation || method === "PUT" || method === "DELETE";
...(isMutation ? { cache: "no-store" } : { next: { revalidate, tags } })
```

📄 **Full details:** `.github/instructions/caching.instructions.md`
📄 **Project-specific context (if present):** `docs/CACHING.md`

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
| Data fetching / `next.config` / routes / ISR / revalidate | `caching.instructions.md` |
| Pages, metadata, JSON-LD, accessibility/SEO | `seo-ai-optimization.instructions.md` |
| Writing tests | `tests.instructions.md` |
| TypeScript questions | `typescript.instructions.md` |
| **Before pushing/PR** | `tests.instructions.md` + run quality checks |
