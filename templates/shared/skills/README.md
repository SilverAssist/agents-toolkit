# Skills

Skills are specialized knowledge guides that GitHub Copilot, Claude Code, and Codex can use to understand project-specific patterns and conventions.

## What are Skills?

Skills are markdown files with YAML frontmatter that provide domain-specific guidance. Unlike prompts (which are actions) or instructions (which are general guidelines), skills are **deep knowledge bases** for specific topics.

## Structure

Each skill lives in its own folder with a `SKILL.md` file. Following the
[`npx skills`](https://github.com/vercel-labs/skills) standard, the real files
are installed **once** into a canonical `.agents/skills/` store, and each agent's
skills directory contains symlinks to it (single source of truth):

```
.agents/skills/                       # canonical store (real files)
├── ai-seo-optimization/
│   └── SKILL.md
├── component-architecture/
│   └── SKILL.md
├── create-component/
│   └── SKILL.md
├── domain-driven-design/
│   └── SKILL.md
├── plugin-creation/
│   └── SKILL.md
├── quality-checks/
│   └── SKILL.md
├── release-management/
│   └── SKILL.md
├── testing/
│   └── SKILL.md
└── testing-patterns/
    └── SKILL.md

.github/skills/   → symlinks to ../../.agents/skills/*   (Copilot, Codex)
.claude/skills/   → symlinks to ../../.agents/skills/*   (Claude Code, read natively)
```

Use `--copy` at install time to materialize real copies instead of symlinks
(symlinks also fall back to copies automatically on systems that don't support them).

## Frontmatter Format

```yaml
---
name: skill-name
description: When to use this skill. Agents use this to decide relevance.
---
```

## Available Skills

| Skill | Description |
|-------|-------------|
| `component-architecture` | React component patterns, folder structure, naming conventions |
| `domain-driven-design` | DDD principles, domain organization, barrel exports |
| `testing-patterns` | Jest + RTL patterns for Next.js 15 and Server Actions |

## Usage

Skills are automatically picked up by agents when relevant to your question. You can also reference them explicitly:

```
@workspace Use the component-architecture skill to create a new payment form component
```

## Creating Custom Skills

1. Create a folder: `.agents/skills/your-skill-name/` (canonical store)
2. Create `SKILL.md` with frontmatter
3. Run `npx @silverassist/agents-toolkit install --skills-only` to symlink it into `.github/skills/` and `.claude/skills/`
3. Document patterns, examples, and conventions
4. Include ✅ CORRECT and ❌ INCORRECT examples
