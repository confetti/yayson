import globals from 'globals'
import tseslint from 'typescript-eslint'
import eslint from '@eslint/js'
import mochaPlugin from 'eslint-plugin-mocha'

export default [
  eslint.configs.recommended,

  ...tseslint.config({
    files: ['**/*.{ts,mts}'],
    extends: [tseslint.configs.recommended],
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
      'mocha/no-exclusive-tests': 'error',
      'mocha/consistent-spacing-between-blocks': 'off',
      '@typescript-eslint/explicit-function-return-type': ['off'],
    },
  },
]
