import { ref, computed, onMounted, watch } from 'vue'
import { newId } from '~/utils/id'
import { loadState, saveState } from '~/utils/storage'

export interface Person {
  id: string
  name: string
  power: number
}

const STORAGE_KEY = 'team-organizer:people'

// Single shared state instance for the app (Nuxt auto-imported composables are singletons by default)
const people = ref<Person[]>([])

/** Normalize unknown input into a well-formed Person. */
function normalizePerson(input: any): Person {
  return {
    id: String(input?.id ?? newId()),
    name: String(input?.name ?? ''),
    power: Number.isFinite(Number(input?.power)) ? Math.max(1, Math.floor(Number(input.power))) : 1,
  }
}

export function usePeople() {
  // Load on client
  onMounted(() => {
    const loaded = loadState<any[]>(STORAGE_KEY, [], 'people')
    if (Array.isArray(loaded)) {
      // Be tolerant of legacy records that might contain extra fields
      people.value = loaded.map(normalizePerson)
    }
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
    const p = Number.isFinite(Number(power)) ? Math.max(1, Math.floor(Number(power))) : 1
    people.value.push({ id, name: finalName, power: p })
    return id
  }

  function update(id: string, name: string, power?: number) {
    const idx = people.value.findIndex(p => p.id === id)
    if (idx !== -1) {
      const prev = people.value[idx]
      const p = (power === undefined) ? prev.power : (Number.isFinite(Number(power)) ? Math.max(1, Math.floor(Number(power))) : 1)
      people.value[idx] = { id, name, power: p }
    }
  }

  function remove(id: string) {
    people.value = people.value.filter(p => p.id !== id)
  }

  return { people, count, add, update, remove }
}
