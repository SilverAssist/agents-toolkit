<!-- agents-toolkit:planning-doc issue=43 -->

# Copilot Subagent Overrides (`feature/43-copilot-agent-overrides`)

## Problem Statement

The model-pin work in #39/#40 left one gap: on Copilot, **skills have no model
boundary** — an inline `core-review` from a smart-tier orchestrator (e.g.
`create-github-pr`) still runs on the smart tier because skills inherit the
invoking prompt's model. `.agent.md` files (VS Code's custom-agent format)
establish their own `model:` boundary, making cheap-pinned subagents possible on
Copilot. This is the Copilot analogue of `templates/shared/agents/Explore.md`.

## Proposed Changes

### Phase 1 — Ship the Copilot agent template

**File**: `templates/shared/agents/core-review.agent.md`

VS Code detects any `.md` file in `.github/agents/` as a custom agent, but the
`.agent.md` extension is the canonical form. Key design decisions confirmed by
the docs:

```yaml
---
name: core-review
description: "Run a consistency review (doc\u2194code drift, stale indexes, broken links)\
  \ before opening a PR or pushing review fixes. Read-only; returns a prioritized\
  \ findings list."
model: Claude Haiku 4.5
tools: ['read', 'search']
user-invocable: false
---
```

- **`model: Claude Haiku 4.5`** — scalar only; array form (`Claude Haiku 4.5 (copilot)`)
  is rejected by Copilot CLI ([copilot-cli#2133](https://github.com/github/copilot-cli/issues/2133))
- **`tools: ['read', 'search']`** — VS Code tool names (not Claude Code's `Read, Grep, Glob`);
  read-only, mirrors the Claude Explore override intent
- **`user-invocable: false`** — hides from the agents dropdown; the agent is a
  delegate invoked by orchestrators, not a top-level command
- **Model ceiling guarantee**: "The requested model cannot exceed the cost tier
  of the main model. If you request a more expensive model, the subagent falls
  back to the main model." — cheap-pin is honoured unconditionally; no escalation
  possible

Body: the core-review checklist from `templates/shared/skills/core-review/SKILL.md`,
condensed to be self-contained (the skill text is too long for a subagent body).

### Phase 2 — Installer: thread `--no-agent-overrides` through Copilot path

**File**: `bin/cli.js`

Changes:

1. `installGitBasedTarget()` receives `noAgentOverrides` from `options` (currently
   only `installClaude` uses it; Copilot path ignores it).
2. After the skills block, add:

```js
// Install Copilot subagent overrides (e.g. core-review.agent.md → cheap tier).
if (scope.shouldInstallPrompts && !noAgentOverrides && !isCodex && !isGlobal) {
  info('Installing Copilot subagent overrides...');
  const result = copyDir(
    path.join(TEMPLATES_DIR, 'shared', 'agents'),
    path.join(targetDir, 'agents'),
    { force, dryRun, filter: (name) => name.endsWith('.agent.md') },
  );
  totalChanges += getChangeCount(result, dryRun);
  if (!dryRun && result.written > 0) {
    success(`Installed ${result.written} Copilot agent override(s) to .github/agents/`);
  }
}
```

3. `showHelp()` — update `--no-agent-overrides` description:
   - From: "Skip installing `.claude/agents/` overrides (Claude only)"
   - To:   "Skip installing agent overrides (`.claude/agents/` and `.github/agents/`)"

### Phase 3 — Update `src/index.js` exports

```js
export const AGENTS = ['Explore', 'core-review'];
```

`Explore` is Claude Code only; `core-review` is Copilot only. Both are listed
together because the export is a shared inventory — callers already filter by
install target. No separate `COPILOT_AGENTS` export needed.

### Phase 4 — Correct doc wording (4 root docs + README)

**What to add** (subagent escape hatch):

> Alternatively, @-mention `@agent-core-review` (or invoke it inline from an
> orchestrator that includes `agent` in its `tools`) to keep the pass cheap from
> within any context.

| File | Passage to update |
|---|---|
| `templates/agents/AGENTS.md:65` | After "to keep it cheap, invoke it as a standalone chat" |
| `templates/agents/copilot-instructions.md:61` | After "rather than referencing it inline" |
| `templates/shared/prompts/README.md:75` | After "Invoke the skill as a standalone chat to keep it cheap." |
| `templates/agents/AGENTS.codex.md` | Add note that `.agent.md` `model:` is also ignored by Codex |

### Phase 5 — Update orchestrator prompts

**Important constraint from docs**: for a prompt file to automatically delegate
to a subagent, it must include `agent` in its `tools` frontmatter. Our
orchestrators don't currently have this. Options:

- **Option A** (low-risk): document the escape hatch only ("if you have
  `core-review.agent.md` installed, you can @-mention it for a cheap pass") — no
  prompt tooling change
- **Option B** (full wiring): add `agent` to the `tools` of `create-github-pr`,
  `resolve-github-reviews`, `work-github-issue`, and add explicit delegation
  instructions

**Decision**: Option A for this PR (non-breaking); Option B tracked as part of
[#42](https://github.com/SilverAssist/agents-toolkit/issues/42) (tools scoping), which is about adding `tools:` to prompts systematically.

## Testing Strategy

### New tests in `src/cli.test.js`

1. `copilot install writes .github/agents/core-review.agent.md` — assert file
   exists after `install` without `--no-agent-overrides`
2. `--no-agent-overrides skips .github/agents/ for Copilot` — assert file does
   NOT exist after `install --no-agent-overrides`
3. `AGENTS export contains core-review` — assert `AGENTS.includes('core-review')`

### markdownlint + validate-prompts

The new `.agent.md` file uses YAML frontmatter but is NOT a `.prompt.md` —
`validate-prompts.mjs` only scans `templates/shared/prompts/*.prompt.md`, so no
change there. Markdownlint runs over `templates/shared/agents/` (already in
scope per #45).

## Phase Breakdown

| Phase | Deliverable | Complexity |
|---|---|---|
| 1 | `core-review.agent.md` template file | Low |
| 2 | `bin/cli.js` install + help text | Medium |
| 3 | `src/index.js` exports | Low |
| 4 | 4 root docs + prompts README | Low |
| 5 | 3 orchestrator prompts | Low |
| — | Tests | Medium |

## Risk Register

| Risk | Mitigation |
|---|---|
| `.github/agents/` path changes in future VS Code releases | Expose it as `COPILOT_AGENTS_DIR` in `src/index.js` so consumers can adapt |
| `--no-agent-overrides` now skips two dirs; existing callers assume Claude-only | Update help text and CHANGELOG; the flag name is already generic |
| `.agent.md` validator not in `validate-prompts.mjs` | Acceptable gap — the file format is simpler (no required `description:` equivalent today) |
