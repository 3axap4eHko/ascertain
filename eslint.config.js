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
      'prettier/prettier': 2,
      '@typescript-eslint/no-unused-vars': 2,
      '@typescript-eslint/ban-ts-comment': 1,
      '@typescript-eslint/await-thenable': 1,
      '@typescript-eslint/no-floating-promises': 2,
      '@typescript-eslint/ban-types': 0,
      '@typescript-eslint/no-explicit-any': 2,
      '@typescript-eslint/require-await': 2,
      '@typescript-eslint/no-misused-promises': 2,
      '@typescript-eslint/no-empty-object-type': 0,
      '@typescript-eslint/no-unsafe-declaration-merging': 0,
      '@typescript-eslint/prefer-promise-reject-errors': 2,
    },
  },
];
