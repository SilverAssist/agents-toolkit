/** Current package version — must match `package.json`. */
export const VERSION = '2.6.0';

/** Prompt names grouped by `workflow` and `utility` categories. */
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

/** Partial names installed into the `_partials/` subdirectory. */
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

/** Instruction file names installed into `.github/instructions/`. */
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

/** Skill names installed to the canonical `.agents/skills/` store. */
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

/** Hook config names installed to the hooks directory. */
export const HOOKS: readonly string[] = ['lint-format', 'validate-tsx'];

// Skills follow the `npx skills` standard: a single canonical copy lives in
// .agents/skills/ and each agent's skills directory symlinks to it.
/** Directory layout for the `npx skills` standard: canonical store and per-agent symlink targets. */
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

/** All prompt names available as Claude Code slash commands during `--claude` install, sorted alphabetically. */
export const CLAUDE_COMMANDS: readonly string[] = [
  'add-tests',
  'analyze-github-issue',
  'analyze-ticket',
  'audit-ai-seo',
  'create-github-pr',
  'create-plan',
  'create-pr',
  'finalize-github-pr',
  'finalize-pr',
  'fix-issues',
  'new-wp-component',
  'new-wp-plugin',
  'prepare-github-release',
  'prepare-pr',
  'quality-check',
  'resolve-github-reviews',
  'review-code',
  'work-github-issue',
  'work-ticket',
];

/** Install-target paths for Claude Code (instructions root file, commands dir, skills dir, agents dir). */
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
/** Subagent override names shipped by the toolkit (uses frontmatter `name:` field, not filename stem). */
export const AGENTS = ['Explore', 'core-review'] as const;
