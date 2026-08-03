#!/usr/bin/env node
/**
 * Frontmatter shape check for the shipped prompt templates.
 *
 * `templates/` is the product: these files are copied verbatim into consumer
 * repositories, so a malformed frontmatter block ships straight through. The
 * checks here are the ones that have actually broken something:
 *
 * - A missing or unterminated `---` block makes the whole file body render as
 *   frontmatter, and the prompt silently stops being discoverable.
 * - `model:` as a *list* is rejected outright by GitHub Copilot CLI
 *   (`model: Expected string, received array`), so pins must stay scalar.
 * - A duplicate key is last-one-wins in YAML and hides the earlier value.
 * - A tab inside the block is not valid YAML indentation.
 *
 *
 * Exits non-zero with a per-file report on the first failing rule set.
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';

// Resolve js-yaml from the script’s own location so it works regardless of CWD.
const require = createRequire(import.meta.url);
const jsYaml = require('js-yaml');

const PROMPTS_DIR = path.join(process.cwd(), 'templates', 'shared', 'prompts');

/** Keys every prompt must declare. */
const REQUIRED_KEYS = ['description', 'tools'];

/** Keys that must hold a non-empty array, never a scalar. */
const LIST_KEYS = ['tools'];

/** Keys that must hold a single scalar value, never a list. */
const SCALAR_ONLY_KEYS = ['description', 'agent', 'model', 'name'];

/**
 * Extract the raw frontmatter block from a template.
 * @param {string} source - Full file contents
 * @returns {{ lines: string[] } | { error: string }} Parsed block or a failure reason
 */
function extractFrontmatter(source) {
  // Normalise CRLF so Windows checkouts don't leave \r on the delimiters.
  const lines = source.split(/\r?\n/);
  if (lines[0] !== '---') {
    return { error: 'file must open with a `---` frontmatter delimiter on line 1' };
  }
  const end = lines.indexOf('---', 1);
  if (end === -1) {
    return { error: 'frontmatter block is never closed with `---`' };
  }
  return { lines: lines.slice(1, end) };
}

/**
 * Validate one prompt file.
 * @param {string} file - Absolute path to the prompt
 * @returns {string[]} Problems found; empty when the file is valid
 */
function validate(file) {
  const problems = [];
  const block = extractFrontmatter(fs.readFileSync(file, 'utf-8'));
  if ('error' in block) return [block.error];

  // Parse with js-yaml to catch malformed YAML (unclosed quotes, `key: foo: bar`,
  // orphan list items) before checking individual values.
  let parsed;
  try {
    parsed = jsYaml.load(block.lines.join('\n')) ?? {};
  } catch (e) {
    return [`frontmatter is not valid YAML: ${e.message}`];
  }

  // Validate scalar-only keys via the parsed value — catches both flow
  // (`model: [a, b]`) and block-list forms.
  for (const key of SCALAR_ONLY_KEYS) {
    const val = parsed[key];
    if (val !== undefined && (Array.isArray(val) || (typeof val === 'object' && val !== null))) {
      problems.push(`\`${key}\` must be a single scalar value, not a list or mapping`);
    }
  }

  // Raw line scan for tabs and duplicate keys (js-yaml is last-one-wins for
  // duplicates, so it silently discards earlier values).
  const seen = new Map();
  for (const [index, line] of block.lines.entries()) {
    if (line.trim() === '') continue;
    if (line.includes('\t')) {
      problems.push(`line ${index + 2}: tab character — YAML indentation must use spaces`);
    }
    if (/^\s*-\s/.test(line)) continue;
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_-]*):(.*)$/);
    if (!match) {
      problems.push(`line ${index + 2}: not a \`key: value\` pair — ${JSON.stringify(line)}`);
      continue;
    }
    const [, key] = match;
    if (seen.has(key)) {
      problems.push(`duplicate key \`${key}\` (line ${index + 2} overrides line ${seen.get(key)})`);
    }
    seen.set(key, index + 2);
  }

  // LIST_KEYS must be non-empty arrays.
  for (const key of LIST_KEYS) {
    const val = parsed[key];
    if (val !== undefined && val !== null) {
      if (!Array.isArray(val) || val.length === 0) {
        problems.push(`\`${key}\` must be a non-empty list`);
      }
    }
  }

  // Required keys must be present and non-empty in the parsed output.
  for (const key of REQUIRED_KEYS) {
    const val = parsed[key];
    if (val === undefined || val === null) {
      problems.push(`missing or empty required key \`${key}\``);
      continue;
    }
    // For list keys, emptiness is already checked above; skip String() coercion.
    if (!LIST_KEYS.includes(key) && String(val).trim() === '') {
      problems.push(`missing or empty required key \`${key}\``);
    }
  }
  return problems;
}

const files = fs
  .readdirSync(PROMPTS_DIR)
  .filter((name) => name.endsWith('.prompt.md'))
  .map((name) => path.join(PROMPTS_DIR, name));

if (files.length === 0) {
  console.error(`No prompt templates found in ${PROMPTS_DIR}`);
  process.exit(1);
}

let failed = 0;
for (const file of files) {
  const problems = validate(file);
  if (problems.length > 0) {
    failed += 1;
    console.error(`\n${path.relative(process.cwd(), file)}`);
    for (const problem of problems) console.error(`  ✖ ${problem}`);
  }
}

if (failed > 0) {
  console.error(`\n${failed} of ${files.length} prompt templates have invalid frontmatter.`);
  process.exit(1);
}

console.log(`✓ ${files.length} prompt templates have valid frontmatter.`);
