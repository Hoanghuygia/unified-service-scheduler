/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,

  parser: '@typescript-eslint/parser',

  parserOptions: {
    project: ['./tsconfig.json'],
    tsconfigRootDir: __dirname,
    sourceType: 'module',
  },

  plugins: ['@typescript-eslint', 'import'],

  extends: [
    'eslint:recommended',

    // TypeScript rules (basic)
    'plugin:@typescript-eslint/recommended',

    // Type-aware rules (QUAN TRỌNG)
    'plugin:@typescript-eslint/recommended-requiring-type-checking',

    // Import rules
    'plugin:import/recommended',
    'plugin:import/typescript',

    // Tắt conflict với Prettier
    'prettier',
  ],

  env: {
    node: true,
    jest: true,
    es2022: true,
  },

  ignorePatterns: ['dist', 'node_modules', 'coverage'],

  rules: {
    /**
     * 🔥 Core TypeScript rules
     */
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/consistent-type-imports': 'error',

    /**
     * 🔥 Async safety (CỰC QUAN TRỌNG)
     */
    '@typescript-eslint/no-floating-promises': 'error',
    '@typescript-eslint/no-misused-promises': [
      'error',
      {
        checksVoidReturn: {
          attributes: false,
        },
      },
    ],

    /**
     * 🔥 Import organization
     */
    'import/order': [
      'error',
      {
        groups: [
          ['builtin', 'external'],
          'internal',
          ['parent', 'sibling', 'index'],
        ],
        'newlines-between': 'always',
        alphabetize: { order: 'asc', caseInsensitive: true },
      },
    ],

    /**
     * 🔥 Optional (tuỳ style team)
     */
    '@typescript-eslint/explicit-function-return-type': 'off', // bật nếu muốn strict hơn
    '@typescript-eslint/require-await': 'warn',

    /**
     * 🔥 General JS rules
     */
    'no-console': 'warn',
  },
};