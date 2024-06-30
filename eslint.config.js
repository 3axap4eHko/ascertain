import prettier from 'eslint-plugin-prettier';
import typescriptEslint from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';

const ignores = ['docs', 'build', 'coverage', 'node_modules', '*.tmp.*', 'src/__tests__/*'];

export default [
  {
    files: ['src/**/*.ts'],

    plugins: {
      '@typescript-eslint': typescriptEslint,
      prettier,
    },

    ignores,

    languageOptions: {
      globals: {},
      parser: tsParser,
      ecmaVersion: 5,
      sourceType: 'script',

      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
        project: './tsconfig.json',
      },
    },

    rules: {
      semi: 'error',
      'prefer-const': 'error',
      'prettier/prettier': 'error',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-unused-vars': 'error',
      '@typescript-eslint/ban-ts-comment': 'warn',
      '@typescript-eslint/ban-types': 'off',
    },
  },
];
