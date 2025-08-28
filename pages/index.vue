<script setup lang="ts">
useHead({ title: 'Home — Team Organizer' })
</script>

<template>
  <section class="space-y-6">
    <h1 class="text-2xl font-semibold">Welcome to Team Organizer</h1>
    <p class="text-gray-600">Create and manage a list of people, then organize them into teams.</p>
    <div>
      <NuxtLink to="/people" class="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
        Get started: Enter People
      </NuxtLink>
    </div>
  </section>
</template>
