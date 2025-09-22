import { ref, computed, onMounted, watch } from 'vue'
import { newId } from '~/utils/id'
import { loadState, saveState } from '~/utils/storage'
import { TEAM_COLORS } from '~/utils/colors'

export interface Team {
  id: string
  name: string
  color: string
  members?: string[] // person ids
}

const STORAGE_KEY = 'team-organizer:teams'

const teams = ref<Team[]>([])

/** Normalize an unknown input to a Team, preserving empty color but defaulting
 * null/undefined color to a round-robin color by index for initial data. */
function normalizeTeam(input: any, idx: number): Team {
  const id = String(input?.id ?? newId())
  const name = String(input?.name ?? `Team #${idx + 1}`)
  const color = (input?.color === undefined || input?.color === null)
    ? TEAM_COLORS[idx % TEAM_COLORS.length]
    : String(input.color)
  const members = Array.isArray(input?.members) ? input.members.map(String) : []
  return { id, name, color, members }
}

export function useTeams() {
  // Load teams from localStorage on client
  onMounted(() => {
    const loaded = loadState<any[]>(STORAGE_KEY, [], 'teams')
    if (Array.isArray(loaded)) {
      teams.value = loaded.map((t, idx) => normalizeTeam(t, idx))
    }
  })

  // Persist teams to localStorage whenever they change
  watch(teams, (val) => {
    saveState(STORAGE_KEY, val)
  }, { deep: true })

  const count = computed(() => teams.value.length)

  /** Next default name in the UI, 1-based. */
  function nextDefaultName() {
    return `Team #${teams.value.length + 1}`
  }

  /** Whether a color is taken by another team (optionally excluding a given id). */
  function colorInUse(color: string, excludeId?: string) {
    return teams.value.some(t => t.id !== excludeId && t.color === color)
  }

  /** Choose the first available color; fall back to empty if all are taken. */
  function nextDefaultColor(excludeId?: string) {
    const available = TEAM_COLORS.find(c => !colorInUse(c, excludeId))
    return available ?? ''
  }

  /** Add a team with optional name and color, applying sensible defaults. */
  function add(name?: string, color?: string) {
    const provided = name ?? ''
    const finalName = provided === '' ? nextDefaultName() : provided
    const t: Team = {
      id: newId(),
      name: finalName,
      color: color ?? nextDefaultColor(),
      members: [],
    }
    teams.value.push(t)
    return t.id
  }

  /** Update team fields with validation (e.g., color uniqueness). */
  function update(id: string, patch: Partial<Pick<Team, 'name' | 'color' | 'members'>>) {
    const idx = teams.value.findIndex(t => t.id === id)
    if (idx !== -1) {
      const current = teams.value[idx]
      const next: Team = {
        ...current,
        ...patch,
        name: patch.name !== undefined ? patch.name : current.name,
        members: patch.members !== undefined ? [...patch.members] : current.members ?? [],
      }
      if (patch.color !== undefined) {
        const desired = patch.color
        if (desired === '' || !colorInUse(desired, id)) {
          next.color = desired
        } else {
          console.warn(`Color ${desired} is already in use by another team. Ignoring color change.`)
          next.color = current.color
        }
      }
      teams.value[idx] = next
    }
  }

  function remove(id: string) {
    teams.value = teams.value.filter(t => t.id !== id)
  }

  /** Convenience: reset members for all teams. */
  function clearAllMembers() {
    teams.value = teams.value.map(t => ({ ...t, members: [] }))
  }

  /** Remove a member id from all teams' member lists. */
  function removeMemberEverywhere(personId: string) {
    let changed = false
    teams.value = teams.value.map(t => {
      const members = Array.isArray(t.members) ? t.members : []
      if (members.includes(personId)) {
        changed = true
        return { ...t, members: members.filter(id => id !== personId) }
      }
      return t
    })
    return changed
  }

  return { teams, count, add, update, remove, clearAllMembers, removeMemberEverywhere, TEAM_COLORS }
}
