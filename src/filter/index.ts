import type { InstallFilters } from '../types.js';

type CategoryEntries = {
  react?: readonly string[];
  wordpress?: readonly string[];
  universal?: readonly string[];
  jira?: readonly string[];
  github?: readonly string[];
};

/**
 * File categories.
 *
 * @remarks TODO(tsdoc): verify this generated summary.
 */
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
    github: ['github-review-management', 'core-review'],
    universal: ['domain-driven-design', 'release-management', 'github-review-management', 'core-review'],
  },
} as const;

/**
 * File category key.
 *
 * @remarks TODO(tsdoc): verify this generated summary.
 */
export type FileCategoryKey = 'instructions' | 'prompts' | 'partials' | 'skills';

/**
 * Reports whether include file.
 *
 * @remarks TODO(tsdoc): verify this generated summary.
 *
 * @param filename - TODO(tsdoc): describe filename.
 * @param category - TODO(tsdoc): describe category.
 * @param filters - TODO(tsdoc): describe filters.
 * @returns TODO(tsdoc): describe the return value.
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
