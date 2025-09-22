import { ref, computed, onMounted, watch } from 'vue'
import { newId } from '~/utils/id'
import { loadState, saveState } from '~/utils/storage'
import { useTeams } from '~/composables/useTeams'

export interface Person {
  id: string
  name: string
  power: number
}

const STORAGE_KEY = 'team-organizer:people'

// Single shared state instance for the app (Nuxt auto-imported composables are singletons by default)
const people = ref<Person[]>([])

/** Normalize unknown input into a well-formed Person. */
function normalizePerson(input: unknown): Person {
  const obj = (input ?? {}) as Record<string, unknown>
  const id = typeof obj.id === 'string' && obj.id !== '' ? obj.id : newId()
  const name = typeof obj.name === 'string' ? obj.name : ''
  const power = typeof obj.power === 'number' && Number.isFinite(obj.power) ? Math.max(1, Math.floor(obj.power)) : 1
  return { id, name, power }
}

export function usePeople() {
  // Load on client
  onMounted(() => {
    const loaded = loadState<unknown[]>(STORAGE_KEY, [], 'people')
    // Be tolerant of legacy records that might contain extra fields
    people.value = loaded.map(normalizePerson)
  })

  // Persist whenever list changes
  watch(people, (val) => {
    saveState(STORAGE_KEY, val)
  }, { deep: true })

  const count = computed(() => people.value.length)

  function nextDefaultName() {
    return `Person #${people.value.length + 1}`
  }

  function add(name?: string, power: number = 1) {
    const provided = name ?? ''
    const finalName = provided === '' ? nextDefaultName() : provided
    const id = newId()
    const p = Number.isFinite(power) ? Math.max(1, Math.floor(power)) : 1
    people.value.push({ id, name: finalName, power: p })
    return id
  }

  function update(id: string, name: string, power?: number) {
    const idx = people.value.findIndex(p => p.id === id)
    if (idx !== -1) {
      const prev = people.value[idx]
      const p = (power === undefined) ? prev.power : (Number.isFinite(power) ? Math.max(1, Math.floor(power)) : 1)
      people.value[idx] = { id, name, power: p }
    }
  }

  function remove(id: string) {
    // Remove references from all teams first to keep invariants
    const { removeMemberEverywhere } = useTeams()
    removeMemberEverywhere(id)
    // Then remove the person from the people list
    people.value = people.value.filter(p => p.id !== id)
  }

  return { people, count, add, update, remove }
}
