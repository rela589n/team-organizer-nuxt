<script setup lang="ts">
import { useI18n } from '~/composables/useI18n'
const { t: tt } = useI18n()
useHead({ title: `${tt('nav_home')} — ${tt('app_title')}` })
</script>

<template>
  <section class="space-y-6">
    <h1 class="text-2xl font-semibold">{{ tt('home_welcome') }}</h1>
    <p class="text-gray-600">{{ tt('home_desc') }}</p>
    <div>
      <NuxtLink to="/people" class="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
        {{ tt('home_get_started') }}
      </NuxtLink>
    </div>
  </section>
</template>
