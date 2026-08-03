import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import tsdoc from 'eslint-plugin-tsdoc';
import tsdocRequire from 'eslint-plugin-tsdoc-require-2';

// TSDoc plugins (eslint-plugin-tsdoc, eslint-plugin-tsdoc-require-2) are added in PR E.
export default tseslint.config(
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    plugins: {
      tsdoc,
      'tsdoc-require-2': tsdocRequire,
    },
    rules: {
      'tsdoc/syntax': 'error',
      'tsdoc-require-2/require': 'warn',
      'tsdoc-require-2/require-param': 'off',
      'tsdoc-require-2/require-returns': 'off',
    },
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx', '**/__tests__/**'],
    rules: {
      'tsdoc/syntax': 'off',
      'tsdoc-require-2/require': 'off',
    },
  },
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
