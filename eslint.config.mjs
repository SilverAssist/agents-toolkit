import js from '@eslint/js';
import tseslint from 'typescript-eslint';

// TSDoc plugins (eslint-plugin-tsdoc, eslint-plugin-tsdoc-require-2) are added in PR E.
export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'bin/**', 'templates/**', 'scripts/**'],
  },
  {
    files: ['**/*.ts'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' },
      ],
    },
  },
);
