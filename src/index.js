/**
 * Agents Toolkit
 * @module @silverassist/agents-toolkit
 */

export const VERSION = "2.5.2";

export const PROMPTS = {
  workflow: [
    "analyze-github-issue",
    "analyze-ticket",
    "create-github-pr",
    "create-plan",
    "create-pr",
    "finalize-github-pr",
    "finalize-pr",
    "prepare-github-release",
    "prepare-pr",
    "work-github-issue",
    "work-ticket",
  ],
  utility: [
    "add-tests",
    "audit-ai-seo",
    "fix-issues",
    "new-wp-component",
    "new-wp-plugin",
    "quality-check",
    "resolve-github-reviews",
    "review-code",
  ],
};

export const PARTIALS = [
  "documentation",
  "git-operations",
  "github-integration",
  "jira-integration",
  "pr-template",
  "release-node",
  "release-wordpress",
  "validations",
];

export const INSTRUCTIONS = [
  "caching",
  "css-styling",
  "documentation-language",
  "github-workflow",
  "php-standards",
  "react-components",
  "seo-ai-optimization",
  "server-actions",
  "testing-standards",
  "tests",
  "tsdoc-standards",
  "typescript",
  "wordpress-plugin-architecture",
];

export const SKILLS = [
  "ai-seo-optimization",
  "component-architecture",
  "core-review",
  "create-component",
  "domain-driven-design",
  "github-review-management",
  "nextjs-caching",
  "plugin-creation",
  "quality-checks",
  "release-management",
  "testing",
  "testing-patterns",
  "tsdoc-standards",
];

export const HOOKS = ["validate-tsx", "lint-format"];

// Skills follow the `npx skills` standard: a single canonical copy lives in
// .agents/skills/ and each agent's skills directory symlinks to it.
export const SKILLS_LAYOUT = {
  canonicalDir: ".agents/skills",
  agentDirs: {
    claude: ".claude/skills",
    copilot: ".github/skills",
  },
};

// Claude Code equivalents
export const CLAUDE_COMMANDS = [
  "analyze-ticket",
  "create-plan",
  "work-ticket",
  "prepare-pr",
  "create-pr",
  "finalize-pr",
  "review-code",
  "fix-issues",
  "add-tests",
];

export const CLAUDE_FILES = {
  instructions: "CLAUDE.md",
  commandsDir: ".claude/commands",
  skillsDir: ".claude/skills",
};
