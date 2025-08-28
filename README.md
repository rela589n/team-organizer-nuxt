# Team Organizer

A Nuxt 4 application scaffold with a People entry page for organizing teams.

## Development

- Install dependencies: `yarn install` or `npm install`
- Run dev server: `yarn dev` or `npm run dev`
- Build for production: `yarn build`

## Project structure

- `app.vue` — App shell with header and `<NuxtPage />`.
- `pages/` — Route components.
  - `pages/index.vue` — Home page.
  - `pages/people.vue` — Thin orchestration page using components and a composable.
- `components/people/PeopleForm.vue` — Reusable form for adding/editing a person (name only).
- `components/people/PeopleList.vue` — List of people with ordinal numbers; emits edit/remove.
- `composables/usePeople.ts` — Source of truth for people collection, localStorage persistence, and CRUD.
- `utils/id.ts` — Small utility to generate unique IDs with a safe fallback.

This separation keeps business state (collection + persistence) independent from view components, making the code easier to test and extend (e.g., adding team features later).

## Pages

- Home: `/` – Intro and link to People page
- People: `/people` – Add, edit, and remove people. Data persists in your browser via localStorage.

## Tailwind CSS

This project uses Tailwind utility classes in components. If Tailwind is not yet configured in your environment, you can add it via either approach:

### Option A: Nuxt Tailwind module (simplest)

1. Install: `yarn add -D @nuxtjs/tailwindcss`  
2. Enable in `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  modules: ['@nuxtjs/tailwindcss'],
})
```

### Option B: Tailwind + PostCSS

1. Install: `yarn add -D tailwindcss postcss autoprefixer`
2. Create `tailwind.config.ts` and `postcss.config.cjs` as per Tailwind docs.
3. Add a global CSS file (e.g., `assets/css/tailwind.css`) and include it in `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  css: ['~/assets/css/tailwind.css']
})
```

Once Tailwind is configured, the styling in the pages will apply automatically.
