import type { InstallFilters } from '../types.js';

type CategoryEntries = {
  react?: readonly string[];
  wordpress?: readonly string[];
  universal?: readonly string[];
  jira?: readonly string[];
  github?: readonly string[];
};

/** Maps stack and tracker filter keys to the file names belonging to each category. */
export const FILE_CATEGORIES: Record<FileCategoryKey, CategoryEntries> = {
  instructions: {
    react: [
      'caching',
      'css-styling',
      'react-components',
      'seo-ai-optimization',
      'server-actions',
      'tests',
      'tsdoc-standards',
      'typescript',
    ],
    wordpress: ['php-standards', 'wordpress-plugin-architecture', 'testing-standards'],
    universal: ['documentation-language', 'github-workflow'],
  },
  prompts: {
    react: [],
    wordpress: ['new-wp-component', 'new-wp-plugin', 'quality-check'],
    universal: [
      'analyze-ticket',
      'work-ticket',
      'analyze-github-issue',
      'work-github-issue',
      'create-plan',
      'create-pr',
      'prepare-pr',
      'finalize-pr',
      'create-github-pr',
      'finalize-github-pr',
      'resolve-github-reviews',
      'review-code',
      'fix-issues',
      'add-tests',
      'prepare-github-release',
    ],
    jira: ['analyze-ticket', 'work-ticket', 'create-pr', 'finalize-pr'],
    github: [
      'analyze-github-issue',
      'work-github-issue',
      'create-github-pr',
      'finalize-github-pr',
      'resolve-github-reviews',
    ],
  },
  partials: {
    react: ['release-node'],
    wordpress: ['release-wordpress'],
    jira: ['jira-integration'],
    github: ['github-integration'],
    universal: ['git-operations', 'pr-template', 'validations', 'documentation'],
  },
  skills: {
    react: ['component-architecture', 'nextjs-caching', 'testing-patterns', 'tsdoc-standards'],
    wordpress: ['create-component', 'plugin-creation', 'quality-checks', 'testing'],
    // `core-review` is deliberately NOT github-scoped: it is a local, agent-side
    // consistency pass (doc↔code drift, stale indexes, broken links) that runs
    // before the PR exists, and nothing in it touches a forge API. `create-pr`
    // (the Jira/Bitbucket flow) invokes it too, so scoping it to `github` would
    // ship Jira projects a prompt referencing a skill their install filtered out.
    github: ['github-review-management'],
    universal: ['domain-driven-design', 'release-management', 'github-review-management', 'core-review'],
  },
} as const;

/** Valid content category keys used by `shouldIncludeFile` and `FILE_CATEGORIES`. */
export type FileCategoryKey = 'instructions' | 'prompts' | 'partials' | 'skills';

/**
 * Returns `true` when a file should be included given the active stack and tracker filters.
 *
 * @param filename - File basename without extension.
 * @param category - Content category (instructions, prompts, partials, skills).
 * @param filters - Resolved stack and tracker values.
 */
export function shouldIncludeFile(filename: string, category: FileCategoryKey, filters: InstallFilters): boolean {
  const cats = FILE_CATEGORIES[category];

  if (cats.universal?.includes(filename)) {
    if (filters.tracker !== 'all' && cats.jira?.includes(filename) && filters.tracker !== 'jira') return false;
    if (filters.tracker !== 'all' && cats.github?.includes(filename) && filters.tracker !== 'github') return false;
    return true;
  }

  if (filters.stack !== 'all') {
    if (cats.react?.includes(filename)) return filters.stack === 'react';
    if (cats.wordpress?.includes(filename)) return filters.stack === 'wordpress';
  }

  if (filters.tracker !== 'all') {
    if (cats.jira?.includes(filename)) return filters.tracker === 'jira';
    if (cats.github?.includes(filename)) return filters.tracker === 'github';
  }

  return true;
}
