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

/**
 * Drops the `model:` pin and `tools:` allowlist from Copilot/Codex prompt
 * frontmatter, and the body's `> **Model:**` note that documents them.
 *
 * @remarks
 * Both fields are shipped verbatim to Claude Code's derived commands via
 * {@link transformFrontmatterForClaude} — this transform only affects the
 * git-based (Copilot/Codex) install path, and the shared template source is
 * untouched, so nothing here changes what Claude Code receives.
 *
 * A hardcoded `model:` display string (`Claude Haiku 4.5`) has to match
 * Copilot's picker exactly to have any effect, and a `tools:` allowlist that
 * excludes a tool the prompt actually needs mid-run has produced a stuck
 * Copilot Chat session (tools and the model picker both wedged, requiring a
 * window reload) rather than the documented graceful fallback. Until that's
 * reproducible and fixable upstream, Copilot/Codex get the prompt's
 * instructions without either pin, so they keep whatever the user already
 * has configured.
 *
 * @param content - The full `.prompt.md` file contents, frontmatter included.
 * @returns The content with `model:`/`tools:` and the model blockquote removed.
 */
export function stripModelAndToolsPins(content: string): string {
  const match = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!match) return content;

  const [fullMatch, frontmatterBody] = match;
  if (fullMatch === undefined || frontmatterBody === undefined) return content;

  const lines = frontmatterBody.split('\n');
  const kept: string[] = [];
  let skippingListFor: string | null = null;
  for (const line of lines) {
    if (skippingListFor !== null) {
      if (/^\s+-\s/.test(line)) continue;
      skippingListFor = null;
    }
    if (/^(model|tools):(\s|$)/.test(line)) {
      skippingListFor = line;
      continue;
    }
    kept.push(line);
  }

  const rebuiltFrontmatter = `---\n${kept.join('\n')}\n---\n`;
  const body = content.slice(fullMatch.length);
  const bodyWithoutNote = body.replace(/^> \*\*Model:\*\*[^\n]*\n\n/m, '').replace(/^> \*\*Model:\*\*[^\n]*\n/m, '');

  return rebuiltFrontmatter + bodyWithoutNote;
}
