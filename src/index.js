/**
 * Agents Toolkit
 * @module @silverassist/agents-toolkit
 */

export const VERSION = "2.1.0";

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
  "component-architecture",
  "domain-driven-design",
  "testing-patterns",
];

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
};
