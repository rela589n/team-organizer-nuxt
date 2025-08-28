<script setup lang="ts">
import type { Person } from '~/composables/usePeople'

defineProps<{
  people: Person[]
}>()

const emit = defineEmits<{
  (e: 'edit', person: Person): void
  (e: 'remove', id: string): void
}>()
</script>

<template>
  <div class="rounded-lg border bg-white">
    <div v-if="people.length === 0" class="p-6 text-center text-gray-500">
      No people added yet. Use the form above to add someone.
    </div>
    <ul v-else class="divide-y">
      <li v-for="(p, idx) in people" :key="p.id" class="flex flex-col gap-2 p-4 md:flex-row md:items-center md:justify-between">
        <div class="flex items-center gap-3">
          <div class="w-8 text-gray-500 tabular-nums text-right select-none">{{ idx + 1 }}.</div>
          <div>
            <div class="font-medium">{{ p.name }}</div>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button @click="emit('edit', p)" class="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50">Edit</button>
          <button @click="emit('remove', p.id)" class="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700">Remove</button>
        </div>
      </li>
    </ul>
  </div>
</template>
