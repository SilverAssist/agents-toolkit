/**
 * Agents Toolkit
 * @module @silverassist/agents-toolkit
 */

export const VERSION = "2.4.0";

export const PROMPTS = {
  workflow: [
    "analyze-ticket",
    "create-plan",
    "work-ticket",
    "prepare-pr",
    "create-pr",
    "finalize-pr",
  ],
  utility: ["review-code", "fix-issues", "add-tests"],
};

export const PARTIALS = [
  "validations",
  "git-operations",
  "jira-integration",
  "documentation",
  "pr-template",
];

export const INSTRUCTIONS = [
  "typescript",
  "react-components",
  "server-actions",
  "tests",
  "css-styling",
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
