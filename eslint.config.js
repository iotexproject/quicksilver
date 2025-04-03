import eslint from '@eslint/js';
import * as tseslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import prettierConfig from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import globals from 'globals';

// Base rules for production code
const baseRules = {
  'no-console': 'off',
  '@typescript-eslint/explicit-function-return-type': [
    'error',
    {
      allowExpressions: true,
      allowTypedFunctionExpressions: true,
    },
  ],
  '@typescript-eslint/no-unused-vars': [
    'error',
    {
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
    },
  ],
  '@typescript-eslint/no-explicit-any': 'warn',
  'max-lines-per-function': [
    'error',
    {
      max: 50,
      skipBlankLines: true,
      skipComments: true,
    },
  ],
  'max-params': ['error', 3],
  complexity: ['error', 8],
  'max-depth': ['error', 3],
  'import/order': [
    'error',
    {
      groups: ['builtin', 'external', 'internal', ['parent', 'sibling'], 'index', 'object', 'type'],
      'newlines-between': 'always',
      alphabetize: {
        order: 'asc',
        caseInsensitive: true,
      },
    },
  ],
};

export default [
  // Production code config
  {
    files: ['src/**/*.ts', 'src/**/*.js'],
    ignores: ['**/*.test.ts', '**/*.spec.ts', '**/__tests__/**'],
    ...eslint.configs.recommended,
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'module',
      },
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      import: importPlugin,
    },
    rules: baseRules,
  },

  // Test files config
  {
    files: ['**/*.test.ts', '**/*.spec.ts', '**/__tests__/**/*.ts'],
    ...eslint.configs.recommended,
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2021,
        sourceType: 'module',
      },
      globals: {
        ...globals.node,
        describe: true,
        it: true,
        expect: true,
        beforeEach: true,
        afterEach: true,
        beforeAll: true,
        afterAll: true,
        vi: true,
        test: true,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      import: importPlugin,
    },
    rules: {
      // Copy base rules but override specific ones
      ...baseRules,
      // Disable function length limit for test files
      'max-lines-per-function': 'off',
      // Still enforce other clean code principles
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      'max-params': ['error', 4],
      complexity: ['error', 10],
      'max-depth': ['error', 4],
    },
  },

  {
    ignores: ['node_modules/', 'dist/', 'coverage/', '*.config.js', '*.config.ts'],
  },
  prettierConfig,
];
