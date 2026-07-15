// Flat ESLint config shared across the monorepo. Kept intentionally light for M0;
// per-package overrides (React/RN, Node) are layered in as those areas grow.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/.expo/**',
      '**/coverage/**',
      '**/node_modules/**',
      '**/.turbo/**',
      'infra/**',
      '**/babel.config.js',
      '**/metro.config.js',
      '**/*.config.js',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'warn',
    },
  },
);
