import globals from 'globals'
import tseslint from 'typescript-eslint'
import eslint from '@eslint/js'
import mochaPlugin from 'eslint-plugin-mocha'
import eslintComments from '@eslint-community/eslint-plugin-eslint-comments'

export default [
  eslint.configs.recommended,

  ...tseslint.config({
    files: ['**/*.{ts,mts}'],
    extends: [tseslint.configs.recommended],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      '@eslint-community/eslint-comments': eslintComments,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          caughtErrors: 'none',
          varsIgnorePattern: '^_',
          argsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        {
          assertionStyle: 'never',
        },
      ],
      '@typescript-eslint/explicit-function-return-type': ['error'],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@eslint-community/eslint-comments/require-description': ['warn', { ignore: [] }],
    },
  }),
  {
    ignores: ['build/*', 'dist/*', 'node_modules/**', 'typescript/**'],
  },
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.mocha,
      },
    },
  },
  {
    plugins: {
      mocha: mochaPlugin,
    },
  },
  {
    files: ['**/*.{ts,mts}'],
    rules: {
      semi: [
        'error',
        'never',
        {
          beforeStatementContinuationChars: 'always',
        },
      ],
      'no-extra-semi': 'off',
      eqeqeq: ['error', 'smart'],
      'no-throw-literal': 'error',
    },
  },
  mochaPlugin.configs.recommended,
  {
    files: ['test/**/*.{ts,mts}'],
    rules: {
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      // Mocha's `this` context is untyped — these rules create noise in tests
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      'mocha/no-exclusive-tests': 'error',
      'mocha/consistent-spacing-between-blocks': 'off',
    },
  },
]
