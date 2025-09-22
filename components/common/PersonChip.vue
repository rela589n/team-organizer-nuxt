<script setup lang="ts">
import type { Person } from '~/composables/usePeople'

withDefaults(defineProps<{
  person?: Person | null
  avatarSize?: 'sm' | 'md'
  strong?: boolean
}>(), {
  avatarSize: 'sm',
  strong: false,
})
</script>

<template>
  <div class="flex items-center gap-3 w-full">
    <span :class="[
      'inline-flex items-center justify-center rounded-full bg-gray-200 text-gray-600 select-none',
      avatarSize === 'sm' ? 'h-7 w-7 text-sm' : 'h-9 w-9 text-base',
    ]">?</span>
    <span class="flex items-center min-w-0 flex-1">
      <span :class="['text-sm truncate', strong ? 'font-semibold' : 'font-medium']">
        {{ person?.name ?? $t?.('unknown') ?? 'Unknown' }}
      </span>
      <span class="grow"></span>
      <span
        v-if="person"
        class="inline-flex items-center gap-1 text-gray-600 text-[11px] leading-4 shrink-0 opacity-90 mr-1"
        :title="`Power: ${person?.power ?? 1}`"
        aria-label="power"
      >
        <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" class="h-[12px] w-[12px]" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round">
          <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />
        </svg>
        <span class="tabular-nums">{{ person?.power ?? 1 }}</span>
      </span>
    </span>
  </div>
</template>
