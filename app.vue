<script setup lang="ts">
import { useI18n } from '~/composables/useI18n'
const { t: tt, locale, setLocale, availableLocales } = useI18n()
</script>

<template>
  <div class="min-h-screen bg-gray-50 text-gray-900">
    <NuxtRouteAnnouncer />
    <header class="border-b bg-white">
      <nav class="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
        <NuxtLink to="/" class="font-semibold text-lg">{{ tt('app_title') }}</NuxtLink>
        <div class="flex items-center gap-4">
          <NuxtLink to="/" class="text-gray-600 hover:text-gray-900">{{ tt('nav_home') }}</NuxtLink>
          <NuxtLink to="/people" class="text-gray-600 hover:text-gray-900">{{ tt('nav_people') }}</NuxtLink>
          <NuxtLink to="/teams" class="text-gray-600 hover:text-gray-900">{{ tt('nav_teams') }}</NuxtLink>
          <NuxtLink to="/organize" class="text-gray-600 hover:text-gray-900">{{ tt('nav_organize') }}</NuxtLink>
          <div class="flex items-center gap-2">
            <label for="lang" class="sr-only">Language</label>
            <select id="lang" :value="locale" @change="setLocale(($event.target as HTMLSelectElement).value as any)" class="rounded-md border-gray-300 text-sm bg-white px-3 py-2 text-gray-700 focus:border-blue-500 focus:ring-blue-500 shadow-none">
              <option v-for="opt in availableLocales" :key="opt.code" :value="opt.code">{{ opt.label }}</option>
            </select>
          </div>
        </div>
      </nav>
    </header>
    <main class="mx-auto max-w-5xl px-4 py-8">
      <NuxtPage />
    </main>
  </div>
</template>
