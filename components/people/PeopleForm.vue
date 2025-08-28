<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  mode: 'add' | 'edit'
  name: string
  error: string | null
}>()

const emit = defineEmits<{
  (e: 'update:name', value: string): void
  (e: 'submit'): void
}>()

const buttonLabel = computed(() => props.mode === 'edit' ? 'Save' : 'Add')
</script>

<template>
  <form @submit.prevent="emit('submit')" class="grid gap-4 rounded-lg border bg-white p-4 md:grid-cols-12">
    <div class="md:col-span-10">
      <label class="block text-sm font-medium text-gray-700">Name *</label>
      <input :value="name" @input="emit('update:name', ($event.target as HTMLInputElement).value)" type="text" placeholder="e.g. Alex Johnson" class="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
    </div>
    <div class="md:col-span-2 flex items-end gap-2">
      <button type="submit" class="inline-flex w-full items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
        {{ buttonLabel }}
      </button>
    </div>
    <div v-if="error" class="md:col-span-12 text-sm text-red-600">{{ error }}</div>
  </form>
</template>
