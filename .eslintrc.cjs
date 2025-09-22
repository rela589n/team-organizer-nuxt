/* Base ESLint config for Nuxt + Vue 3 + TypeScript.
   Keep it minimal and compatible; teams can extend as needed. */
module.exports = {
  root: true,
  env: { browser: true, es2021: true, node: true },
  extends: [
    'eslint:recommended',
    'plugin:vue/vue3-recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'plugin:import/typescript',
    'prettier',
  ],
  parser: 'vue-eslint-parser',
  parserOptions: {
    parser: '@typescript-eslint/parser',
    ecmaVersion: 'latest',
    sourceType: 'module',
    extraFileExtensions: ['.vue'],
  },
  rules: {
    'vue/multi-word-component-names': 'off',
    'vue/no-mutating-props': 'warn',
    'import/order': ['warn', { groups: [['builtin', 'external', 'internal'], ['parent', 'sibling', 'index']], 'newlines-between': 'always' }],
    '@typescript-eslint/no-explicit-any': 'off',
  },
  ignorePatterns: ['.output/**', 'node_modules/**', '.nuxt/**', 'dist/**'],
}
