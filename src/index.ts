/**
 * Version.
 *
 * @remarks TODO(tsdoc): verify this generated summary.
 */
export const VERSION = '2.6.0';

/**
 * Prompts.
 *
 * @remarks TODO(tsdoc): verify this generated summary.
 */
export const PROMPTS: { workflow: readonly string[]; utility: readonly string[] } = {
  workflow: [
    'analyze-github-issue',
    'analyze-ticket',
    'create-github-pr',
    'create-plan',
    'create-pr',
    'finalize-github-pr',
    'finalize-pr',
    'prepare-github-release',
    'prepare-pr',
    'work-github-issue',
    'work-ticket',
  ],
  utility: [
    'add-tests',
    'audit-ai-seo',
    'fix-issues',
    'new-wp-component',
    'new-wp-plugin',
    'quality-check',
    'resolve-github-reviews',
    'review-code',
  ],
};

/**
 * Partials.
 *
 * @remarks TODO(tsdoc): verify this generated summary.
 */
export const PARTIALS: readonly string[] = [
  'documentation',
  'git-operations',
  'github-integration',
  'jira-integration',
  'pr-template',
  'release-node',
  'release-wordpress',
  'validations',
];

/**
 * Instructions.
 *
 * @remarks TODO(tsdoc): verify this generated summary.
 */
export const INSTRUCTIONS: readonly string[] = [
  'caching',
  'css-styling',
  'documentation-language',
  'github-workflow',
  'php-standards',
  'react-components',
  'seo-ai-optimization',
  'server-actions',
  'testing-standards',
  'tests',
  'tsdoc-standards',
  'typescript',
  'wordpress-plugin-architecture',
];

/**
 * Skills.
 *
 * @remarks TODO(tsdoc): verify this generated summary.
 */
export const SKILLS: readonly string[] = [
  'ai-seo-optimization',
  'component-architecture',
  'core-review',
  'create-component',
  'domain-driven-design',
  'github-review-management',
  'nextjs-caching',
  'plugin-creation',
  'quality-checks',
  'release-management',
  'testing',
  'testing-patterns',
  'tsdoc-standards',
];

/**
 * Hooks.
 *
 * @remarks TODO(tsdoc): verify this generated summary.
 */
export const HOOKS: readonly string[] = ['lint-format', 'validate-tsx'];

// Skills follow the `npx skills` standard: a single canonical copy lives in
// .agents/skills/ and each agent's skills directory symlinks to it.
/**
 * Skills layout.
 *
 * @remarks TODO(tsdoc): verify this generated summary.
 */
export const SKILLS_LAYOUT: {
  canonicalDir: string;
  agentDirs: { claude: string; copilot: string };
} = {
  canonicalDir: '.agents/skills',
  agentDirs: {
    claude: '.claude/skills',
    copilot: '.github/skills',
  },
};

/**
 * Claude commands.
 *
 * @remarks TODO(tsdoc): verify this generated summary.
 */
export const CLAUDE_COMMANDS: readonly string[] = [
  'analyze-ticket',
  'create-plan',
  'work-ticket',
  'prepare-pr',
  'create-pr',
  'finalize-pr',
  'review-code',
  'fix-issues',
  'add-tests',
];

/**
 * Claude files.
 *
 * @remarks TODO(tsdoc): verify this generated summary.
 */
export const CLAUDE_FILES: {
  instructions: string;
  commandsDir: string;
  skillsDir: string;
  agentsDir: string;
} = {
  instructions: 'CLAUDE.md',
  commandsDir: '.claude/commands',
  skillsDir: '.claude/skills',
  agentsDir: '.claude/agents',
};

// Subagent overrides shipped by the toolkit:
//   - 'Explore'     → Claude Code  (.claude/agents/Explore.md, cheap-tier default)
//   - 'core-review' → Copilot      (.github/agents/core-review.agent.md, cheap-tier)
// Names use the frontmatter `name:` field (the VS Code canonical identifier),
// not the raw filename stem — `core-review.agent.md` has `name: core-review`.
// Suppress both with --no-agent-overrides.
/**
 * Agents.
 *
 * @remarks TODO(tsdoc): verify this generated summary.
 */
export const AGENTS = ['Explore', 'core-review'] as const;
