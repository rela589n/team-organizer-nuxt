<script setup lang="ts">
import { computed } from 'vue'
import type { Person } from '~/composables/usePeople'
import type { Team } from '~/composables/useTeams'
import { colorTint } from '~/utils/colors'
import PersonChip from '~/components/common/PersonChip.vue'
import { useI18n } from '~/composables/useI18n'

const { t: tt } = useI18n()

const props = defineProps<{
  team: Team
  teamPower: number
  peopleMap: Record<string, Person>
  highlight: boolean
  isOver: boolean
  // DOM refs and DnD handlers forwarded from parent to keep behavior identical
  setDropArea: (teamId: string, el: HTMLElement | null) => void
  handleDragOverTeam: (ev: DragEvent) => void
  handleDragEnterTeam: (ev: DragEvent) => void
  handleDragLeaveTeam: (ev: DragEvent) => void
  handleDropTeam: (ev: DragEvent) => void
  handleDragStartMember: (ev: DragEvent, pid: string) => void
  handleDragEndMember: () => void
}>()

// Styles computed locally based on props
const cardStyle = computed(() => ({
  borderColor: props.team.color,
  boxShadow: props.highlight ? `0 0 0 4px ${props.team.color}` : undefined,
}))
const bodyStyle = computed(() => ({
  backgroundColor: colorTint(props.team.color, 0.12),
  outline: props.isOver ? `2px dashed ${props.team.color}` : undefined,
  outlineOffset: props.isOver ? '2px' : undefined,
}))
</script>

<template>
  <div class="rounded-xl border overflow-hidden transition-all flex flex-col h-full" :style="cardStyle">
    <div class="flex items-center justify-between gap-3 p-4" :style="{ backgroundColor: team.color, color: '#fff' }">
      <h2 class="font-semibold truncate">{{ team.name }}</h2>
      <div class="text-xs opacity-80">{{ tt('organize_power') }}: {{ teamPower }}</div>
    </div>
    <div
      class="p-4 flex-1"
      @dragover="handleDragOverTeam"
      @dragenter="handleDragEnterTeam"
      @dragleave="handleDragLeaveTeam"
      @drop="handleDropTeam"
      :style="bodyStyle"
    >
      <div v-if="(team.members?.length ?? 0) === 0" class="text-sm text-gray-600">{{ tt('organize_awaiting') }}</div>
      <ul
        :ref="(el) => setDropArea(team.id, el as HTMLElement | null)"
        class="flex flex-col gap-2 min-h-[2.25rem] rounded-md"
      >
        <li
          v-for="pid in (team.members || [])"
          :key="pid"
          class="flex items-center gap-3 rounded-md px-3 py-2 cursor-move"
          :style="{ backgroundColor: colorTint(team.color, 0.25) }"
          draggable="true"
          @dragstart="(e) => handleDragStartMember(e, pid)"
          @dragend="handleDragEndMember"
        >
          <PersonChip :person="peopleMap[pid]" avatar-size="sm" />
        </li>
      </ul>
    </div>
  </div>
</template>
