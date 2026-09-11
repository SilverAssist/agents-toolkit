// Reads the canonical templates/shared/** sources (the single source of truth the CLI
// installs from) and produces site/src/content/generated.json. Re-run via `npm run predev`
// / `npm run prebuild` — never hand-edit the generated file.
import matter from 'gray-matter';
import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const SHARED = path.join(ROOT, 'templates/shared');
const OUT_DIR = path.resolve(__dirname, '../src/content');

const isDir = (p) => statSync(p).isDirectory();

// A few shipped templates have an unquoted `key: { ... }` inside a plain YAML scalar
// (e.g. "next: { revalidate, tags }" inside a `description:` line), which breaks strict
// YAML parsing. Rather than mutate the canonical template, fall back to pulling
// name/description/applyTo out of the frontmatter block with a line-oriented regex.
function fallbackFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: raw.trim() };
  const [, fm, rest] = match;
  const data = {};
  for (const key of ['name', 'description', 'applyTo', 'model', 'argument-hint']) {
    const line = fm.match(new RegExp(`^${key}:\\s*"?(.+?)"?\\s*$`, 'm'));
    if (line) data[key] = line[1];
  }
  return { data, body: rest.trim() };
}

const readMd = (file) => {
  const raw = readFileSync(file, 'utf-8');
  try {
    const { data, content } = matter(raw);
    return { data, body: content.trim() };
  } catch {
    console.warn(`  ! non-strict YAML frontmatter in ${path.relative(ROOT, file)}, using regex fallback`);
    return fallbackFrontmatter(raw);
  }
};

// --- Prompts / Commands: taxonomy that lives only in README prose, not in frontmatter ---
const PROMPT_META = {
  'analyze-ticket': { category: 'Workflow', tracker: 'Jira', variables: ['{ticket-id}'] },
  'analyze-github-issue': { category: 'Workflow', tracker: 'GitHub', variables: ['{issue-number}'] },
  'create-plan': { category: 'Workflow', tracker: 'All', variables: ['{feature-description}'] },
  'work-ticket': { category: 'Workflow', tracker: 'Jira', variables: ['{ticket-id}'] },
  'work-github-issue': { category: 'Workflow', tracker: 'GitHub', variables: ['{issue-number}'] },
  'prepare-pr': { category: 'Workflow', tracker: 'All', variables: [] },
  'create-pr': { category: 'Workflow', tracker: 'Jira', variables: ['{ticket-id}'] },
  'create-github-pr': { category: 'Workflow', tracker: 'GitHub', variables: ['{issue-number}'] },
  'finalize-pr': { category: 'Workflow', tracker: 'Jira', variables: ['{ticket-id}'] },
  'finalize-github-pr': { category: 'Workflow', tracker: 'GitHub', variables: ['{issue-number}'] },
  'prepare-github-release': { category: 'Workflow', tracker: 'GitHub', variables: [] },
  'review-code': { category: 'Utility', tracker: 'All', variables: [] },
  'fix-issues': { category: 'Utility', tracker: 'All', variables: [] },
  'add-tests': { category: 'Utility', tracker: 'All', variables: ['{target-file}'] },
  'audit-ai-seo': { category: 'Utility', tracker: 'All', variables: ['{target-url}'] },
  'new-wp-component': { category: 'Utility', tracker: 'All', variables: ['{component-name}'] },
  'new-wp-plugin': { category: 'Utility', tracker: 'All', variables: ['{plugin-name}'] },
  'quality-check': { category: 'Utility', tracker: 'All', variables: [] },
  'resolve-github-reviews': { category: 'Utility', tracker: 'GitHub', variables: ['{pr-number}', '{repo}'] },
};

// Thematic grouping for skills — not present in frontmatter, curated from each skill's
// stated purpose so the catalog can filter/color-code like the prompt categories above.
const SKILL_GROUP = {
  'component-architecture': 'Architecture',
  'domain-driven-design': 'Architecture',
  'create-component': 'WordPress',
  'plugin-creation': 'WordPress',
  'quality-checks': 'WordPress',
  testing: 'WordPress',
  'core-review': 'Review',
  'github-review-management': 'Review',
  'bitbucket-review-management': 'Review',
  'nextjs-caching': 'Frontend',
  'stack-context': 'Frontend',
  'testing-patterns': 'Frontend',
  'tsdoc-standards': 'Frontend',
  'ai-seo-optimization': 'SEO',
  'release-management': 'Release',
};

const MODEL_ALIAS = {
  'Claude Haiku 4.5': { tier: 'cheap', claude: 'haiku' },
  'Claude Sonnet 5': { tier: 'smart', claude: 'sonnet' },
};

function loadSkills() {
  const dir = path.join(SHARED, 'skills');
  return readdirSync(dir)
    .filter((name) => isDir(path.join(dir, name)))
    .map((slug) => {
      const { data, body } = readMd(path.join(dir, slug, 'SKILL.md'));
      return {
        slug,
        name: data.name ?? slug,
        description: data.description ?? '',
        model: data.model ?? null,
        argumentHint: data['argument-hint'] ?? null,
        group: SKILL_GROUP[slug] ?? 'Other',
        body,
      };
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

function loadPrompts() {
  const dir = path.join(SHARED, 'prompts');
  return readdirSync(dir)
    .filter((f) => f.endsWith('.prompt.md'))
    .map((file) => {
      const slug = file.replace(/\.prompt\.md$/, '');
      const { data, body } = readMd(path.join(dir, file));
      const meta = PROMPT_META[slug] ?? { category: 'Utility', tracker: 'All', variables: [] };
      const modelInfo = MODEL_ALIAS[data.model] ?? null;
      return {
        slug,
        title: slug
          .split('-')
          .map((w) => w[0].toUpperCase() + w.slice(1))
          .join(' '),
        description: data.description ?? '',
        model: data.model ?? null,
        modelTier: modelInfo?.tier ?? null,
        claudeModel: modelInfo?.claude ?? null,
        tools: data.tools ?? [],
        category: meta.category,
        tracker: meta.tracker,
        variables: meta.variables,
        body,
      };
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

function loadInstructions() {
  const dir = path.join(SHARED, 'instructions');
  return readdirSync(dir)
    .filter((f) => f.endsWith('.instructions.md'))
    .map((file) => {
      const slug = file.replace(/\.instructions\.md$/, '');
      const { data, body } = readMd(path.join(dir, file));
      const firstHeading = body.match(/^#\s+(.+)$/m)?.[1] ?? slug;
      return {
        slug,
        name: data.name ?? firstHeading,
        description: data.description ?? null,
        applyTo: data.applyTo ?? null,
        body,
      };
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

function loadAgentOverrides() {
  const dir = path.join(SHARED, 'agents');
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md'))
    .map((file) => {
      const slug = file.replace(/\.md$/, '').replace(/\.agent$/, '');
      const { data, body } = readMd(path.join(dir, file));
      return {
        slug,
        name: data.name ?? slug,
        description: data.description ?? '',
        tools: typeof data.tools === 'string' ? data.tools.split(',').map((t) => t.trim()) : (data.tools ?? []),
        model: data.model ?? null,
        body,
      };
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

function loadPartials() {
  const dir = path.join(SHARED, 'prompts/_partials');
  return readdirSync(dir)
    .filter((f) => f.endsWith('.md') && f !== 'README.md')
    .map((file) => {
      const slug = file.replace(/\.md$/, '');
      const { body } = readMd(path.join(dir, file));
      const title = body.match(/^#\s+(.+)$/m)?.[1] ?? slug;
      const description =
        body
          .split('\n')
          .find((l) => l.trim() && !l.startsWith('#'))
          ?.trim()
          .slice(0, 200) ?? '';
      return { slug, title, description, body };
    })
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

const HOOKS = [
  {
    slug: 'validate-tsx',
    trigger: '*.tsx in components/',
    description: 'Validates kebab-case folders, index.tsx naming, default export, and Props interface.',
  },
  {
    slug: 'lint-format',
    trigger: '*.ts, *.tsx, *.js, *.jsx, *.css',
    description: 'Runs ESLint --fix and Prettier --write on the modified file.',
  },
];

const pkg = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));

const skills = loadSkills();
const prompts = loadPrompts();
const instructions = loadInstructions();
const agentOverrides = loadAgentOverrides();
const partials = loadPartials();

const generated = {
  generatedAt: new Date().toISOString(),
  meta: {
    name: pkg.name,
    version: pkg.version,
    description: pkg.description,
    repository: pkg.repository?.url?.replace(/^git\+/, '').replace(/\.git$/, ''),
    homepage: pkg.homepage,
    license: pkg.license,
  },
  counts: {
    skills: skills.length,
    prompts: prompts.length,
    instructions: instructions.length,
    agentOverrides: agentOverrides.length,
    partials: partials.length,
    hooks: HOOKS.length,
  },
  skills,
  prompts,
  instructions,
  agentOverrides,
  partials,
  hooks: HOOKS,
};

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(path.join(OUT_DIR, 'generated.json'), JSON.stringify(generated, null, 2));

console.log(
  `Generated content: ${skills.length} skills, ${prompts.length} prompts, ${instructions.length} instructions, ${agentOverrides.length} agent overrides, ${partials.length} partials.`,
);
