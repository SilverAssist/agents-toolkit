# agents-toolkit docs site

A documentation microsite for `@silverassist/agents-toolkit` — a searchable catalog of
every skill, prompt/command, and instruction the package ships, plus a side-by-side
comparison of how Claude Code, GitHub Copilot, and Codex each install them.

Design: a shadcn-style docs layout (sidebar-free landing + detail pages, dark theme,
monospace accents).

## How content gets in

Nothing here is hand-authored duplicate content. `scripts/generate-content.mjs` reads the
canonical sources under `../templates/shared/` (skills, prompts, instructions, agent
overrides, partials) plus `../package.json`, parses each file's frontmatter and body, and
writes `src/content/generated.json`. That file is regenerated automatically by `predev`
and `prebuild` — never edit it directly, and it isn't committed (see `.gitignore`).

A handful of things aren't derivable from frontmatter and are curated by hand instead:

- `src/content/agents.ts` — the per-agent (Claude/Copilot/Codex) install commands, file
  trees, and notes, sourced from the root `README.md`'s Setup section.
- `src/content/tutorials.ts` — worked, multi-step examples chaining several prompts/skills
  together (the "Tutorials" nav item).
- Prompt category/tracker/variables and skill group taxonomy inside
  `scripts/generate-content.mjs` itself (`PROMPT_META`, `SKILL_GROUP`) — this taxonomy
  lives only in README prose, not in any file's frontmatter.

When a skill, prompt, or instruction is added, renamed, or removed under
`templates/shared/`, the site picks it up automatically on the next `npm run dev` or
`npm run build` — no site code changes needed unless it's a new category outside the
existing taxonomy.

## Commands

```bash
npm run dev              # regenerate content + start the dev server
npm run build             # regenerate content + type-check + production build to dist/
npm run generate-content  # just regenerate src/content/generated.json
npm run preview           # preview the production build locally
```

## Deployment

`.github/workflows/deploy-site.yml` (repo root) builds this site and deploys `dist/` to
GitHub Pages on every push to `main` that touches `site/**` or `templates/shared/**`. It
sets `VITE_BASE_PATH=/agents-toolkit/` to match the Pages subpath, and copies
`index.html` to `404.html` after the build so client-side routes (e.g. `/skills/core-review`)
resolve correctly on a hard refresh or direct link.

**One-time setup required in the repo settings:** Settings → Pages → Build and
deployment → Source → "GitHub Actions". Without that, the workflow's `deploy-pages`
step has nowhere to publish to.
