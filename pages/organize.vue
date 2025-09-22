<script setup lang="ts">
import { computed, onMounted, ref, watch, nextTick } from 'vue'
import { usePeople, type Person } from '~/composables/usePeople'
import { useTeams, type Team } from '~/composables/useTeams'
import { colorTint } from '~/utils/colors'
import { useConfetti } from '~/composables/useConfetti'
import { useI18n } from '~/composables/useI18n'

const { t: tt } = useI18n()
useHead({ title: `${tt('nav_organize')} — ${tt('app_title')}` })

const { people } = usePeople()
const { teams, update, clearAllMembers, TEAM_COLORS } = useTeams()

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
  const s = Math.min(2, Math.max(0.5, Number(speed.value) || 1))
  return Math.round(base / s)
}

const speedText = computed(() => {
  const s = Math.min(2, Math.max(0.5, Number(speed.value) || 1))
  return `${s.toFixed(2)}x`
})

// Two-phase step control
const stagedIdx = ref<number | null>(null) // person currently staged (appearing/moving)
const appearing = ref(false)

// Visual feedback state
const highlightTeamId = ref<string | null>(null)

// Refs to coordinate fly animation
const stagingEl = ref<HTMLElement | null>(null)
const stagingAvatarEl = ref<HTMLElement | null>(null)
const dropAreas = new Map<string, HTMLElement>()
// Queue UX: when the first item is moving, keep a placeholder so the row doesn't squash
const movingFirst = ref(false)
function setDropArea(teamId: string, el: HTMLElement | null) {
  if (el) dropAreas.set(teamId, el)
  else dropAreas.delete(teamId)
}

// --- Manual drag-and-drop state and helpers ---
const draggingPid = ref<string | null>(null)
const draggingFromTeamId = ref<string | null>(null)
const overTeamId = ref<string | null>(null)
// Track nested dragenter/leaves per team to avoid flicker when moving over children
const overCounts = ref<Record<string, number>>({})
function isOverTeam(teamId: string) {
  return (overCounts.value[teamId] || 0) > 0
}

function movePerson(pid: string, fromTeamId: string, toTeamId: string) {
  if (fromTeamId === toTeamId) return
  const fromTeam = teamsMap.value[fromTeamId]
  const toTeam = teamsMap.value[toTeamId]
  if (!fromTeam || !toTeam) return
  const fromMembers = Array.isArray(fromTeam.members) ? [...fromTeam.members] : []
  const toMembers = Array.isArray(toTeam.members) ? [...toTeam.members] : []
  const idx = fromMembers.indexOf(pid)
  if (idx !== -1) fromMembers.splice(idx, 1)
  if (!toMembers.includes(pid)) toMembers.push(pid)
  // Persist both teams
  update(fromTeam.id, { members: fromMembers })
  update(toTeam.id, { members: toMembers })
}

function handleDragStartMember(ev: DragEvent, pid: string, teamId: string) {
  draggingPid.value = pid
  draggingFromTeamId.value = teamId
  try {
    ev.dataTransfer?.setData('text/plain', JSON.stringify({ pid, fromTeamId: teamId }))
  } catch {}
  if (ev.dataTransfer) ev.dataTransfer.effectAllowed = 'move'
}

function handleDragEndMember() {
  draggingPid.value = null
  draggingFromTeamId.value = null
  overCounts.value = {}
  overTeamId.value = null
  highlightTeamId.value = null
}

function handleDragOverTeam(ev: DragEvent) {
  if (draggingPid.value) {
    ev.preventDefault() // allow drop
    if (ev.dataTransfer) ev.dataTransfer.dropEffect = 'move'
  }
}

function handleDragEnterTeam(ev: DragEvent, teamId: string) {
  if (!draggingPid.value) return
  // Increment nested enter counter to keep outline while inside children
  overCounts.value[teamId] = (overCounts.value[teamId] || 0) + 1
  overTeamId.value = teamId
  highlightTeamId.value = teamId
}

function handleDragLeaveTeam(ev: DragEvent, teamId: string) {
  // Decrement and clear only when fully left the drop area (not into a child)
  if (!draggingPid.value) return
  const cur = (overCounts.value[teamId] || 0) - 1
  overCounts.value[teamId] = Math.max(0, cur)
  if (overCounts.value[teamId] === 0 && overTeamId.value === teamId) {
    overTeamId.value = null
    highlightTeamId.value = null
  }
}

function handleDropTeam(ev: DragEvent, toTeamId: string) {
  ev.preventDefault()
  let pid = draggingPid.value
  let fromTeamId = draggingFromTeamId.value
  try {
    const raw = ev.dataTransfer?.getData('text/plain')
    if (raw) {
      const parsed = JSON.parse(raw)
      pid = String(parsed?.pid ?? pid)
      fromTeamId = String(parsed?.fromTeamId ?? fromTeamId)
    }
  } catch {}
  if (pid && fromTeamId && toTeamId && fromTeamId !== toTeamId) {
    movePerson(pid, fromTeamId, toTeamId)
  }
  // Clear all hover counters on drop
  overCounts.value = {}
  overTeamId.value = null
  highlightTeamId.value = null
  draggingPid.value = null
  draggingFromTeamId.value = null
}

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
const teamsMap = computed<Record<string, Team>>(() => Object.fromEntries(teams.value.map(t => [t.id, t])))
const peopleMap = computed<Record<string, Person>>(() => Object.fromEntries(people.value.map(p => [p.id, p])))
function teamPowerSum(t: Team): number {
  const ids = Array.isArray(t.members) ? t.members : []
  return ids.reduce((sum, pid) => {
    const p = peopleMap.value[pid]
    const pw = Number.isFinite(Number(p?.power)) ? Math.max(1, Math.floor(Number(p?.power))) : 1
    return sum + pw
  }, 0)
}

// Adaptive layout helpers to reduce empty space for small team counts
const gridMinHClass = computed(() => {
  const n = teams.value.length
  if (n <= 3) return 'min-h-[42vh]'
  if (n === 4) return 'min-h-[52vh]'
  return 'min-h-[70vh]'
})
const gridGapClass = computed(() => {
  const n = teams.value.length
  if (n <= 3) return 'gap-2'
  if (n === 4) return 'gap-3'
  return 'gap-4'
})

// Positions for up to 8 teams arranged around the center, adapted to count
const aroundPositions = computed(() => {
  const n = Math.min(teams.value.length, 8)
  // Default 8-position clockwise ring starting at top-center
  const ring = [
    { r: 1, c: 2 }, // top
    { r: 1, c: 3 }, // top-right
    { r: 2, c: 3 }, // right
    { r: 3, c: 3 }, // bottom-right
    { r: 3, c: 2 }, // bottom
    { r: 3, c: 1 }, // bottom-left
    { r: 2, c: 1 }, // left
    { r: 1, c: 1 }, // top-left
  ]
  if (n <= 0) return [] as { r: number, c: number }[]
  if (n === 1) return [ { r: 1, c: 2 } ]
  if (n === 2) return [ { r: 2, c: 1 }, { r: 2, c: 3 } ] // left, right
  if (n === 3) return [ { r: 1, c: 2 }, { r: 2, c: 1 }, { r: 2, c: 3 } ] // top, left, right
  if (n === 4) return [ { r: 1, c: 2 }, { r: 2, c: 3 }, { r: 3, c: 2 }, { r: 2, c: 1 } ] // top, right, bottom, left
  return ring.slice(0, n)
})

// Not used anymore for power-based balancing, kept for potential UI hints
const balancedTarget = computed(() => {
  // Legacy count-based target (unused)
  const res: Record<string, number> = {}
  return res
})

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
  queue.value = []
  currentIdx.value = -1
  if (!teams.value.length) return

  // helper to shuffle arrays in-place (Fisher–Yates)
  function shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const tmp = arr[i]
      arr[i] = arr[j]
      arr[j] = tmp
    }
    return arr
  }

  // Greedy power balancing: assign highest-power people first to the team with lowest current total power
  const persons = [...people.value].sort((a, b) => (b.power ?? 1) - (a.power ?? 1))
  const totals: Record<string, number> = {}
  for (const t of teams.value) totals[t.id] = 0

  for (const person of persons) {
    // among teams, pick id with minimal total; tie-breaker by random or by fewer members assigned so far
    const minTotal = Math.min(...Object.values(totals))
    const candidateIds = Object.keys(totals).filter(id => totals[id] === minTotal)
    const pickId = candidateIds[Math.floor(Math.random() * candidateIds.length)] || teams.value[0]?.id
    const chosenId = pickId || ''
    if (!chosenId) continue
    queue.value.push({ person, teamId: chosenId })
    totals[chosenId] += (Number.isFinite(Number(person.power)) ? Math.max(1, Math.floor(Number(person.power))) : 1)
  }
}

// colorTint moved to utils/colors for reuse across app

// Perform a visual fly animation using the ACTUAL queue item to the team's drop area,
// then persist the member addition. If animation can't run, fall back to instant.
function applyStep(idx: number, opts?: { instant?: boolean }): Promise<void> {
  return new Promise<void>((resolve) => {
    const step = queue.value[idx]
    if (!step) { resolve(); return }
    const team = teamsMap.value[step.teamId]
    const members = Array.isArray(team.members) ? [...team.members] : []
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
          } catch {}
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


    <!-- Integrated queue at the center: first item is the staged/moving source -->
    <div class="mt-2 flex flex-col items-center justify-center">
      <!-- Queue anchored so the first (rightmost) item is exactly at the center line -->
      <div v-if="queue.length > 0" class="relative w-full h-10 select-none">
        <div class="absolute left-1/2 -translate-x-full">
          <TransitionGroup name="queue" tag="div" class="flex flex-row-reverse items-center gap-3">
            <template v-for="(q, qidx) in queue.slice(Math.max(0, currentIdx + 1), Math.max(0, currentIdx + 1) + 3)" :key="q.person.id">
              <div
                v-if="qidx === 0"
                :ref="setStagingEl"
                class="flex items-center gap-2 rounded-full px-2 py-1 ring-2 ring-blue-500 bg-white/40 transform transition-transform transition-opacity duration-200 scale-100 whitespace-nowrap w-48 md:w-56 shrink-0"
              >
                <div class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gray-200 text-base text-gray-600">?</div>
                <div class="text-sm font-semibold">{{ q.person.name }}</div>
              </div>
              <div v-else class="flex items-center gap-2 rounded-full px-2 py-1 transform transition-transform transition-opacity duration-200 whitespace-nowrap w-48 md:w-56 shrink-0" :class="qidx === 1 ? 'scale-95 opacity-80' : 'scale-90 opacity-70'">
                <div class="inline-flex h-9 w-9 items-center justify-center rounded-full bg-gray-200 text-base text-gray-600">?</div>
                <div class="text-sm text-gray-600">{{ q.person.name }}</div>
              </div>
            </template>
          </TransitionGroup>
        </div>
      </div>
    </div>

    <!-- Teams grid below staging -->
    <div class="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      <div v-for="t in teams" :key="t.id" class="rounded-xl border overflow-hidden transition-all flex flex-col h-full" :style="{ borderColor: t.color, boxShadow: (highlightTeamId === t.id) ? `0 0 0 4px ${t.color}` : undefined }">
        <div class="flex items-center justify-between gap-3 p-4" :style="{ backgroundColor: t.color, color: '#fff' }">
          <h2 class="font-semibold truncate">{{ t.name }}</h2>
          <div class="text-xs opacity-80">{{ tt('organize_power') || 'power' }}: {{ teamPowerSum(t) }}</div>
        </div>
        <div
          class="p-4 flex-1"
          @dragover="handleDragOverTeam"
          @dragenter="handleDragEnterTeam($event, t.id)"
          @dragleave="handleDragLeaveTeam($event, t.id)"
          @drop="handleDropTeam($event, t.id)"
          :style="{
            backgroundColor: colorTint(t.color, 0.12),
            outline: (isOverTeam(t.id)) ? `2px dashed ${t.color}` : undefined,
            outlineOffset: (isOverTeam(t.id)) ? '2px' : undefined
          }"
        >
          <div v-if="(t.members?.length ?? 0) === 0" class="text-sm text-gray-600">{{ tt('organize_awaiting') }}</div>
          <ul
            :ref="(el) => setDropArea(t.id, el)"
            class="flex flex-col gap-2 min-h-[2.25rem] rounded-md"
          >
            <li
              v-for="pid in (t.members || [])"
              :key="pid"
              class="flex items-center gap-3 rounded-md px-3 py-2 cursor-move"
              :style="{ backgroundColor: colorTint(t.color, 0.25) }"
              draggable="true"
              @dragstart="handleDragStartMember($event, pid, t.id)"
              @dragend="handleDragEndMember"
            >
              <span class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-sm text-gray-600">?</span>
              <span class="text-sm font-medium">{{ (people.find(p => p.id === pid) as any)?.name || tt('unknown') }}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>


    <!-- Controls footer (fixed at bottom, above animations) -->
    <div class="fixed inset-x-0 bottom-0 z-50 border-t bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div class="mx-auto max-w-5xl px-4 py-2">
        <div class="flex flex-wrap items-center gap-3">
          <button @click="start" :disabled="!canStart || inProgress || finished" class="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50" :title="tt('organize_start') + ' disabled'">{{ tt('organize_start') }}</button>
          <button v-if="running" @click="pause" class="rounded-md bg-gray-200 px-4 py-2 text-gray-800 hover:bg-gray-300">{{ tt('organize_pause') }}</button>
          <button v-else @click="resume" :disabled="finished || !canStart" class="rounded-md bg-gray-200 px-4 py-2 text-gray-800 hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50">{{ tt('organize_resume') }}</button>
          <button @click="resetAll" class="rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-800 hover:bg-gray-50">{{ tt('organize_reset') }}</button>
          <div class="flex items-center gap-2">
            <label for="speed" class="text-sm text-gray-700">{{ tt('organize_speed') }}</label>
            <input id="speed" type="range" min="0.5" max="2" step="0.1" v-model.number="speed" class="h-2 w-40 accent-indigo-600" />
            <span class="text-xs text-gray-600 tabular-nums">{{ speedText }}</span>
          </div>
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
.queue-enter-active, .queue-leave-active, .queue-move { transition: all 250ms cubic-bezier(0.22, 1, 0.36, 1); }
.queue-enter-from { opacity: 0; transform: translateX(-12px) scale(0.98); }
.queue-enter-to { opacity: 1; transform: translateX(0) scale(1); }
.queue-leave-from { opacity: 1; transform: translateX(0) scale(1); }
.queue-leave-to { opacity: 0; transform: translateX(12px) scale(0.98); }
</style>
