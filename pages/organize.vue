<script setup lang="ts">
import { computed, onMounted, ref, watch, nextTick } from 'vue'
import { usePeople, type Person } from '~/composables/usePeople'
import { useTeams, type Team } from '~/composables/useTeams'
import { colorTint } from '~/utils/colors'
import { useConfetti } from '~/composables/useConfetti'

useHead({ title: 'Organize — Team Organizer' })

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
function setDropArea(teamId: string, el: HTMLElement | null) {
  if (el) dropAreas.set(teamId, el)
  else dropAreas.delete(teamId)
}

// Track last known center of the staging avatar to start confetti there
const lastStageOrigin = ref<{ x: number, y: number } | null>(null)
async function updateStageOrigin() {
  await nextTick()
  const el = stagingEl.value
  if (!el) return
  const r = el.getBoundingClientRect()
  lastStageOrigin.value = { x: r.left + r.width / 2, y: r.top + r.height / 2 }
}

// Derived helpers
const teamsMap = computed<Record<string, Team>>(() => Object.fromEntries(teams.value.map(t => [t.id, t])))

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

const balancedTarget = computed(() => {
  const t = teams.value.length
  const p = people.value.length
  const res: Record<string, number> = {}
  if (t === 0) return res
  const base = Math.floor(p / t)
  const remainder = p % t
  teams.value.forEach((team, idx) => {
    res[team.id] = base + (idx < remainder ? 1 : 0)
  })
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
        const originEl = stagingEl.value
        const rect = originEl?.getBoundingClientRect()
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
  const target = balancedTarget.value
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

  // Build a list of teamIds repeated by their target counts, then shuffle.
  const assignmentPool: string[] = []
  for (const t of teams.value) {
    const c = target[t.id] ?? 0
    for (let i = 0; i < c; i++) assignmentPool.push(t.id)
  }
  shuffle(assignmentPool)

  // Randomize people order
  const persons = shuffle([...people.value])

  // Pair each person with the next teamId from assignmentPool
  for (let i = 0; i < persons.length; i++) {
    const teamId = assignmentPool[i % assignmentPool.length] || teams.value[i % teams.value.length]?.id
    queue.value.push({ person: persons[i], teamId })
  }
}

// colorTint moved to utils/colors for reuse across app

// Perform a visual fly animation of the center logo to the team's drop area,
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
      const fromRect = fromEl.getBoundingClientRect()
      const toRect = toEl.getBoundingClientRect()

      // Clone the whole staging block so avatar + name move together
      const clone = fromEl.cloneNode(true) as HTMLElement
      // Hide original during motion
      const prevVisibility = fromEl.style.visibility
      fromEl.style.visibility = 'hidden'

      // Helper to compute page-relative target top-left so the clone's center aligns with drop area's center
      const halfW = fromRect.width / 2
      const halfH = fromRect.height / 2
      const computeTarget = () => {
        const r = toEl.getBoundingClientRect()
        return {
          left: (r.left + window.scrollX + r.width / 2) - halfW,
          top: (r.top + window.scrollY + r.height / 2) - halfH,
        }
      }

      // Place the clone at the exact source position (page coords), initial scale 1
      // Create a wrapper to animate (position/scale) and let the clone fill it
      const wrapper = document.createElement('div')
      Object.assign(wrapper.style, {
        position: 'absolute',
        left: `${fromRect.left + window.scrollX}px`,
        top: `${fromRect.top + window.scrollY}px`,
        width: `${fromRect.width}px`,
        height: `${fromRect.height}px`,
        zIndex: '9999',
        pointerEvents: 'none',
        transformOrigin: 'center center',
        transform: 'scale(1) translateZ(0)',
        willChange: 'left, top, transform',
        transition: `left ${moveDuration}ms cubic-bezier(0.22, 1, 0.36, 1), top ${moveDuration}ms cubic-bezier(0.22, 1, 0.36, 1), transform ${moveDuration}ms cubic-bezier(0.22, 1, 0.36, 1)`,
      } as CSSStyleDeclaration)

      // Make the clone fill the wrapper
      Object.assign(clone.style, {
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      } as CSSStyleDeclaration)

      wrapper.appendChild(clone)
      document.body.appendChild(wrapper)

      // Initial target
      let tgt = computeTarget()
      const targetScale = 0.7

      // Ensure the browser has applied initial styles before starting transition
      requestAnimationFrame(() => {
        // Small second RAF to be extra safe across browsers
        requestAnimationFrame(() => {
          wrapper.style.left = `${tgt.left}px`
          wrapper.style.top = `${tgt.top}px`
          wrapper.style.transform = `scale(${targetScale}) translateZ(0)`
        })
      })

      // While animating, keep the destination in sync every frame (robust to layout changes)
      let active = true
      const sync = () => {
        if (!active) return
        tgt = computeTarget()
        wrapper.style.left = `${tgt.left}px`
        wrapper.style.top = `${tgt.top}px`
        requestAnimationFrame(sync)
      }
      requestAnimationFrame(sync)

      const cleanup = () => {
        active = false
        wrapper.remove()
        fromEl.style.visibility = prevVisibility || ''
        finish()
      }

      window.setTimeout(cleanup, moveDuration)
    } catch (e) {
      console.warn('Animation failed, applying instantly', e)
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
</script>

<template>
  <section class="space-y-6 pb-24">
    <div class="flex items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold">Organize</h1>
        <p class="text-gray-600">Evenly organize people into teams.</p>
      </div>
      <div class="text-sm text-gray-600">
        People: <span class="font-medium text-gray-900">{{ people.length }}</span>
        <span class="mx-2">•</span>
        Teams: <span class="font-medium text-gray-900">{{ teams.length }}</span>
      </div>
    </div>


    <!-- 3x3 grid with center staging and teams around it -->
    <div class="grid grid-cols-3 grid-rows-3 gap-4 min-h-[70vh] overflow-visible mt-4">
      <!-- top-left, top, top-right, middle-left, middle-right, bottom-left, bottom, bottom-right are for teams -->

      <!-- center staging area at row 2 / col 2 -->
      <div class="flex items-center justify-center" style="grid-column: 2; grid-row: 2;">
        <div class="text-center">
          <div v-if="stagedIdx !== null && queue[stagedIdx]" class="flex flex-col items-center">
            <div ref="stagingEl" class="flex flex-col items-center" :class="{ 'staging-appear': appearing }">
              <div ref="stagingAvatarEl" class="mb-3 inline-flex h-28 w-28 items-center justify-center rounded-full bg-gray-200 text-4xl text-gray-600"
                   :class="{ 'animate-pulse': running }">?</div>
              <div class="text-xl font-semibold text-gray-900">{{ queue[stagedIdx!].person.name }}</div>
            </div>
          </div>
          <div v-else-if="!running && currentIdx < 0" class="text-gray-500 text-sm">{{ canStart ? 'Press Start to begin' : 'Add people and teams first' }}</div>
        </div>
      </div>

      <!-- teams placed clockwise around the center; first 8 teams only -->
      <template v-for="(t, idx) in teams.slice(0, 8)" :key="t.id">
        <div
          class="rounded-xl border overflow-hidden transition-all"
          :style="(() => { const pos = aroundPositions[idx] || { r: 1, c: 2 }; return { gridColumn: String(pos.c), gridRow: String(pos.r), borderColor: t.color, boxShadow: (highlightTeamId === t.id) ? `0 0 0 4px ${t.color}` : undefined } })()"
        >
          <div class="flex items-center justify-between gap-3 p-4" :style="{ backgroundColor: t.color, color: '#fff' }">
            <h2 class="font-semibold truncate">{{ t.name }}</h2>
            <div class="text-xs opacity-80">{{ (t.members?.length ?? 0) }} member(s)</div>
          </div>
          <div class="p-4" :style="{ backgroundColor: colorTint(t.color, 0.12) }">
            <div v-if="(t.members?.length ?? 0) === 0" class="text-sm text-gray-600">Awaiting members…</div>
            <ul :ref="(el) => setDropArea(t.id, el)" class="flex flex-col gap-2 min-h-[8rem]">
              <li v-for="pid in (t.members || [])" :key="pid" class="flex items-center gap-3 rounded-md border bg-white/70 px-3 py-2">
                <span class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-sm text-gray-600">?</span>
                <span class="text-sm">{{ (people.find(p => p.id === pid) as any)?.name || 'Unknown' }}</span>
              </li>
            </ul>
          </div>
        </div>
      </template>
    </div>

    <!-- Overflow teams beyond 8 are shown below -->
    <div v-if="teams.length > 8" class="grid grid-cols-1 gap-4 sm:grid-cols-2 mt-6">
      <div
        v-for="t in teams.slice(8)"
        :key="t.id"
        class="rounded-xl border overflow-hidden transition-all"
        :style="{ borderColor: t.color, boxShadow: (highlightTeamId === t.id) ? `0 0 0 4px ${t.color}` : undefined }"
      >
        <div class="flex items-center justify-between gap-3 p-4" :style="{ backgroundColor: t.color, color: '#fff' }">
          <h2 class="font-semibold truncate">{{ t.name }}</h2>
          <div class="text-xs opacity-80">{{ (t.members?.length ?? 0) }} member(s)</div>
        </div>
        <div class="p-4" :style="{ backgroundColor: colorTint(t.color, 0.12) }">
          <div v-if="(t.members?.length ?? 0) === 0" class="text-sm text-gray-600">Awaiting members…</div>
          <ul :ref="(el) => setDropArea(t.id, el)" class="flex flex-col gap-2 min-h-[8rem]">
            <li v-for="pid in (t.members || [])" :key="pid" class="flex items-center gap-3 rounded-md border bg-white/70 px-3 py-2">
              <span class="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gray-200 text-sm text-gray-600">?</span>
              <span class="text-sm">{{ (people.find(p => p.id === pid) as any)?.name || 'Unknown' }}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <div class="fixed inset-x-0 bottom-0 z-50 border-t bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div class="mx-auto max-w-5xl px-4 py-2">
        <div class="flex flex-wrap items-center gap-3">
          <button @click="start" :disabled="!canStart || inProgress" class="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50" title="Start is disabled while organizing is in progress">Start</button>
          <button v-if="running" @click="pause" class="rounded-md bg-gray-200 px-4 py-2 text-gray-800 hover:bg-gray-300">Pause</button>
          <button v-else @click="resume" :disabled="finished || !canStart" class="rounded-md bg-gray-200 px-4 py-2 text-gray-800 hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-50">Resume</button>
          <button @click="resetAll" class="rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-800 hover:bg-gray-50">Reset</button>
          <div class="flex items-center gap-2">
            <label for="speed" class="text-sm text-gray-700">Speed</label>
            <input id="speed" type="range" min="0.5" max="2" step="0.1" v-model.number="speed" class="h-2 w-40 accent-indigo-600" />
            <span class="text-xs text-gray-600 tabular-nums">{{ speedText }}</span>
          </div>
          <button @click="next" :disabled="finished || !canStart" class="rounded-md bg-emerald-600 px-3 py-2 text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50">Next</button>
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
