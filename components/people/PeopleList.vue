<script setup lang="ts">
import type { Person } from '~/composables/usePeople'

defineProps<{
  people: Person[]
}>()

const emit = defineEmits<{
  (e: 'update', id: string, name: string): void
  (e: 'remove', id: string): void
}>()
</script>

<template>
  <div class="rounded-lg border bg-white">
    <div v-if="people.length === 0" class="p-6 text-center text-gray-500">
      No people added yet. Use the button below to add someone.
    </div>
    <div v-else>
      <ul class="divide-y">
        <li v-for="(p, idx) in people" :key="p.id" class="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
          <div class="flex items-center gap-3 md:gap-6 w-full">
            <div class="w-8 text-gray-500 tabular-nums text-right select-none">{{ idx + 1 }}.</div>
            <div class="min-w-0 flex-1">
              <label class="block text-sm font-medium text-gray-700">Name</label>
              <input :value="p.name" @input="emit('update', p.id, ($event.target as HTMLInputElement).value)" :data-person-id="p.id" type="text" class="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
            </div>
          </div>
          <div class="flex items-center gap-2">
            <button @click="emit('remove', p.id)" title="Remove person" class="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700">Remove</button>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>
