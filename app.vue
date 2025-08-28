<template>
  <div class="min-h-screen bg-gray-50 text-gray-900">
    <NuxtRouteAnnouncer />
    <header class="border-b bg-white">
      <nav class="mx-auto max-w-5xl px-4 py-4 flex items-center justify-between">
        <NuxtLink to="/" class="font-semibold text-lg">Team Organizer</NuxtLink>
        <div class="flex items-center gap-4">
          <NuxtLink to="/" class="text-gray-600 hover:text-gray-900">Home</NuxtLink>
          <NuxtLink to="/people" class="text-gray-600 hover:text-gray-900">People</NuxtLink>
        </div>
      </nav>
    </header>
    <main class="mx-auto max-w-5xl px-4 py-8">
      <NuxtPage />
    </main>
  </div>
</template>
