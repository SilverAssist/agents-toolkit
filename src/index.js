/**
 * Agents Toolkit
 * @module @silverassist/agents-toolkit
 */

export const VERSION = "2.4.0";

export const PROMPTS = {
  workflow: [
    "analyze-github-issue",
    "analyze-ticket",
    "create-github-pr",
    "create-plan",
    "create-pr",
    "finalize-github-pr",
    "finalize-pr",
    "prepare-pr",
    "prepare-release",
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
    "review-code",
  ],
};

export const PARTIALS = [
  "documentation",
  "git-operations",
  "github-integration",
  "jira-integration",
  "pr-template",
  "validations",
];

export const INSTRUCTIONS = [
  "css-styling",
  "documentation-language",
  "github-workflow",
  "php-standards",
  "react-components",
  "server-actions",
  "testing-standards",
  "tests",
  "typescript",
  "wordpress-plugin-architecture",
];

export const SKILLS = [
  "ai-seo-optimization",
  "component-architecture",
  "create-component",
  "domain-driven-design",
  "plugin-creation",
  "quality-checks",
  "release-management",
  "testing",
  "testing-patterns",
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
