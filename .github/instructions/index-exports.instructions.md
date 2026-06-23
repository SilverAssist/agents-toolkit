---
applyTo: "src/index.js"
---

When reviewing `src/index.js`, cross-check every exported array against the
corresponding source directory in `templates/shared/`:

- `SKILLS`: one entry per subdirectory under `templates/shared/skills/`, sorted A–Z.
- `INSTRUCTIONS`: one entry per `.instructions.md` file under `templates/shared/instructions/`,
  with the `.instructions.md` suffix stripped, sorted A–Z.
- `PARTIALS`: one entry per `.md` file under `templates/shared/prompts/_partials/`
  (excluding `README.md`), with the `.md` suffix stripped, sorted A–Z.
- `HOOKS`: one entry per `.json` file under `templates/shared/hooks/`, with the `.json`
  suffix stripped, sorted A–Z.
- `PROMPTS.workflow` and `PROMPTS.utility`: together must cover every `.prompt.md` file
  under `templates/shared/prompts/` (excluding `_partials/`), with the `.prompt.md`
  suffix stripped.

Flag any mismatch as a bug — missing entries make the public API misleading for consumers.
