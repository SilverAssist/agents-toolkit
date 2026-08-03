import type { ClaudeAlias } from '../types.js';

/**
 * Reads the `model:` value from Copilot frontmatter and maps it to a Claude Code alias.
 *
 * @param frontmatterBody - Raw frontmatter content without `---` delimiters.
 * @returns The Claude alias (`haiku`, `sonnet`, `opus`, `fable`), or `null` when the model is not a Claude variant.
 */
export function extractClaudeAlias(frontmatterBody: string): ClaudeAlias {
  const match = frontmatterBody.match(/^model:[ \t]+([^\n]+)$/m);
  const value = match?.[1]?.trim();
  if (!value) return null;
  if (/haiku/i.test(value)) return 'haiku';
  if (/sonnet/i.test(value)) return 'sonnet';
  if (/opus/i.test(value)) return 'opus';
  if (/fable/i.test(value)) return 'fable';
  return null;
}

/**
 * Converts Copilot prompt frontmatter to Claude Code frontmatter.
 * Strips Copilot-only fields (agent, description, tools) and rewrites
 * `model:` to the matching Claude alias; strips the block entirely when
 * no alias applies so Claude falls back to the session model.
 */
export function transformFrontmatterForClaude(content: string): string {
  const match = content.match(/^---\n([\s\S]*?)\n---\n\n?/);
  if (!match) return content;

  const [fullMatch, frontmatterBody] = match;
  if (fullMatch === undefined || frontmatterBody === undefined) return content;

  const body = content.slice(fullMatch.length);
  const alias = extractClaudeAlias(frontmatterBody);
  if (!alias) return body;

  return `---\nmodel: ${alias}\n---\n\n${body}`;
}

/** Rewrites `.github/` path references in prompt content to their `.claude/` equivalents. */
export function adaptPathsForClaude(content: string): string {
  return content
    .replace(/\.github\/copilot-instructions\.md/g, 'CLAUDE.md')
    .replace(/\.github\/prompts\/_partials\//g, '.claude/commands/_partials/');
}
