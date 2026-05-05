# Skills

Skills are specialized knowledge guides that GitHub Copilot, Claude Code, and Codex can use to understand project-specific patterns and conventions.

## What are Skills?

Skills are markdown files with YAML frontmatter that provide domain-specific guidance. Unlike prompts (which are actions) or instructions (which are general guidelines), skills are **deep knowledge bases** for specific topics.

## Structure

Each skill lives in its own folder with a `SKILL.md` file:

```
.github/skills/
├── component-architecture/
│   └── SKILL.md
├── domain-driven-design/
│   └── SKILL.md
└── testing-patterns/
    └── SKILL.md
```

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

1. Create a folder: `.github/skills/your-skill-name/`
2. Create `SKILL.md` with frontmatter
3. Document patterns, examples, and conventions
4. Include ✅ CORRECT and ❌ INCORRECT examples
