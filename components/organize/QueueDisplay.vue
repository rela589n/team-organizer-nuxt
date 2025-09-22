<script setup lang="ts">
import { computed } from 'vue'
import PersonChip from '~/components/common/PersonChip.vue'
import type { Person } from '~/composables/usePeople'

const props = defineProps<{
  queue: { person: Person }[]
  currentIdx: number
}>()

const emit = defineEmits<{
  (e: 'setStagingEl', el: HTMLElement | null): void
}>()

const visible = computed(() => props.queue.slice(Math.max(0, props.currentIdx + 1), Math.max(0, props.currentIdx + 1) + 3))
</script>

<template>
  <!-- Integrated queue at the center: first item is the staged/moving source -->
  <div class="mt-2 flex flex-col items-center justify-center">
    <!-- Queue anchored so the first (rightmost) item is exactly at the center line -->
    <div v-if="queue.length > 0" class="relative w-full h-10 select-none">
      <div class="absolute left-1/2 -translate-x-full">
        <TransitionGroup name="queue" tag="div" class="flex flex-row-reverse items-center gap-3">
          <template v-for="(q, qidx) in visible" :key="q.person.id">
            <div
              v-if="qidx === 0"
              :ref="(el) => emit('setStagingEl', el as HTMLElement | null)"
              class="flex items-center gap-2 rounded-full px-2 py-1 ring-2 ring-blue-500 bg-white/40 transform transition-transform transition-opacity duration-200 scale-100 whitespace-nowrap w-48 md:w-56 shrink-0"
            >
              <PersonChip :person="q.person" avatar-size="md" strong />
            </div>
            <div v-else class="flex items-center gap-2 rounded-full px-2 py-1 transform transition-transform transition-opacity duration-200 whitespace-nowrap w-48 md:w-56 shrink-0" :class="qidx === 1 ? 'scale-95 opacity-80' : 'scale-90 opacity-70'">
              <PersonChip :person="q.person" avatar-size="md" />
            </div>
          </template>
        </TransitionGroup>
      </div>
    </div>
  </div>
</template>

<style scoped>
.queue-enter-active, .queue-leave-active, .queue-move { transition: all 250ms cubic-bezier(0.22, 1, 0.36, 1); }
.queue-enter-from { opacity: 0; transform: translateX(-12px) scale(0.98); }
.queue-enter-to { opacity: 1; transform: translateX(0) scale(1); }
.queue-leave-from { opacity: 1; transform: translateX(0) scale(1); }
.queue-leave-to { opacity: 0; transform: translateX(12px) scale(0.98); }
</style>
