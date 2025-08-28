<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useTeams, type Team } from '~/composables/useTeams'
import { TEAM_COLORS } from '~/utils/colors'

useHead({ title: 'Teams — Team Organizer' })

const { teams, count, add, update, remove } = useTeams()

function addTeam() {
  const id = add() // will auto-generate name and color
  // focus the new team name input
  nextTick(() => {
    const el = document.querySelector<HTMLInputElement>(`input[data-team-id="${id}"]`)
    el?.focus()
    el?.select()
  })
}

function updateName(team: Team, name: string) {
  update(team.id, { name })
}

function updateColor(team: Team, color: string) {
  update(team.id, { color })
}

function removeTeam(team: Team) {
  const ok = confirm(`Are you sure you want to remove team "${team.name}"? This action cannot be undone.`)
  if (ok) {
    remove(team.id)
  }
}

// UI state: which team's color picker is open
const colorPickerOpen = ref<string | null>(null)
const lastColorButtonTeamId = ref<string | null>(null)
function focusColorButton(teamId: string | null) {
  if (!teamId) return
  nextTick(() => {
    const btn = document.querySelector<HTMLButtonElement>(`button[data-color-button-id="${teamId}"]`)
    btn?.focus()
  })
}
function toggleColorPicker(teamId: string) {
  const willOpen = colorPickerOpen.value !== teamId
  colorPickerOpen.value = willOpen ? teamId : null
  if (willOpen) {
    lastColorButtonTeamId.value = teamId
  } else {
    focusColorButton(lastColorButtonTeamId.value)
  }
}
function selectColor(team: Team, color: string) {
  updateColor(team, color)
  const lastId = lastColorButtonTeamId.value
  colorPickerOpen.value = null
  focusColorButton(lastId)
}

// Close color picker with Escape key
function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && colorPickerOpen.value) {
    const lastId = lastColorButtonTeamId.value
    colorPickerOpen.value = null
    focusColorButton(lastId)
  }
}

// Close color picker when clicking outside
function handleWindowClick() {
  if (colorPickerOpen.value) {
    const lastId = lastColorButtonTeamId.value
    colorPickerOpen.value = null
    focusColorButton(lastId)
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('click', handleWindowClick)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('click', handleWindowClick)
})

const emptyStateHint = computed(() => `No teams yet. Click \"Add Team\" to create Team #${count.value + 1}.`) 
</script>

<template>
  <section class="space-y-6">
    <div class="flex items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold">Teams</h1>
        <p class="text-gray-600">Create and manage teams.</p>
      </div>
      <div class="text-sm text-gray-600">Total: <span class="font-medium text-gray-900">{{ count }}</span></div>
    </div>

    <div class="rounded-lg border bg-white">
      <div v-if="teams.length === 0" class="p-6 text-center text-gray-500">{{ emptyStateHint }}</div>
      <div v-else>
        <ul class="divide-y">
          <li v-for="(t, idx) in teams" :key="t.id" class="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between">
          <div class="flex items-center gap-3 md:gap-6 w-full">
            <div class="w-8 text-gray-500 tabular-nums text-right select-none">{{ idx + 1 }}.</div>
            <div class="min-w-0 flex-1">
              <label class="block text-sm font-medium text-gray-700">Name</label>
              <input :value="t.name" @input="updateName(t, ($event.target as HTMLInputElement).value)" :data-team-id="t.id" type="text" class="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500" />
            </div>
          </div>
          <div class="flex items-center gap-6">
            <div class="min-w-[12rem]">
              <label class="block text-sm font-medium text-gray-700">Color</label>
              <div class="relative mt-1 inline-block">
                <button
                  type="button"
                  :data-color-button-id="t.id"
                  @click.stop="toggleColorPicker(t.id)"
                  class="inline-flex items-center gap-2 rounded-md border bg-white px-3 py-1.5 text-sm hover:bg-gray-50"
                  :aria-expanded="colorPickerOpen === t.id"
                  :aria-controls="`color-menu-${t.id}`"
                  aria-haspopup="listbox"
                >
                  <span
                    class="relative inline-flex h-5 w-8 items-center justify-center border"
                    :style="t.color ? { backgroundColor: t.color } : {}"
                    aria-hidden="true"
                  >
                    <svg v-if="!t.color" class="h-3 w-3 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M4 10a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1z" clip-rule="evenodd"/></svg>
                  </span>
                  <svg class="h-4 w-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.085l3.71-3.855a.75.75 0 111.08 1.04l-4.25 4.417a.75.75 0 01-1.08 0L5.25 8.27a.75.75 0 01-.02-1.06z" clip-rule="evenodd"/></svg>
                </button>
                <div
                  v-if="colorPickerOpen === t.id"
                  :id="`color-menu-${t.id}`"
                  class="absolute z-10 mt-2 w-56 rounded-md border bg-white p-2 shadow-lg"
                  role="listbox"
                  :aria-activedescendant="`color-option-${t.id}-${t.color || 'none'}`"
                  @click.stop
                >
                  <div class="flex flex-col">
                    <button
                      @click="selectColor(t, '')"
                      :id="`color-option-${t.id}-none`"
                      role="option"
                      :aria-selected="t.color === ''"
                      class="flex items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-gray-50"
                    >
                      <span class="relative inline-flex h-4 w-8 items-center justify-center border bg-white">
                        <svg class="h-3 w-3 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M4 10a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1z" clip-rule="evenodd"/></svg>
                      </span>
                      <span class="text-sm text-gray-700">No color</span>
                    </button>
                    <button
                      v-for="c in TEAM_COLORS"
                      :key="c"
                      @click="selectColor(t, c)"
                      :id="`color-option-${t.id}-${c}`"
                      role="option"
                      :aria-selected="t.color === c"
                      :disabled="teams.some(o => o.id !== t.id && o.color === c)"
                      class="flex items-center gap-2 rounded px-2 py-1.5 text-left hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <span class="h-4 w-8 border" :style="{ backgroundColor: c }" aria-hidden="true"></span>
                      <span class="text-sm text-gray-700">{{ c }}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <button @click="removeTeam(t)" title="Remove team" class="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700">Remove</button>
          </div>
        </li>
      </ul>
      </div>
    </div>

    <div class="flex items-center justify-between gap-4 mt-4">
      <button @click="addTeam" class="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">Add Team</button>
    </div>
  </section>
</template>
