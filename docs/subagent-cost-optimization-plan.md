# Subagent & Model-Tier Cost Optimization Plan

> **Status:** DRAFT — plan-only, no code changes yet.
> **Trigger:** Copilot billing hint — *"99% of your usage came from subagent-heavy sessions.
> Each subagent runs its own requests. Be deliberate about spawning them — and consider
> configuring a cheaper model for simpler subagents."*
> **Scope:** [templates/shared/](../templates/shared/) (prompts, skills, instructions) + [templates/agents/](../templates/agents/) shipped by `@silverassist/agents-toolkit`.
> **Targets:** GitHub Copilot (VS Code), Claude Code, Codex.

---

## 1. Problem statement

Recent sessions were dominated by **subagent fan-out**: a top-level task spawns one or more
sub-workers (Claude `Explore` / `general-purpose`, Copilot custom agents, Codex background
tasks), each of which runs on the **same "smart" tier** as the main conversation. For
well-defined, checklist-style tasks that already ship with step-by-step instructions and
examples (quality checks, code review, whole-repo consistency scan, PR finalization, release
prep, etc.), that is wasteful:

- The sub-worker inherits Opus/Sonnet/GPT-5 for a task a Haiku/GPT-5-mini can execute
  deterministically.
- The main planner also stays on the top tier while it waits for the sub-worker.
- Because the toolkit is distributed to many projects, **every user of every plugin** pays
  this multiplier until we ship the fix upstream.

## 2. Non-goals

- **Not** downgrading tasks that require genuine reasoning: implementation planning
  ([create-plan.prompt.md](../templates/shared/prompts/create-plan.prompt.md)),
  work-ticket / work-github-issue, human-facing architectural decisions.
- **Not** changing the *contract* of any prompt or skill — only the model tier that
  executes it, plus explicit "delegate this to a cheaper worker" guidance where useful.
- **Not** breaking the "subagents are a Claude-only optimization, never a requirement"
  invariant already enforced by the [core-review](../templates/shared/skills/core-review/SKILL.md) skill.

## 3. What each agent supports (verified from vendor docs, 2026-07)

| Agent | Where you can set a model | Values | Env override |
| --- | --- | --- | --- |
| **Claude Code** | `model:` frontmatter in `.claude/agents/*.md` (subagents) and `.claude/skills/*/SKILL.md` (skills). Also `.claude/commands/*.md`. | `haiku`, `sonnet`, `opus`, `fable`, `inherit`, or a full model ID. Default = `inherit`. | `CLAUDE_CODE_SUBAGENT_MODEL` |
| **VS Code Copilot** | `model:` frontmatter in `.prompt.md`, `.agent.md`, and per-`handoff`. Accepts a single qualified name (`Claude Haiku 4.5 (copilot)`) or a prioritized array. | Vendor-qualified model names. | Model picker per session. |
| **Codex CLI** | Session-level (`codex --model …`, `~/.codex/config.toml` `model = "..."`). No per-prompt `model:` frontmatter today. | Any model the CLI supports. | `CODEX_MODEL` / config file. |

Key Claude behaviour to lean on:

- Built-in `Explore` inherits the main conversation's model (capped at Opus). **A project-level
  `.claude/agents/Explore.md` overrides the built-in** and can pin `model: haiku` so every
  exploration in projects that use the toolkit runs cheap by default.
- Skills honour `model:` **for the turn they are active** and restore the session model on the
  next prompt — safe to pin cheap on task skills without side effects on the outer chat.

## 4. Task classification

Rating each shipped asset by how much reasoning it actually needs, so we know whether to
pin cheap, keep smart, or leave it agent-neutral.

### 4.1 Prompts — [templates/shared/prompts/](../templates/shared/prompts/)

| Prompt | Nature | Recommended tier |
| --- | --- | --- |
| [add-tests.prompt.md](../templates/shared/prompts/add-tests.prompt.md) | Template-driven scaffold + assertions | **Cheap** (Haiku / GPT-5 mini) |
| [analyze-github-issue.prompt.md](../templates/shared/prompts/analyze-github-issue.prompt.md) | Read + structured summary | **Cheap** |
| [analyze-ticket.prompt.md](../templates/shared/prompts/analyze-ticket.prompt.md) | Read + structured summary | **Cheap** |
| [audit-ai-seo.prompt.md](../templates/shared/prompts/audit-ai-seo.prompt.md) | Pure checklist | **Cheap** |
| [create-github-pr.prompt.md](../templates/shared/prompts/create-github-pr.prompt.md) | Orchestration + git ops; delegates review to `core-review` | **Smart** outer / **cheap** delegate |
| [create-plan.prompt.md](../templates/shared/prompts/create-plan.prompt.md) | Genuine design reasoning | **Smart** (keep) |
| [create-pr.prompt.md](../templates/shared/prompts/create-pr.prompt.md) | Same as create-github-pr | **Smart** outer / **cheap** delegate |
| [finalize-github-pr.prompt.md](../templates/shared/prompts/finalize-github-pr.prompt.md) | Checklist + gh calls | **Cheap** |
| [finalize-pr.prompt.md](../templates/shared/prompts/finalize-pr.prompt.md) | Checklist + Jira calls | **Cheap** |
| [fix-issues.prompt.md](../templates/shared/prompts/fix-issues.prompt.md) | Run tools → parse → mechanical fix | **Cheap** (fallback to smart if diagnostics are non-trivial) |
| [new-wp-component.prompt.md](../templates/shared/prompts/new-wp-component.prompt.md) | Deterministic scaffold | **Cheap** |
| [new-wp-plugin.prompt.md](../templates/shared/prompts/new-wp-plugin.prompt.md) | Deterministic scaffold | **Cheap** |
| [prepare-github-release.prompt.md](../templates/shared/prompts/prepare-github-release.prompt.md) | Mechanical: bump versions, changelog, tag | **Cheap** |
| [prepare-pr.prompt.md](../templates/shared/prompts/prepare-pr.prompt.md) | Runs validations, commits | **Cheap** |
| [quality-check.prompt.md](../templates/shared/prompts/quality-check.prompt.md) | Runs PHPCS/PHPStan/PHPUnit and reports | **Cheap** |
| [resolve-github-reviews.prompt.md](../templates/shared/prompts/resolve-github-reviews.prompt.md) | Fetch threads → apply fix → reply | **Smart** for the *fix step only*, **cheap** for fetch/reply/format |
| [review-code.prompt.md](../templates/shared/prompts/review-code.prompt.md) | Pure checklist | **Cheap** |
| [work-github-issue.prompt.md](../templates/shared/prompts/work-github-issue.prompt.md) | Implementation reasoning | **Smart** (keep) |
| [work-ticket.prompt.md](../templates/shared/prompts/work-ticket.prompt.md) | Implementation reasoning | **Smart** (keep) |

### 4.2 Skills — [templates/shared/skills/](../templates/shared/skills/)

| Skill | Nature | Recommended tier |
| --- | --- | --- |
| [ai-seo-optimization](../templates/shared/skills/ai-seo-optimization/SKILL.md) | Reference content — no invocation | n/a (no `model:`) |
| [component-architecture](../templates/shared/skills/component-architecture/SKILL.md) | Reference | n/a |
| [core-review](../templates/shared/skills/core-review/SKILL.md) | **Executes** a whole-repo read-only pass; often delegated to a subagent | **Cheap** — pin `model: haiku` on Claude; recommend Copilot users select a cheap model when invoking |
| [create-component](../templates/shared/skills/create-component/SKILL.md) | Scaffolding procedure | **Cheap** when invoked as `context: fork` |
| [domain-driven-design](../templates/shared/skills/domain-driven-design/SKILL.md) | Reference | n/a |
| [github-review-management](../templates/shared/skills/github-review-management/SKILL.md) | Executes gh + GraphQL calls | **Cheap** |
| [nextjs-caching](../templates/shared/skills/nextjs-caching/SKILL.md) | Reference | n/a |
| [plugin-creation](../templates/shared/skills/plugin-creation/SKILL.md) | Scaffolding procedure | **Cheap** |
| [quality-checks](../templates/shared/skills/quality-checks/SKILL.md) | Executes commands, reports | **Cheap** |
| [release-management](../templates/shared/skills/release-management/SKILL.md) | Mechanical release steps | **Cheap** |
| [testing](../templates/shared/skills/testing/SKILL.md) | Reference | n/a |
| [testing-patterns](../templates/shared/skills/testing-patterns/SKILL.md) | Reference | n/a |
| [tsdoc-standards](../templates/shared/skills/tsdoc-standards/SKILL.md) | Reference | n/a |

### 4.3 Instructions — [templates/shared/instructions/](../templates/shared/instructions/)

Always-on context. **No model config**, but they *do* consume tokens on every request. Two
side goals for the same PR series:

- Verify none have grown past their useful scope.
- Confirm none silently steer the outer chat into "spawn a subagent for X" patterns that were
  meant to be inline.

## 5. Design

### 5.1 Guiding principles

1. **Default cheap for well-defined work; escalate on demand.** If a task is a checklist,
   pin the cheap tier. If the model can't complete it, the user can rerun on a smarter model.
2. **Keep the contract portable.** Every asset must still work on all three agents. Model
   pins are *hints*, gated by frontmatter fields each agent already ignores when absent.
3. **Never model-pin reference-only skills.** They don't invoke — pinning has no effect but
   creates drift risk.
4. **The outer planner stays smart.** We only downgrade the sub-workers and mechanical
   prompts, not the plans/decisions that spawn them.
5. **Document, don't hard-code.** Ship sensible defaults, but every model pin must be
   overridable via env var or user config so downstream projects can opt out per-repo.

### 5.2 Concrete changes to ship

#### A. Add model hints to Copilot prompt frontmatter

For every prompt classified **Cheap** in §4.1, add a `model:` line to the shipped `.prompt.md`
frontmatter. Use a **prioritized array** so the fallback still works if the primary model
isn't available on the user's plan.

```yaml
---
agent: agent
description: Run code quality checks (…)
model:
  - Claude Haiku 4.5 (copilot)
  - GPT-5 mini (copilot)
---
```

Prompts to update: `add-tests`, `analyze-github-issue`, `analyze-ticket`, `audit-ai-seo`,
`finalize-github-pr`, `finalize-pr`, `fix-issues`, `new-wp-component`, `new-wp-plugin`,
`prepare-github-release`, `prepare-pr`, `quality-check`, `review-code`.

Prompts to leave **without** a `model:` pin (main planner decides): `create-plan`,
`work-ticket`, `work-github-issue`, `create-pr`, `create-github-pr`,
`resolve-github-reviews`. These are outer-loop orchestrators that call cheap sub-steps
themselves.

#### B. Strip `model:` for Claude Code during install

Claude uses `sonnet` / `opus` / `haiku` alias strings, **not** the Copilot vendor-qualified
names. Two options:

- **B1 (recommended):** Keep only Copilot names in the shipped frontmatter, and teach
  [bin/cli.js](../bin/cli.js) `installClaude` to *rewrite* the `model:` block to the Claude
  alias equivalent during the copy that already runs `stripCopilotFrontmatter` +
  `adaptPathsForClaude`. Mapping:

  | Copilot name | Claude alias |
  | --- | --- |
  | `*Haiku*` | `haiku` |
  | `*Sonnet*` | `sonnet` |
  | `*Opus*` | `opus` |
  | anything else | strip the line (fall back to `inherit`) |

- **B2:** Ship Claude-native frontmatter (`model: haiku`) and rewrite it *up* to Copilot
  names for the Copilot installer. Slightly cleaner for Claude readers, but the current
  installer already strips Copilot frontmatter on the way to Claude, so B1 fits the existing
  pipeline with the least churn.

Pick **B1**. Extend `stripCopilotFrontmatter` (or a new sibling helper) so the transform is
"strip everything except a `model:` block, and if present, remap it to the Claude alias."

#### C. Ship a project-level `Explore` override for Claude Code

Add a new file:

```
templates/shared/agents/Explore.md
```

with

```yaml
---
name: Explore
description: Read-only codebase exploration and Q&A subagent (cheap default).
tools: Read, Grep, Glob, WebFetch
model: haiku
---

Fast, read-only exploration. Report findings in the caller's requested format; never edit.
```

Install path: `.claude/agents/Explore.md` (project scope) via a new `installClaude` step,
gated behind `--stack` / config so it can be opted out. This is the single biggest lever —
it makes **every** `Explore`-based delegation (including [core-review](../templates/shared/skills/core-review/SKILL.md)) run on
Haiku unless the user overrides.

Corresponding [bin/cli.js](../bin/cli.js) changes:

- Add `AGENTS_DIR = 'agents'` under `templates/shared/`.
- Extend `installClaude` to copy `agents/*.md` → `.claude/agents/`.
- Add a `--no-agent-overrides` (or `--stack override:none`) flag so downstream projects can
  keep their own definitions.

#### D. Update the `core-review` skill to pin its model

- **Claude Code:** update the skill frontmatter (after CLI transform per §B) so
  [core-review/SKILL.md](../templates/shared/skills/core-review/SKILL.md) carries `model: haiku`. Because skills honour `model:` only
  while active, the outer chat's model is unchanged.
- **Copilot:** the skill file itself doesn't get a `model:` field (VS Code skills don't
  support it), but the *prompts* that invoke it (`create-github-pr`, `resolve-github-reviews`,
  `finalize-github-pr`, `create-pr`, `finalize-pr`) already run in agent mode; add a note
  in the skill's "How to run it" section recommending the user switch to a cheap model in the
  Copilot model picker for this pass.
- **Codex:** update the "How to run it" section with a one-line hint: "Consider `codex
  --model o4-mini` (or your provider's cheap tier) for this pass — the checklist is
  deterministic."

#### E. Update `resolve-github-reviews.prompt.md`

Split the loop into two phases explicitly:

```yaml
---
agent: agent
description: Fetch/reply/resolve GitHub PR review threads
model:
  - Claude Sonnet 4.5 (copilot)   # main loop stays smart (may need to fix real bugs)
  - GPT-5 (copilot)
---
```

…then in the body, add a paragraph advising:

> The *fetch*, *reply-formatting*, and *resolve* steps are mechanical. If your session model
> is expensive, temporarily switch to a cheaper model for those steps (see §3 of the
> `core-review` skill) and switch back only for the *code fix* step.

#### F. Update agent-facing root docs

Add a section to each of:

- [templates/agents/AGENTS.md](../templates/agents/AGENTS.md)
- [templates/agents/AGENTS.codex.md](../templates/agents/AGENTS.codex.md)
- [templates/agents/CLAUDE.md](../templates/agents/CLAUDE.md)
- [templates/agents/copilot-instructions.md](../templates/agents/copilot-instructions.md)

titled **"Model-tier discipline"** with:

- Which shipped assets have a preferred tier (pointer to this document).
- How to override per session (env var / model picker / CLI flag per agent).
- Rule of thumb: *checklist tasks → cheap tier; design/reasoning → smart tier.*

#### G. New optional configuration hooks

Extend `.agents-toolkit.json` schema with an optional `models` block:

```json
{
  "models": {
    "copilot": { "cheap": "Claude Haiku 4.5 (copilot)", "smart": "Claude Sonnet 4.5 (copilot)" },
    "claude":  { "cheap": "haiku", "smart": "sonnet" }
  }
}
```

If present, `bin/cli.js` substitutes these into the shipped frontmatter at install time
instead of the built-in defaults. This is what lets a WordPress-only shop pick different
models than a Next.js shop without forking the toolkit.

Add `models.cheap` / `models.smart` to `DEFAULT_CONFIG` with the values from §5.2A.

#### H. Add filter category for "cheap-pin"

`FILE_CATEGORIES` in [bin/cli.js](../bin/cli.js) already filters by stack/tracker. Add an
optional `--model-pins {on,off}` flag (default `on`) so a user can install *without* the
`model:` frontmatter if their organization prefers to manage model choice centrally.

### 5.3 Explicit non-changes

- No changes to prompts that spawn genuine reasoning (`create-plan`, `work-*`).
- No changes to reference-only skills.
- No new subagent types — we're using Claude's built-in Explore/general-purpose plus the
  existing `runSubagent` capability on Copilot.

## 6. Rollout

### Milestone 1 — Documentation-only (this PR)

Ship *only* this plan file (`docs/subagent-cost-optimization-plan.md`) and get it reviewed.
No template edits.

### Milestone 2 — Copilot pins + docs (minor bump: `X.Y+1.0`)

- Add `model:` frontmatter to the "Cheap" prompts in §5.2A.
- Add the "Model-tier discipline" section to each root doc (§5.2F).
- Update [templates/shared/prompts/README.md](../templates/shared/prompts/README.md) with the tier column.
- Bump `VERSION` in [package.json](../package.json) and [src/index.js](../src/index.js) together.

### Milestone 3 — Claude installer transform (minor bump)

- Implement §5.2B (Copilot→Claude `model:` remap) in [bin/cli.js](../bin/cli.js).
- Add [src/cli.test.js](../src/cli.test.js) coverage: spawn install, assert `.claude/commands/*.md`
  contains `model: haiku` (not the Copilot name) and that stripping works when the tag is
  unrecognized.

### Milestone 4 — `Explore` override + config surface (minor bump)

- Add `templates/shared/agents/Explore.md` (§5.2C).
- Extend [bin/cli.js](../bin/cli.js) with `agents/` install step and `--no-agent-overrides` flag.
- Ship the `.agents-toolkit.json` `models` block (§5.2G) + `--model-pins` flag (§5.2H).
- Update [templates/shared/skills/core-review/SKILL.md](../templates/shared/skills/core-review/SKILL.md) per §5.2D.
- Update [templates/shared/prompts/resolve-github-reviews.prompt.md](../templates/shared/prompts/resolve-github-reviews.prompt.md) per §5.2E.

### Milestone 5 — Measure

After Milestone 4 ships, ask two heavy users to run their standard workflows for a week and
compare token usage against the previous week's baseline. Adjust which prompts stay pinned
cheap based on real failure modes.

## 7. Risks & mitigations

| Risk | Mitigation |
| --- | --- |
| Cheap model fails a task mid-flow, forcing rework | Prompts stay usable without the pin — user can switch tier and rerun. Add a note to each pinned prompt: *"If this run needed the smart tier to complete, tell us so we can adjust."* |
| Copilot vendor-qualified names change over time | Ship a prioritized array (§5.2A); user overrides via `.agents-toolkit.json` (§5.2G). |
| Downstream project already has its own `.claude/agents/Explore.md` | `installClaude` already honours `force` / `dryRun`; do **not** overwrite by default. Warn instead. |
| Claude `model:` alias gets rejected by an organization allowlist | Documented in Claude's own docs — Claude Code falls back to the inherited model; no crash. |
| Codex has no per-prompt model field yet | Guidance only (session-level flag). Revisit if Codex ships prompt-level model config. |

## 8. Verification checklist (per milestone)

- `npm test` stays green.
- New CLI flags appear in `help` output *and* have a corresponding test.
- Every array in [src/index.js](../src/index.js) exports (`PROMPTS`, `INSTRUCTIONS`, `SKILLS`, `HOOKS`, plus any
  new `AGENTS` array) matches the filesystem in `templates/shared/`.
- `package.json` `version` and `src/index.js` `VERSION` match.
- CHANGELOG `[Unreleased]` documents the model-hint behaviour and the opt-out flag.

## 9. Open questions

1. Do we want a shared *"cheap"* alias per agent that the user sets once, and every prompt
   references — or do we want per-prompt qualified names? (Plan currently favours the alias
   approach via §5.2G.)
2. Should [core-review](../templates/shared/skills/core-review/SKILL.md) grow a `--budget` argument (thoroughness level) so the caller can
   ask for `quick` on cheap runs and `thorough` on smart runs?
3. Do we want an install-time interactive prompt ("pick your cheap/smart tier") the first
   time `install` runs against a fresh repo?

---

**Next step:** review this plan; on approval, open Milestone 2 as `feature/subagent-cost-copilot-pins`.
