# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Cheap-first model-tier discipline across all three agents ([#39](https://github.com/SilverAssist/agents-toolkit/issues/39)). Every shipped prompt and the `core-review` skill carry a **hardcoded** `model:` pin: mechanical work runs on the cheap tier, design work on the smart tier. There is no tier configuration, no CLI flag, and nothing resolved at install time — to change a tier you edit the `model:` line in the installed file.

**Why no configuration surface.** An earlier draft of this release shipped a `models` block in `.agents-toolkit.json`, a `--model-pins {on,off}` flag, and install-time frontmatter rewriting for Copilot and skills. It was removed before merge: a model-selection layer spanning three agents whose catalogues move independently costs more to maintain than it saves, and it made the shipped documentation wrong in a way that was not obvious (the docs said "reinstall to apply", but `install` skips files that already exist — only `update` overwrites). Pins in files, documented, are the whole mechanism.

### Added

- **Explicit `model:` pin on all 19 shipped prompts**, written as a single scalar value plus a `**Model:**` header line under each H1 explaining the tier and how to change it.
  - **Cheap tier** — `Claude Haiku 4.5` on 13 checklist/mechanical prompts: `add-tests`, `analyze-github-issue`, `analyze-ticket`, `audit-ai-seo`, `finalize-github-pr`, `finalize-pr`, `fix-issues`, `new-wp-component`, `new-wp-plugin`, `prepare-github-release`, `prepare-pr`, `quality-check`, `review-code`.
  - **Smart tier** — `Claude Sonnet 5` on the 6 orchestrator/design prompts: `create-plan`, `work-ticket`, `work-github-issue`, `create-pr`, `create-github-pr`, `resolve-github-reviews`.
- **Claude Code installer remaps the pin to a Claude alias.** `installClaude` rewrites `Claude Haiku 4.5` → `model: haiku` and `Claude Sonnet 5` → `model: sonnet` (also `opus`, `fable`), because a Copilot vendor-qualified name means nothing to Claude Code. Aliases rather than pinned version IDs, so they track the current generation without maintenance. A non-Claude pin installs with no frontmatter at all, leaving Claude on the session model. New `extractClaudeAlias` + `transformFrontmatterForClaude` helpers replace the previous whole-frontmatter strip.
- **`Explore` cheap-tier subagent override for Claude Code** — `templates/shared/agents/Explore.md` ships with `model: haiku` and installs to `.claude/agents/`, overriding Claude's built-in `Explore`. It is read-only and runs during nearly every autonomous cycle, so pinning it cheap stops the parent's smart tier from being inherited into every exploration turn. Suppress with `--no-agent-overrides`.
- **`core-review` skill gains `model: haiku` and a `--budget {quick,medium,thorough}` argument** — `quick` is the diff plus directly-touched files, `medium` adds one-hop neighbours, `thorough` is the whole repo. The cheap tier is safe at every budget: `thorough` widens the file set, not the reasoning depth. Orchestrators pass an explicit budget (`create-github-pr` → `medium`, `finalize-github-pr` and `resolve-github-reviews` → `quick`).
- **"Model-tier discipline" section in all four root docs** (`AGENTS.md`, `AGENTS.codex.md`, `CLAUDE.md`, `copilot-instructions.md`) and a tier table in `templates/shared/prompts/README.md`, each documenting the per-platform reality rather than a single invariant.
- **`AGENTS` export in `src/index.js`** listing the shipped subagent overrides (currently `Explore`), plus `agentsDir` in `CLAUDE_FILES`.
- **`--no-agent-overrides` CLI flag** for projects that want Claude's built-in subagents untouched.

### Changed

- **`model:` is a single scalar, not a prioritized array.** The array form is undocumented for `.prompt.md` files — [the VS Code reference](https://code.visualstudio.com/docs/agent-customization/prompt-files) describes `model` as "the language model used when running the prompt" — and GitHub Copilot CLI rejects it outright (`model: Expected string, received array`, [copilot-cli#2133](https://github.com/github/copilot-cli/issues/2133)). Had VS Code ignored the array, every prompt would have silently fallen back to the picker and the entire optimization would have been a no-op. The toolkit therefore ships no fallback chains: an unavailable pin falls back to the agent's own default.
- **Smart tier is `Claude Sonnet 5`, not `Claude Sonnet 4.5`.** Per [GitHub's published pricing](https://docs.github.com/en/copilot/reference/copilot-billing/models-and-pricing), Sonnet 5 costs $2/$10 per million input/output tokens against Sonnet 4.5's $3/$15 — newer *and* 33% cheaper, so the older pin was strictly dominated.
- **Dropped `GPT-5` and `GPT-5.5` as smart-tier fallbacks.** `GPT-5` is no longer in the [supported-models catalogue](https://docs.github.com/en/copilot/reference/ai-models/supported-models) at all, and `GPT-5.5` ($5/$30) is among the most expensive models available — 2.5× the input and 3× the output of Sonnet 5, which is a strange thing to put in a cost-optimization release.
- **Codex keeps the `model:` field even though it ignores it.** Codex has no per-prompt model concept and reads the same files Copilot does, through symlinks. Stripping the field for Codex would mean maintaining a divergent copy; leaving it produces a non-blocking editor lint warning and nothing else. This is documented in `AGENTS.codex.md` so the warning is not mistaken for a defect.
- **`showHelp()`** advertises `--no-agent-overrides`.

### Fixed

- **Planning-doc removal no longer deletes unrelated documentation.** The step shipped in `create-pr.prompt.md` and `create-github-pr.prompt.md` matched `docs/*plan*.md` — a **substring** pattern that also matches `explanation.md` (ex-**plan**-ation) and `planet.md`, and would `git rm` a legitimate new doc added on the same branch. It now requires the `-plan.md` **suffix**, matching the `docs/<feature-name>-plan.md` pattern the toolkit actually generates.
- **Planning-doc removal no longer aborts on paths containing spaces.** The same step collected paths into a newline-delimited variable and piped it to `xargs git rm`, which word-splits: a doc named `my feature-plan.md` produced `fatal: pathspec 'docs/my' did not match any files` and `git rm` aborted **without removing anything**, silently leaving the real plan doc in the branch. The list is now NUL-delimited end to end (`git diff -z … | xargs -0 git rm --`), and a `git diff --quiet` guard keeps `xargs` from running on an empty list. Two new tests execute the shipped shell block against a real git repository and assert both behaviours.
- **`create-pr.prompt.md` (Jira flow) now has a plan-doc removal step at all.** Previously the Jira orchestrator went straight from validations to `git push`, leaving the plan doc created by `work-ticket` / `create-plan` in the base branch after merge — a drift from the GitHub flow. New Step 5 mirrors the GitHub variant and commits before push; steps 5–7 renumbered to 6–8.
- **Documented the "subagent override filename must match the built-in name" rule** in `AGENTS.md`, `CLAUDE.md`, and inline in `Explore.md`. Claude Code loads `.claude/agents/<name>.md` by filename stem, so renaming `Explore.md` to `explore.md` or any kebab-case variant registers a *new* subagent instead of overriding the built-in one — silently leaving the built-in on its default tier and defeating the pin. An explicit exception to the repo's kebab-case convention.
- **`model:` pin semantics corrected wherever they were overstated.** The pin **wins over** the Copilot picker and Claude `/model` — both are consulted only when no pin is set — so guidance suggesting a per-run switch via picker or `/model` was not executable. Every such passage (the `resolve-github-reviews` header, the `sonnet` → `opus` section in `CLAUDE.md`, the `core-review` escalation notes) now says what actually works: edit the installed file's `model:` line and revert afterward.
- **"The delegate's pin wins for that turn" qualified per platform.** True on Claude Code, where skills and slash-commands each establish a `model:` boundary. On Copilot, skills inherit the invoking prompt's model, so an inline `core-review` from a smart-tier orchestrator runs smart — a standalone chat is the only way to keep it cheap. On Codex the whole session runs one model. Corrected in all four root docs, the prompts README, and `core-review/SKILL.md`.
- **`core-review/SKILL.md` documents the expected VS Code linter warning** on its `model:` pin. VS Code's `chat-customizations-evaluations` extension flags `model:` as an unsupported *skill* attribute and surfaces it in the Problems panel. The pin is kept because Claude Code honours it per-turn on the cycle's most frequent delegate; the warning is cosmetic. A comment after the frontmatter records the trade-off.
- **Removed a dangling reference** to `docs/subagent-cost-optimization-plan.md` from `bin/cli.js`. The design doc was deleted once implemented, but the code comment pointing at it shipped in the npm package.

### Notes

- **Backward compatible.** Prompts install as before on every agent; only their `model:` line is new. Assets keep working where `model:` is ignored (Codex today, older Copilot and Claude Code releases). No configuration file changes are required or read.
- **Measurement follow-up.** After this ships, run a 5-working-day window with 2 heavy users (one primarily on Claude Code, one on Copilot). Per user per day: input/output tokens, prompts invoked by tier, and cheap-tier failures (tasks re-run on the smart tier). **Demotion policy:** a prompt that fails ≥ 2 of 5 runs on the same class of task moves back to the smart tier in a patch release. No attempt at a perfect up-front classification.
- **60 tests passing** in `src/cli.test.js`, including the Claude alias remap, byte-identical Copilot installs, the scalar-pin guard, `Explore` install/skip, `--budget` wiring, and the two plan-doc removal behaviours.


## [2.6.0] - 2026-07-26

### Added

- **`tsdoc-standards.instructions.md`** ([#31](https://github.com/SilverAssist/agents-toolkit/issues/31)) — TSDoc (not JSDoc) documentation standard for TypeScript, `applyTo: "**/*.{ts,tsx}"`: core rules (no `{type}` braces in `@param`/`@returns`, `@typeParam` over `@template`, `@packageDocumentation` over `@module`, inline interface-member docs), the allowed-tags table, comment templates (Server Action, React component, utility, file header), and forbidden JSDoc patterns. Ported from the canonical ruleset maintained in the Next.js repos. Registered in `INSTRUCTIONS` and categorized under the `react` stack (next to `typescript`).
- **`tsdoc-standards` skill** ([#31](https://github.com/SilverAssist/agents-toolkit/issues/31)) — on-demand deep reference for the instruction: the *why* (types belong in code, not comments), rationale per rule, generic (`@typeParam`) templates, a forbidden→fix table, and a review checklist. Registered in `SKILLS` under the `react` stack.
- **`resolve-github-reviews.prompt.md`** ([#31](https://github.com/SilverAssist/agents-toolkit/issues/31)) — prompt to **fetch → address → reply → resolve → verify `0` unresolved** GitHub PR review threads (Copilot or human) with exact `gh`/GraphQL commands: `reviewThreads` query filtered on `isResolved == false`, per-thread REST replies (with the `in_reply_to` fallback and PR-level acknowledgement for Copilot suppressed notes), and the GraphQL `resolveReviewThread` mutation (REST cannot resolve threads). Registered in `PROMPTS.utility` and `FILE_CATEGORIES.prompts` under `universal` + `github`.
- **`github-review-management` skill** ([#31](https://github.com/SilverAssist/agents-toolkit/issues/31)) — reference knowledge backing the prompt: the review submission vs review comment vs review thread data model, which API does what (GraphQL lists and resolves review *threads*, REST posts replies), copy-paste `resolveReviewThread`/verification snippets, Copilot-specific handling (suppressed notes, `isOutdated` threads, per-commit rounds), and a common-failures table. Registered in `SKILLS` and categorized under `github` + `universal` (excluded for `--tracker jira`).
- **`core-review` skill** ([#35](https://github.com/SilverAssist/agents-toolkit/issues/35)) — a whole-repo, pre-emptive consistency review run as a **read-only pass** at two points — **before opening a PR** and **before pushing fixes in response to a reviewer** — to preempt the multi-round Copilot loops seen in agents-toolkit #32 / jsdoc-to-tsdoc #7. Ships the reviewer checklist (docs↔code drift, invalid code examples, broken links, markdown hygiene, inventory/table completeness, shell-snippet robustness, lockfile/CI health), the per-agent run guidance (Copilot/Codex run the whole-repo pass inline; Claude Code may delegate it to a subagent), a **"highest-recall patterns"** section distilled from a real review round (reframe-propagation sweep, scope-vs-mechanism, claim-matches-diff, inventory sibling cross-check, commit-before-push), and the prioritized `severity | file:line | problem | suggested fix` output contract. Registered in `SKILLS` and categorized under `github` + `universal` (excluded for `--tracker jira`).

### Changed

- **`FILE_CATEGORIES` (`bin/cli.js`)** — added `tsdoc-standards` to `instructions.react` and `skills.react`; added `resolve-github-reviews` to `prompts.universal` + `prompts.github`; added a new `skills.github` tracker key (`github-review-management`, also in `skills.universal`) so `--tracker github` includes and `--tracker jira` excludes it.
- **Docs indexes** — `README.md` (instructions, skills, workflow-prompts tables + skill counts), `templates/shared/prompts/README.md`, `templates/shared/skills/README.md`, and the `templates/agents/AGENTS.md` curated asset map now list the new assets.
- **`FILE_CATEGORIES` (`bin/cli.js`)** ([#35](https://github.com/SilverAssist/agents-toolkit/issues/35)) — added `core-review` to `skills.github` + `skills.universal` (registered in `SKILLS`, `src/index.js`) so `--tracker github`/`all` include it and `--tracker jira` excludes it.
- **Pre-review integration** ([#35](https://github.com/SilverAssist/agents-toolkit/issues/35)) — `create-github-pr.prompt.md` gains a "Pre-PR core review" step before push; `resolve-github-reviews.prompt.md` and `finalize-github-pr.prompt.md` gain a "re-review the whole repo before pushing fixes" step — each pointing at the `core-review` skill. README skills table + tree counts (12→13), the skills README, and the `AGENTS.md` + `AGENTS.codex.md` asset maps list the new skill.
- **Planning-doc lifecycle** — the `work-github-issue` planning document is now removed at **PR creation** (`create-github-pr.prompt.md`) instead of at finalization, so it no longer merges into and accumulates in the base branch's `docs/`. `finalize-github-pr.prompt.md` now only verifies none linger. Removed the stale `docs/*-plan.md` files that had accumulated from earlier PRs.

## [2.5.1] - 2026-07-01

### Fixed

- **`caching.instructions.md` / `nextjs-caching` skill — corrected the POST-read caching claim** (WEB-1069). The previous guidance implied `next: { revalidate, tags }` alone was sufficient to make a POST-read page (e.g. CCDS `geo-search`, which powers city/community pages) CDN-cacheable. Production testing showed the **data** fetch caches with those options, but the **route** still renders dynamically (`cache-control: private, no-store`) — the two are independent. Both documents now separate the data-fetch cache fact from the route-rendering fact and document the three fixes: CDN edge override (`proxy.ts`, shipped default), `dynamic = "force-static"` (interim, requires null-safety + throw-on-5xx), and `cacheComponents` + `use cache` (strategic).
- **Revalidate tiers raised to 30 days; image `minimumCacheTTL` to 1 year** in both documents — CCDS/WP data changes rarely and is refreshed on-demand via webhooks + tags, so the previous 24h/30d defaults were unnecessarily short.
- **Documented the `expireTime` / CDN stale-window rule** — Next emits `s-maxage=<revalidate>, stale-while-revalidate=<expireTime - revalidate>` for ISR pages, so `expireTime` must be ≥ the largest page `revalidate` or the stale window is invalid. Added the correct value (`5184000`, 60d) and the matching proxy override value (`s-maxage=2592000, stale-while-revalidate=2592000`) so ISR and edge-overridden dynamic pages present one consistent CDN policy.

## [2.5.0] - 2026-06-30

### Added

- **`caching.instructions.md`** — Next.js (App Router) caching standards for Silver Side frontends: cache by read-vs-mutation intent (not HTTP method) so POST reads such as CCDS `geo-search` cache cross-request, `revalidate` + `tags` requirements, ISR tiers, dual Next.js/CloudFront on-demand invalidation, and image/asset-proxy TTLs. Registered in `INSTRUCTIONS` and categorized under the `react` stack.
- **`seo-ai-optimization.instructions.md`** — SEO & AI optimization patterns for Next.js: semantic HTML, accessibility tree quality for browser agents, `generateMetadata`, JSON-LD schema by page type, CLS prevention, and server-rendered content for AI Search visibility. Completes the AI-SEO set alongside the existing `ai-seo-optimization` skill and `audit-ai-seo` prompt. Registered in `INSTRUCTIONS` and categorized under the `react` stack.
- **`nextjs-caching` skill** — deep caching reference and decision guide: the five caching layers, the read-vs-mutation rule, why a `POST` read caches with `next: { revalidate, tags }` (Next 16 `patch-fetch` behavior + body-keyed cache), canonical client, ISR tiers, dual Next.js/CloudFront invalidation, anti-patterns, and a "page is not cached" diagnosis flow. Registered in `SKILLS` under the `react` stack.
- **`release-node.md` / `release-wordpress.md` partials** ([#27](https://github.com/SilverAssist/agents-toolkit/issues/27)) — ecosystem-specific release mechanics (version source of truth, bump commands, quality checks) consumed by `prepare-github-release`. Categorized under the `react` and `wordpress` stacks respectively in `FILE_CATEGORIES.partials`.

### Changed

- **`AGENTS.md` template** — documentation index now lists `caching` and `seo-ai-optimization`; added a "Caching Rules (CRITICAL)" quick-reference block and "When to Read" rows so every project gets the caching/SEO context at the agent-onboarding level.
- **Prompts enriched with caching context** — `review-code` gained a "Caching & Data Fetching" review section (catches the POST-read-uncached regression), `create-plan` gained a "Caching Impact" planning subsection, and the shared `validations` partial gained a caching checklist item.
- **`prepare-release` → `prepare-github-release`** ([#27](https://github.com/SilverAssist/agents-toolkit/issues/27)) — **breaking (command renamed)**. The prompt is now **project-agnostic**: it auto-detects WordPress plugin vs Node/npm package (loading the matching `release-*` partial) and **analyzes the repo's GitHub Actions workflows** to decide whether a bare tag or a full GitHub Release is required — fixing the wrong "push the tag and it publishes" guidance for `on: release:`-triggered workflows. Renamed in `PROMPTS.workflow`; old `prepare-release` removed with no alias.
- **Documented our own release flow for agents** — added a "Release Flow" section to the repo-level `CLAUDE.md` and `AGENTS.md` and a "Version Sync (CRITICAL)" review check (#6) to `.github/copilot-instructions.md`, so all three agent-context surfaces (Claude, Copilot, generic) enforce the `package.json` ↔ `src/index.js` `VERSION` match and the "publish needs a GitHub Release, not a bare tag" rule.

### Fixed

- **`src/index.js` `VERSION` now matches `package.json`** — the exported `VERSION` (stamped into `agents-toolkit-lock.json` and used by `restore`/`status` drift checks) had diverged from the published package version during version bumps; bumped to `2.5.0` and added the guardrail above to prevent recurrence.

## [2.4.0] - 2026-06-22

### Added

- **Skills lockfile support** ([#21](https://github.com/SilverAssist/agents-toolkit/issues/21)) — `install` now writes `agents-toolkit-lock.json` at the project root after each non-global, non-dry-run install. The lockfile records each skill's SHA-256 hash (same algorithm as `npx skills`) and agent dirs, enabling reproducible restores without committing skill files to the repository
- **`restore` command** — reads `agents-toolkit-lock.json`, reinstalls all skills + symlinks, and verifies hashes match the lockfile. Designed for post-clone setup and CI pipelines
- **`status` command** — compares installed skill hashes against the lockfile and prints a `up-to-date / modified / missing` table; exits with code `1` if any skill is out of sync (CI-friendly)
- **Auto `.gitignore` update** — `install` automatically appends `.agents/skills/`, `.github/skills/`, and `.claude/skills/` to `.gitignore` when those entries are not already present
- New `bin/cli.js` helpers: `computeSkillHash()`, `writeLockfile()`, `readLockfile()`, `appendSkillsToGitignore()`
- 10 new tests covering lockfile write, dry-run skip, global install skip, restore, and status (41 tests total)
- **`npx skills` standard for skills** ([#16](https://github.com/SilverAssist/agents-toolkit/issues/16)) — skills now install once into a canonical `.agents/skills/` store and each agent's skills directory symlinks to it (single source of truth shared across Copilot, Claude Code, and Codex)
- `--copy` CLI flag — materialize real copies instead of symlinks; symlinks also fall back to copies automatically when unsupported (e.g. Windows without developer mode)
- New `bin/cli.js` helpers: `getAgentsSkillsDir()`, `linkSkill()`, `installSkillsStandard()`
- `SKILLS_LAYOUT` export and `CLAUDE_FILES.skillsDir` in `src/index.js`
- Six new regression tests covering canonical store, per-agent symlinks, shared source of truth, `--copy`, stack filtering, and dry-run (30 tests total)
- **GitHub-specific PR prompts** — `create-github-pr` and `finalize-github-pr` complete the GitHub workflow pair alongside the existing `analyze-github-issue` / `work-github-issue`, using `{issue-number}` and `gh` CLI instead of Jira ticket IDs
- `FILE_CATEGORIES.prompts.github` extended with `create-github-pr` and `finalize-github-pr` — `--tracker github` now correctly includes/excludes all four GitHub prompt pairs
- Developer workflow prompts: `.github/prompts/` (prompts for Copilot/Codex) and `.claude/commands/` (commands for Claude Code) are real files decoupled from `templates/shared/prompts/` — project-specific and adapted for this Node.js ESM CLI repo
- Developer skills: `.agents/skills/` canonical store (4 Node.js-adapted skills) with `.github/skills/` and `.claude/skills/` symlinks

### Changed

- **Claude Code skills now install to `.claude/skills/`** (where Claude Code reads them natively) instead of `.github/skills/`
- README and skills template README document the `npx skills` standard, the `.agents/skills/` canonical store, and the `--copy` flag

### Fixed

- Claude Code users previously received skills in `.github/skills/`, a location Claude Code does not read — skills are now placed where the agent loads them

## [2.3.1] - 2026-06-22

### Fixed

- Hook commands failed at runtime with `/bin/sh: scripts/<name>.sh: No such file or directory` ([#17](https://github.com/SilverAssist/agents-toolkit/issues/17)). Copilot runs a hook `command` from the workspace root, not the hooks directory, so the relative `scripts/<name>.sh` path did not resolve — most visible on global (`~/.copilot/hooks/`) installs
- `installHooks()` now sets a `cwd` on each hook entry: `.github/hooks` (relative, portable) for project installs and the absolute hooks path for global installs, so the `command` resolves correctly
- Hook configs now declare the required `version: 1` field

### Note

- Existing installs must be refreshed to pick up the fix: `npx @silverassist/agents-toolkit@latest install --hooks-only --global --force` (or without `--global` for project-level hooks)

## [2.3.0] - 2026-05-21

### Added

- PostToolUse hooks system — automated validation and formatting after Copilot/Codex file edits
- `validate-tsx` hook — validates TSX component conventions (kebab-case folders, `index.tsx` naming, default export, Props interface)
- `lint-format` hook — runs ESLint `--fix` and Prettier `--write` on modified files automatically
- `--hooks-only` CLI flag for `install` command — installs only hook configs and scripts
- `installHooks()` function with script chmod and dry-run support
- `HOOKS` export array in `src/index.js`

## [2.2.0] - 2026-05-19

### Added

- New `ai-seo-optimization` skill — comprehensive AI Search optimization knowledge base (semantic HTML, E-E-A-T, structured data, agent-friendly UX patterns)
- New `audit-ai-seo` prompt — on-demand 6-area audit with scoring output template (🟢/🟡/🔴)
- Registered `ai-seo-optimization` in SKILLS export array

## [2.1.0] - 2026-05-04

### Added

- `--global` / `-g` flag for `install` and `update` commands — installs to `~/.copilot/` for user-level availability across all projects
- Global config support: `~/.agents-toolkit.json` is created automatically and used as fallback when no project-level config exists
- Config resolution cascade: CLI flags → project `.agents-toolkit.json` → global `~/.agents-toolkit.json` → defaults
- Two new regression tests for `--global` flag and help output (17 tests total)

### Changed

- Project-level files (`AGENTS.md`, `copilot-instructions.md`) are skipped when installing with `--global` since they are project-specific
- README updated with Global Install section, updated CLI reference table, and command comparison

### Fixed

- Renamed `.copilot-prompts.json` to `.agents-toolkit.json` in the repository root (config file was already using the new name in code)
- Updated `.npmignore` to exclude `.agents-toolkit.json` instead of the old `.copilot-prompts.json`

## [2.0.0] - 2026-05-04

### Changed

- **BREAKING**: Package renamed from `@silverassist/copilot-prompts-kit` to `@silverassist/agents-toolkit`
- **BREAKING**: CLI binary renamed from `copilot-prompts` to `agents-toolkit`
- **BREAKING**: Config file renamed from `.copilot-prompts.json` to `.agents-toolkit.json`
- Restructured `templates/` directory: shared content in `templates/shared/`, agent-specific root files in `templates/agents/`
- Eliminated ~28 duplicate files by consolidating instructions, prompts, and skills into single source of truth
- `pr-template.md` partial rewritten with dual-format support (GitHub Issues + Jira)

### Added

- `--stack <react|wordpress|all>` CLI flag to filter content by tech stack
- `--tracker <github|jira|all>` CLI flag to filter content by issue tracker
- `stack` and `tracker` fields in `.agents-toolkit.json` for persistent configuration
- GitHub issue workflow prompts: `analyze-github-issue`, `work-github-issue`
- GitHub integration partial: `_partials/github-integration.md`
- PHP/WordPress instructions: `php-standards`, `wordpress-plugin-architecture`, `testing-standards`
- Documentation & workflow instructions: `documentation-language`, `github-workflow`
- WordPress prompts: `new-wp-component`, `new-wp-plugin`, `prepare-release`, `quality-check`
- WordPress skills: `create-component`, `plugin-creation`, `quality-checks`, `release-management`, `testing`

### Fixed

- Remove identity replacement in `adaptPathsForClaude()` that replaced `.github/instructions/` with itself (CodeQL CWE-116)
- Use portable `import type { SyntheticEvent, ChangeEvent } from "react"` in react-components instructions instead of `React.` namespace that requires `esModuleInterop`

### Migration

To upgrade from v1.x:

```bash
# Old usage:
npx @silverassist/copilot-prompts-kit@latest install

# New usage:
npx @silverassist/agents-toolkit@latest install
```

If you have a `.copilot-prompts.json`, rename it to `.agents-toolkit.json`.

## [1.5.1] - 2026-04-20

### Changed

- Improved prompt portability across repositories by using optional script execution (`--if-present`) and TypeScript fallback checks (`npx tsc --noEmit` when applicable)
- Aligned Git workflow prompts to resolve base branch from `.copilot-prompts.json` with fallback behavior, avoiding hardcoded `main`/`dev` assumptions
- Removed interactive rebase guidance from prompts in favor of agent-safe, non-interactive workflows
- Updated prompt references to prioritize `AGENTS.md` and treat `.github/copilot-instructions.md` as optional
- Fixed prompt template consistency issues:
  - `create-plan` commit variable alignment
  - `add-tests` component import pattern (`default` export)
  - `work-ticket` branch creation based on configured base branch
- Updated `AGENTS.md` templates to reflect script-aware quality gates and removed non-existent `manage_todo_list` requirement

## [1.5.0] - 2026-04-20

### Added

- **Codex support** via `--codex` flag for `install` and `update` commands
  - Installs `.github/prompts/`, `.github/instructions/`, `.github/skills/`, and a Codex-specific `AGENTS.md`
  - Includes Codex-specific installer messages and help examples
- **`templates/codex/AGENTS.md`** template for Codex project instructions
- **Unified target selection** via `--target <copilot|claude|codex>` (legacy `--claude` / `--codex` still supported)
- **`--append` mode** for non-destructive `AGENTS.md` merges when instructions are missing
- **CLI regression tests** in `src/cli.test.js` covering targets, conflicts, dry-run counts, and append behavior

### Changed

- Updated package metadata and docs to list support for GitHub Copilot, Claude Code, and Codex
- Updated template docs for prompts and skills to include Codex usage
- Refactored installer logic to remove duplicated Copilot/Codex code paths
- Fixed dry-run summary counts to report planned file operations accurately
- Updated npm test script to `node --test`

## [1.4.1] - 2026-04-13

### Fixed

- **Component export convention** — Resolved contradiction between `CLAUDE.md` and `.github/instructions` files where `CLAUDE.md` required named exports (`export function`) but both instruction files required default exports (`export default function`)
- Updated all affected template files distributed via npm:
  - `templates/claude/CLAUDE.md` — Component Export Pattern section
  - `templates/AGENTS.md` — Component rules table and hook placement example
  - `templates/prompts/_partials/documentation.md` — JSDoc component example
  - `templates/skills/component-architecture/SKILL.md` — Props and hook placement examples
- Added barrel re-export pattern (`export { default as X }`) to component export examples

## [1.4.0] - 2026-04-13

### Added

#### Claude Code Support

- **`--claude` flag** for `install` and `update` commands — installs for Claude Code instead of GitHub Copilot
  - Prompts are installed as slash commands to `.claude/commands/` (`.prompt.md` → `.md`)
  - Copilot-specific frontmatter (`agent:`, `description:`) is stripped automatically
  - Path references updated: `.github/copilot-instructions.md` → `CLAUDE.md`, `.github/prompts/_partials/` → `.claude/commands/_partials/`
  - Instructions and skills are shared with Copilot (`.github/instructions/`, `.github/skills/`)
- **`templates/claude/CLAUDE.md`** — project instructions template for Claude Code
  - Equivalent of `copilot-instructions.md` adapted for Claude Code conventions
  - Slash commands reference table
  - Same workflow, conventions, and React/TypeScript patterns
- **`CLAUDE_COMMANDS`** and **`CLAUDE_FILES`** exports in `src/index.js`

#### CLI

- `copyDirForClaude()` — recursive copy that strips Copilot frontmatter and adapts paths
- `installClaude()` — full Claude Code installation flow
- Help text updated with `--claude` examples

## [1.3.0] - 2026-02-03

### Changed

- **`server-actions.instructions.md`** - Major security overhaul based on Next.js 15 data security guide
  - Added Data Access Layer (DAL) architecture with `server-only` marker
  - Added 8 critical security rules (authentication, authorization, input validation)
  - Added closures security section
  - Added troubleshooting section for common errors ("Failed to find Server Action")
  - Added security checklist before deployment

- **`react-components.instructions.md`** - Updated export patterns per Next.js recommendations
  - Components now use `export default` for better tree-shaking
  - Added barrel exports for domain organization
  - Added Server vs Client Components examples
  - Added critical Hook Placement rules (hooks before conditionals)

- **`typescript.instructions.md`** - Added export rules section
  - Components: `export default`
  - Everything else: named exports

- **`component-architecture/SKILL.md`** - Enhanced with DDD and barrel exports
  - Added Server Component and Client Component templates
  - Updated export patterns (default for components, named for rest)
  - Added barrel exports for domains with examples
  - Enhanced domain organization structure with `index.ts` files

- **`domain-driven-design/SKILL.md`** - Added export strategy and DAL
  - Added export strategy table by file type
  - Added Data Access Layer (DAL) structure
  - Added barrel export examples for components, libraries, and actions
  - Updated actions domain structure with barrel exports

---

## [1.2.0] - 2026-02-01

### Changed

- **`AGENTS.md`** - Now installs to project root instead of `.github/` per Vercel recommendations
- **`bin/cli.js`** - Updated install path for AGENTS.md to project root

### Added

- **`AGENTS.md`** - New "Pre-commit Quality Gates" section (MANDATORY)
  - Required checks before push/PR: TypeScript, Linting, Unit Tests, Build
  - Quality checklist for protected branches (`dev`, `staging`, `master`, `main`)
  - Links to testing instructions and patterns

- **`AGENTS.md`** - Enhanced Git Conventions
  - Commit format now requires Jira prefix (e.g., `WEB-123: Add feature`)
  - Critical warning to never commit without Jira ticket prefix

---

## [1.1.1] - 2026-01-30

### Changed

- **`AGENTS.md`** - Refactored following Vercel's AGENTS.md best practices
  - Added retrieval-led reasoning instruction
  - Added compressed documentation index pointing to instruction files
  - Reduced file size by 56% (340 → 153 lines) while maintaining all critical rules
  - Added "When to Read" reference table for instruction files

- **`README.md`** - Improved CLI documentation
  - Clarified `install` vs `update` behavior
  - Added command comparison table
  - Added practical examples for each scenario

### Added

- **`release.prompt.md`** - Release preparation prompt for maintainers (internal use)
  - Pre-release checklist with version consistency validation
  - Package validation steps
  - GitHub Release workflow instructions

---

## [1.1.0] - 2026-01-29

### Added

#### Skills System

- **`component-architecture`** skill - React component patterns, folder structure, naming conventions
- **`domain-driven-design`** skill - DDD principles, domain organization, barrel exports
- **`testing-patterns`** skill - Jest + RTL patterns for Next.js 15 and Server Actions
- Skills README with documentation on creating custom skills

#### New Instructions

- **`css-styling.instructions.md`** - Tailwind CSS v4 & shadcn/ui standards
  - Design tokens (semantic colors)
  - `cn()` utility setup and usage
  - Mobile-first responsive design
  - shadcn/ui component patterns

#### Copilot Agent Support

- **`AGENTS.md`** - Mandatory instructions for GitHub Copilot Coding Agent
  - 4-phase workflow (Analysis → Planning → Implementation → Documentation)
  - Code conventions (imports, types, naming, structure)
  - React patterns (hooks, state, Server Actions)
  - Testing requirements with mock setup order
  - Git commit guidelines and branch naming

- **`copilot-instructions.md`** - Project-wide Copilot instructions template
  - Systematic workflow for complex tasks
  - Key technologies reference
  - DDD principles summary
  - Barrel export pattern

#### CLI Improvements

- `--instructions-only` flag - Only install instructions, AGENTS.md, and copilot-instructions.md
- `--skills-only` flag - Only install skills
- Simplified installation logic with clearer flag handling
- Skills listing in `list` command

### Changed

- **README.md** - Simplified installation to single `npx @latest` command
- **README.md** - Added comprehensive documentation for instructions, skills, and AGENTS.md
- **server-actions.instructions.md** - Updated to use domain-organized structure (DDD-consistent)
- **src/index.js** - Added `INSTRUCTIONS` and `SKILLS` exports

### Fixed

- CLI flag logic now uses clear `shouldInstall*` variables instead of complex conditionals
- Component architecture skill now references css-styling instructions for `cn()` utility (generic approach)
- **Prompt files**: Replaced deprecated `mode: agent` with `agent: agent` in frontmatter (VS Code requirement)
- **Prompt files**: Removed invalid code fence markers from 6 prompt files
- **Prompts README**: Updated documentation with correct frontmatter format and options

## [1.0.0] - 2026-01-29

### Added

#### Workflow Prompts

- `analyze-ticket.prompt.md` - Analyze Jira tickets without making changes
- `create-plan.prompt.md` - Create detailed implementation plans
- `work-ticket.prompt.md` - Start working on tickets with full setup
- `prepare-pr.prompt.md` - Prepare code for pull request
- `create-pr.prompt.md` - Create and link pull requests
- `finalize-pr.prompt.md` - Finalize PRs after approval

#### Utility Prompts

- `review-code.prompt.md` - Quick code review of changes
- `fix-issues.prompt.md` - Fix lint, type, and test errors
- `add-tests.prompt.md` - Add tests for components

#### Partials (Reusable Fragments)

- `validations.md` - Code quality validation steps
- `git-operations.md` - Git workflow operations
- `jira-integration.md` - Jira/Atlassian MCP operations
- `documentation.md` - Documentation standards
- `pr-template.md` - Pull request templates

#### Instructions

- `typescript.instructions.md` - TypeScript coding standards
- `react-components.instructions.md` - React component patterns
- `server-actions.instructions.md` - Next.js server actions
- `tests.instructions.md` - Testing standards

#### CLI

- `install` command - Install prompts to target project
- `list` command - List available prompts
- `update` command - Update existing prompts
- `--force` flag - Overwrite existing files
- `--prompts-only` flag - Only install prompts
- `--dry-run` flag - Preview installation

#### Configuration

- `.copilot-prompts.json` - Customizable configuration file
