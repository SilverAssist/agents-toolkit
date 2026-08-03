// `check` is what CI and the pre-push hook run; this is the fast pre-commit
// subset, scoped to the files actually staged.
export default {
  // Markdown is never auto-formatted — see .prettierignore for why.
  '*.{js,mjs,cjs,json,yml,yaml}': 'prettier --write',
  // Run prettier then eslint sequentially on the same file to avoid a concurrent-write race.
  '*.ts': ['prettier --write', 'eslint --fix'],
  // Report only: markdownlint's --fix rewrites code spans and list numbering,
  // which silently changes meaning in these templates.
  '*.md': 'markdownlint-cli2',
  // The validator always inspects every prompt (a frontmatter contract is
  // repo-wide), so it takes no file arguments.
  'templates/shared/prompts/*.prompt.md': () => 'node scripts/validate-prompts.mjs',
};
