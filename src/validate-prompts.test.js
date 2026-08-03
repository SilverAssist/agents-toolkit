/**
 * Tests for scripts/validate-prompts.mjs.
 *
 * Kept in a separate file so the compat CI job (npm ci --omit=dev) can run
 * src/cli.test.js alone without hitting the js-yaml devDependency that this
 * script requires.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const VALIDATE_PATH = path.join(__dirname, '..', 'scripts', 'validate-prompts.mjs');

/**
 * Run validate-prompts.mjs against a synthetic prompts directory.
 * @param {Record<string, string>} files - filename → content map
 * @returns {{ status: number | null, stdout: string, stderr: string }}
 */
function runValidator(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'validate-test-'));
  const promptsDir = path.join(dir, 'templates', 'shared', 'prompts');
  fs.mkdirSync(promptsDir, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(promptsDir, name), content);
  }
  const result = spawnSync(process.execPath, [VALIDATE_PATH], {
    cwd: dir,
    encoding: 'utf-8',
  });
  fs.rmSync(dir, { recursive: true, force: true });
  return result;
}

test('validate-prompts: valid frontmatter passes', () => {
  const r = runValidator({
    'my.prompt.md':
      '---\ndescription: A valid prompt\nagent: agent\nmodel: Claude Haiku 4.5\ntools:\n  - read_file\n  - grep_search\n---\n\n# Body\n',
  });
  assert.equal(r.status, 0, `expected exit 0; stderr: ${r.stderr}`);
  assert.match(r.stdout, /1 prompt template/);
});

test('validate-prompts: missing opening delimiter fails', () => {
  const r = runValidator({ 'bad.prompt.md': 'no frontmatter\n' });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /must open with a `---`/);
});

test('validate-prompts: unclosed frontmatter block fails', () => {
  const r = runValidator({ 'bad.prompt.md': '---\ndescription: x\n# no close\n' });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /never closed/);
});

test('validate-prompts: missing description fails', () => {
  const r = runValidator({ 'bad.prompt.md': '---\nagent: agent\n---\n# Body\n' });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /missing or empty required key `description`/);
});

test('validate-prompts: empty description fails', () => {
  const r = runValidator({ 'bad.prompt.md': '---\ndescription:\nagent: agent\n---\n# Body\n' });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /missing or empty required key `description`/);
});

test('validate-prompts: block-list model fails', () => {
  const r = runValidator({
    'bad.prompt.md': '---\ndescription: x\nmodel:\n  - Claude Haiku 4.5\n  - GPT-5\n---\n# Body\n',
  });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /`model` must be a single scalar value/);
});

test('validate-prompts: inline-array model fails', () => {
  const r = runValidator({
    'bad.prompt.md': '---\ndescription: x\nmodel: [Claude Haiku 4.5, GPT-5]\n---\n# Body\n',
  });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /`model` must be a single scalar value/);
});

test('validate-prompts: duplicate key fails', () => {
  const r = runValidator({
    'bad.prompt.md': '---\ndescription: x\ndescription: y\n---\n# Body\n',
  });
  assert.notEqual(r.status, 0);
  // js-yaml throws on duplicate keys
  assert.match(r.stderr, /duplicated mapping key|duplicate key/);
});

test('validate-prompts: tab in frontmatter fails', () => {
  const r = runValidator({ 'bad.prompt.md': '---\ndescription: x\n\tmodel: haiku\n---\n# Body\n' });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /tab character/);
});

test('validate-prompts: malformed YAML fails', () => {
  const r = runValidator({ 'bad.prompt.md': '---\ndescription: "unclosed\n---\n# Body\n' });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /not valid YAML/);
});

test('validate-prompts: CRLF input passes', () => {
  const r = runValidator({
    'crlf.prompt.md':
      '---\r\ndescription: CRLF prompt\r\nagent: agent\r\ntools:\r\n  - read_file\r\n---\r\n\r\n# Body\r\n',
  });
  assert.equal(r.status, 0, `CRLF input must be accepted; stderr: ${r.stderr}`);
});

test('validate-prompts: missing tools fails', () => {
  const r = runValidator({
    'bad.prompt.md': '---\ndescription: A prompt\nagent: agent\n---\n# Body\n',
  });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /missing or empty required key `tools`/);
});

test('validate-prompts: empty tools list fails', () => {
  const r = runValidator({
    'bad.prompt.md': '---\ndescription: A prompt\nagent: agent\ntools: []\n---\n# Body\n',
  });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /`tools` must be a non-empty list/);
});

test('validate-prompts: scalar tools fails', () => {
  const r = runValidator({
    'bad.prompt.md': '---\ndescription: A prompt\nagent: agent\ntools: read_file\n---\n# Body\n',
  });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /`tools` must be a non-empty list/);
});

test('validate-prompts: tools list with empty-string entry fails', () => {
  const r = runValidator({
    'bad.prompt.md': "---\ndescription: A prompt\nagent: agent\ntools:\n  - read_file\n  - ''\n---\n# Body\n",
  });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /`tools` entries must be non-empty strings/);
});

test('validate-prompts: tools list with null entry fails', () => {
  const r = runValidator({
    'bad.prompt.md': '---\ndescription: A prompt\nagent: agent\ntools:\n  - read_file\n  - ~\n---\n# Body\n',
  });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /`tools` entries must be non-empty strings/);
});
