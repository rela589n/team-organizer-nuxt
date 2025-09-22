# Tooling Updates

This document describes the recommended linting/formatting/testing setup for the app.

## Linting & Formatting

- ESLint config: `.eslintrc.cjs` (Vue 3 + TS + prettier).
- Prettier config: `.prettierrc.json` with common conventions.
- Editor config: `.editorconfig` for consistent whitespace/newlines.

Add these scripts (already added in package.json):

- `yarn lint` — run ESLint across ts/js/vue files
- `yarn lint:fix` — fix auto-fixable issues
- `yarn format` — apply Prettier formatting
- `yarn typecheck` — Nuxt type checking

Recommended VSCode settings (team-wide, user-level):

```jsonc
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "eslint.validate": ["javascript", "typescript", "vue"],
  "files.eol": "\n"
}
```

## Tailwind

- `tailwind.config.ts` added with `content` globs to improve CSS purge. Extend theme gradually as needed.
- Styling approch: utility-first. Avoid scoped inline styles except for keyframes or library-specific needs.

## Testing (proposed)

Add in a follow-up PR:
- Unit tests with `vitest` for composables (usePeople, useTeams, utils).
- Simple E2E smoke with `@playwright/test` for core flows (add person/team, organize).
- CI: GitHub Actions to run `yarn typecheck`, `yarn lint`, `yarn test`, and `yarn build`.
