<script setup lang="ts">
import {computed, nextTick, onMounted, ref, watch} from 'vue'
import {type Person, usePeople} from '~/composables/usePeople'
import {type Team, useTeams} from '~/composables/useTeams'
import { makeIndexMap } from '~/utils/collection'
import {useConfetti} from '~/composables/useConfetti'
import {useI18n} from '~/composables/useI18n'
import SpeedControl from '~/components/common/SpeedControl.vue'
import TeamCard from '~/components/teams/TeamCard.vue'
import QueueDisplay from '~/components/organize/QueueDisplay.vue'
import { useDragDrop } from '~/composables/useDragDrop'
import { dur as durUtil, speedText as speedTextUtil } from '~/utils/animation'
import { makeAssignmentQueue } from '~/utils/assignments'

const { t: tt } = useI18n()
useHead({ title: `${tt('nav_organize')} — ${tt('app_title')}` })

const { people } = usePeople()
const { teams, update, clearAllMembers, TEAM_COLORS, moveMemberBetweenTeams } = useTeams()

// Animation and control state
const running = ref(false)
// Speed factor: 0.5x–2.0x (1.0 = normal)
const speed = ref(1)
const currentIdx = ref<number>(-1) // index of the last COMPLETED step
const queue = ref<{ person: Person, teamId: string }[]>([])
let timer: number | null = null
// Epoch to invalidate in-flight animations/steps when resetting
let runEpoch = 0

// Duration helper scaled by speed (higher speed => shorter duration)
function dur(base: number): number {
  return durUtil(base, Number(speed.value) || 1)
}

const speedText = computed(() => speedTextUtil(Number(speed.value) || 1))

// Two-phase step control
const stagedIdx = ref<number | null>(null) // person currently staged (appearing/moving)
const appearing = ref(false)

// Visual feedback state is managed by useDragDrop

// Refs to coordinate fly animation
const stagingEl = ref<HTMLElement | null>(null)
const dropAreas = new Map<string, HTMLElement>()
// Queue UX: when the first item is moving, keep a placeholder so the row doesn't squash
const movingFirst = ref(false)
function setDropArea(teamId: string, el: HTMLElement | null) {
  if (el) dropAreas.set(teamId, el)
  else dropAreas.delete(teamId)
}

// --- Manual drag-and-drop state and helpers (moved into composable) ---
function movePerson(pid: string, fromTeamId: string, toTeamId: string) {
  moveMemberBetweenTeams(pid, fromTeamId, toTeamId)
}

// DnD handlers are now provided by useDragDrop
const {
  draggingPid,
  draggingFromTeamId,
  highlightTeamId,
  isOverTeam,
  handleDragStartMember,
  handleDragEndMember,
  handleDragOverTeam,
  handleDragEnterTeam,
  handleDragLeaveTeam,
  handleDropTeam,
} = useDragDrop(movePerson)

// Track last known center of the staging avatar to start confetti there
const lastStageOrigin = ref<{ x: number, y: number } | null>(null)
async function updateStageOrigin() {
  await nextTick()
  const el = stagingEl.value as any
  // Ensure we have a real DOM element before reading layout
  if (!el || typeof el.getBoundingClientRect !== 'function') return
  const r = el.getBoundingClientRect()
  lastStageOrigin.value = { x: r.left + r.width / 2, y: r.top + r.height / 2 }
}

// Derived helpers
const teamsMap = computed<Record<string, Team>>(() => makeIndexMap(teams.value))
const peopleMap = computed<Record<string, Person>>(() => makeIndexMap(people.value))
function teamPowerSum(t: Team): number {
  return t.members.reduce((sum, pid) => {
    const p = peopleMap.value[pid]
    if (!p) throw new Error(`teamPowerSum: unknown person id ${pid}`)
    return sum + p.power
  }, 0)
}




const canStart = computed(() => people.value.length > 0 && teams.value.length > 0)
const finished = computed(() => currentIdx.value >= 0 && currentIdx.value >= queue.value.length)
// Running/in-progress flag to lock Start while a run is underway
const inProgress = computed(() => running.value || stagedIdx.value !== null || (currentIdx.value >= 0 && currentIdx.value < queue.value.length))

// Confetti celebration control (reused via composable)
const hasCelebrated = ref(false)
const { fireBurst } = useConfetti()
watch(finished, (val) => {
  if (val) {
    if (!hasCelebrated.value) {
      hasCelebrated.value = true
      // Slight delay to allow last highlight to show before confetti
      window.setTimeout(() => {
        const originEl = stagingEl.value as any
        const rect = (originEl && typeof originEl.getBoundingClientRect === 'function') ? originEl.getBoundingClientRect() : undefined
        const fallback = lastStageOrigin.value
        const origin = rect
          ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
          : (fallback ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 })
        const teamPalette = Array.from(new Set(teams.value.map(t => t.color).filter(Boolean))) as string[]
        const colors = (teamPalette.length > 0 ? teamPalette : TEAM_COLORS)
        fireBurst({ origin, colors, speed: Number(speed.value) || 1, baseCount: people.value.length * 14 })
      }, 250)
    }
  } else {
    // Reset guard when a new run starts
    hasCelebrated.value = false
  }
})

function buildQueue() {
  // reset
  currentIdx.value = -1
  // Build using extracted utility; rely on canStart to gate invalid states
  queue.value = makeAssignmentQueue(people.value, teams.value)
}

// colorTint moved to utils/colors for reuse across app

// Perform a visual fly animation using the ACTUAL queue item to the team's drop area,
// then persist the member addition. If animation can't run, fall back to instant.
function applyStep(idx: number, opts?: { instant?: boolean }): Promise<void> {
  return new Promise<void>((resolve) => {
    const step = queue.value[idx]
    if (!step) { resolve(); return }
    const team = teamsMap.value[step.teamId]
          const members = [...team.members]
    // avoid duplicates if re-running
    if (members.includes(step.person.id)) { resolve(); return }

    // Capture epoch to cancel on reset
    const epoch = runEpoch

    const instant = !!opts?.instant
    const moveDuration = instant ? 0 : dur(1400)

    // Use the whole staging container (avatar + name) so the entire person moves
    const fromEl = stagingEl.value
    const toEl = dropAreas.get(step.teamId) || null

    const finish = () => {
      // Ensure queue placeholder state reset
      movingFirst.value = false
      // If a reset happened during the animation, skip committing
      if (epoch !== runEpoch) { resolve(); return }
      members.push(step.person.id)
      update(team.id, { members })
      // highlight destination team briefly
      highlightTeamId.value = team.id
      window.setTimeout(() => {
        if (highlightTeamId.value === team.id) highlightTeamId.value = null
      }, Math.min(600, moveDuration + 200))
      resolve()
    }

    if (!fromEl || !toEl || moveDuration === 0) {
      finish()
      return
    }

    try {
      if (typeof (fromEl as any).getBoundingClientRect !== 'function' || typeof (toEl as any).getBoundingClientRect !== 'function') {
        finish()
        return
      }
      const fromRect = (fromEl as any).getBoundingClientRect()

      // Create a temporary placeholder <li> at the end of the team's list to target the final position
      const listEl = toEl as HTMLElement
      const placeholder = document.createElement('li')
      placeholder.setAttribute('data-placeholder', 'true')
      // Make placeholder occupy a full-width list row similar to a member item
      placeholder.style.listStyle = 'none'
      placeholder.style.margin = '0'
      placeholder.style.padding = '0'
      placeholder.style.width = '100%'
      placeholder.style.height = '40px' // will be updated after sampling below
      placeholder.style.border = '0'
      placeholder.style.display = 'block'
      listEl.appendChild(placeholder)

      // Clone the whole staging block so avatar + name move together
      const clone = fromEl.cloneNode(true) as HTMLElement
      // Keep original visible during motion to avoid disappearance and layout squashing
      const prevVisibility = fromEl.style.visibility
      // fromEl.style.visibility = 'hidden'

      // Helper to compute page-relative target top-left so the clone's center aligns with the placeholder center
      const halfW = fromRect.width / 2
      const halfH = fromRect.height / 2
      const wasEmpty = (members.length === 0)
      const yNudge = wasEmpty ? -4 : 0
      const computeTarget = () => {
        const r = placeholder.getBoundingClientRect()
        return {
          left: (r.left + r.width / 2) - halfW,
          top: (r.top + r.height / 2) - halfH + yNudge,
        }
      }

      // Place the clone at the exact source position (page coords), initial scale 1
            // Move the ACTUAL queue element (fromEl) by making it fixed-positioned and animating
      // Use a FLIP-style clone overlay to animate while keeping queue layout stable
      movingFirst.value = true
      // Keep original visible to prevent queue squash and second item jump
      // (do not hide source during animation)

      // Create a wrapper to animate (position/scale) and let the clone fill it
      const wrapper = document.createElement('div')
      Object.assign(wrapper.style, {
        position: 'fixed',
        left: `${fromRect.left}px`,
        top: `${fromRect.top}px`,
        width: `${fromRect.width}px`,
        height: `${fromRect.height}px`,
        zIndex: '40',
        pointerEvents: 'none',
        transformOrigin: 'center center',
        transform: 'scale(1) translateZ(0)',
        willChange: 'left, top, transform',
        transition: `left ${moveDuration}ms cubic-bezier(0.22, 1, 0.36, 1), top ${moveDuration}ms cubic-bezier(0.22, 1, 0.36, 1), transform ${moveDuration}ms cubic-bezier(0.22, 1, 0.36, 1)`,
      } as CSSStyleDeclaration)

      Object.assign(clone.style, {
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      } as CSSStyleDeclaration)
      wrapper.appendChild(clone)
      document.body.appendChild(wrapper)

      // Initial target and scale to match list item height (uniform scale)
      let tgt = computeTarget()
      const liSample = (listEl.querySelector('li:not([data-placeholder])') as HTMLElement) || null
      const liHeight = (liSample ? liSample.getBoundingClientRect().height : 36) || 36
      // Ensure placeholder height matches final row height to compute proper center
      placeholder.style.height = `${liHeight}px`
      const targetScale = 1

      // Ensure the browser has applied initial styles before starting transition
      requestAnimationFrame(() => {
        // Small second RAF to be extra safe across browsers
        requestAnimationFrame(() => {
          wrapper.style.left = `${tgt.left}px`
          wrapper.style.top = `${tgt.top}px`
          wrapper.style.transform = `scale(${targetScale}) translateZ(0)`
        })
      })


      const cleanup = () => {
        wrapper.remove()
        // remove placeholder and reset state
        placeholder.remove()
        movingFirst.value = false
        // If this was the last assignment, fire confetti at landing origin
        if (idx === queue.value.length - 1) {
          try {
            hasCelebrated.value = true
            const r = placeholder.getBoundingClientRect()
            const origin = { x: r.left + r.width / 2, y: r.top + r.height / 2 }
            const teamPalette = Array.from(new Set(teams.value.map(t => t.color).filter(Boolean))) as string[]
            const colors = (teamPalette.length > 0 ? teamPalette : TEAM_COLORS)
            fireBurst({ origin, colors, speed: Number(speed.value) || 1, baseCount: people.value.length * 14 })
          } catch (e) {
            console.warn('Confetti burst failed at cleanup origin; continuing without confetti', e)
          }
        }
        finish()
      }

      window.setTimeout(cleanup, moveDuration)
    } catch (e) {
      console.warn('Animation failed, applying instantly', e)
      movingFirst.value = false
      finish()
    }
  })
}

function clearTimer() {
  if (timer !== null) {
    window.clearTimeout(timer)
    timer = null
  }
}

async function tick() {
  if (!running.value) return
  const next = currentIdx.value + 1
  if (next >= queue.value.length) {
    running.value = false
    currentIdx.value = queue.value.length
    stagedIdx.value = null
    return
  }
  // Phase 1: appear
  stagedIdx.value = next
  appearing.value = true
  await updateStageOrigin()
  const appearDuration = dur(600)
  await new Promise<void>(r => { clearTimer(); timer = window.setTimeout(() => r(), appearDuration) })
  appearing.value = false
  // Phase 2: move
  await applyStep(next)
  // Mark completed
  currentIdx.value = next
  stagedIdx.value = null
  // Schedule next step after a small gap
  const gap = dur(300)
  clearTimer()
  timer = window.setTimeout(() => { if (running.value) tick() }, gap)
}

function start() {
  if (!canStart.value) return
  // reset member lists
  clearAllMembers()
  buildQueue()
  running.value = true
  currentIdx.value = -1
  stagedIdx.value = null
  appearing.value = false
  clearTimer()
  // small delay before first appear for UX
  timer = window.setTimeout(() => { if (running.value) tick() }, dur(400))
}

function pause() {
  running.value = false
  clearTimer()
}

function resume() {
  if (finished.value) return
  if (!running.value) {
    running.value = true
    tick()
  }
}

function next() {
  // Immediately complete next step even if paused or waiting
  if (finished.value) return
  if (currentIdx.value < 0 && queue.value.length === 0) {
    // initialize once
    clearAllMembers()
    buildQueue()
    currentIdx.value = -1
  }
  const nextIdx = currentIdx.value + 1
  if (nextIdx < queue.value.length) {
    clearTimer()
    appearing.value = false
    stagedIdx.value = null
    // perform instantly (skip animations)
    applyStep(nextIdx, { instant: true })
    // If this was the last assignment, mark as finished to trigger confetti
    if (nextIdx === queue.value.length - 1) {
      currentIdx.value = queue.value.length
    } else {
      currentIdx.value = nextIdx
    }
    // if we were running, continue with the next step
    if (running.value) {
      const gap = dur(300)
      timer = window.setTimeout(() => { if (running.value) tick() }, gap)
    }
  }
}

function resetAll() {
  // Stop any running workflow and invalidate in-flight animations
  running.value = false
  clearTimer()
  runEpoch++
  // Clear UI/animation state
  highlightTeamId.value = null
  stagedIdx.value = null
  appearing.value = false
  movingFirst.value = false
  currentIdx.value = -1
  queue.value = []
  hasCelebrated.value = false
  lastStageOrigin.value = null
  // Clear assigned members for all teams
  clearAllMembers()
  // Rebuild an initial queue so user can Start immediately later
  buildQueue()
}

onMounted(() => {
  // Prepare initial queue (user must press Start)
  buildQueue()
})
function setStagingEl(el: HTMLElement | null) {
  stagingEl.value = el
}
</script>

<template>
  <section class="space-y-6 pb-28">
    <div class="flex items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold">{{ tt('organize_title') }}</h1>
        <p class="text-gray-600">{{ tt('organize_desc') }}</p>
      </div>
      <div class="text-sm text-gray-600">
        {{ tt('organize_people') }}: <span class="font-medium text-gray-900">{{ people.length }}</span>
        <span class="mx-2">•</span>
        {{ tt('organize_teams') }}: <span class="font-medium text-gray-900">{{ teams.length }}</span>
      </div>
    </div>


    <QueueDisplay :queue="queue" :currentIdx="currentIdx" @setStagingEl="setStagingEl" />

    <!-- Teams grid below staging -->
    <div class="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      <TeamCard
        v-for="t in teams"
        :key="t.id"
        :team="t"
        :teamPower="teamPowerSum(t)"
        :peopleMap="peopleMap"
        :highlight="highlightTeamId === t.id"
        :isOver="isOverTeam(t.id)"
        :setDropArea="setDropArea"
        :handleDragOverTeam="handleDragOverTeam"
        :handleDragEnterTeam="(e) => handleDragEnterTeam(e, t.id)"
        :handleDragLeaveTeam="(e) => handleDragLeaveTeam(e, t.id)"
        :handleDropTeam="(e) => handleDropTeam(e, t.id)"
        :handleDragStartMember="(e, pid) => handleDragStartMember(e, pid, t.id)"
        :handleDragEndMember="handleDragEndMember"
      />
    </div>


    <!-- Controls footer (fixed at bottom, above animations) -->
    <div class="fixed inset-x-0 bottom-0 z-50 border-t bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div class="mx-auto max-w-5xl px-4 py-2">
        <div class="flex flex-wrap items-center gap-3">
          <button @click="start" :disabled="!canStart || inProgress || finished" class="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50" :title="tt('organize_start') + ' disabled'">{{ tt('organize_start') }}</button>
          <button v-if="running" @click="pause" class="rounded-md bg-gray-200 px-4 py-2 text-gray-800 hover:bg-gray-300">{{ tt('organize_pause') }}</button>
          <button v-else @click="resume" :disabled="finished || !canStart" class="rounded-md bg-gray-200 px-4 py-2 text-gray-800 hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50">{{ tt('organize_resume') }}</button>
          <button @click="resetAll" class="rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-800 hover:bg-gray-50">{{ tt('organize_reset') }}</button>
          <SpeedControl v-model="speed" :label="tt('organize_speed')" :valueText="speedText" />
          <button @click="next" :disabled="finished || !canStart" class="rounded-md bg-emerald-600 px-3 py-2 text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">{{ tt('organize_next') }}</button>
        </div>
      </div>
    </div>

  </section>
</template>

<style scoped>
.staging-appear {
  animation: staging-appear-keyframes 300ms cubic-bezier(0.22, 1, 0.36, 1) both;
}
@keyframes staging-appear-keyframes {
  from { transform: scale(0.85); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}

/* Confetti animations */
@keyframes confetti-burst {
  0% { transform: translate(0, 0) rotate(0deg) scale(1); opacity: 0; }
  10% { opacity: 1; }
  100% { transform: translate(var(--dx, 0px), var(--dy, 0px)) rotate(var(--rot, 720deg)) scale(0.9); opacity: 0; }
}
</style>
