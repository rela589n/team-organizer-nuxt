import { ref, computed, onMounted, watch } from 'vue'
import { newId } from '~/utils/id'

export interface Person {
  id: string
  name: string
}

const STORAGE_KEY = 'team-organizer:people'

// Single shared state instance for the app (Nuxt auto-imported composables are singletons by default)
const people = ref<Person[]>([])

export function usePeople() {
  // Load on client
  onMounted(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (Array.isArray(parsed)) {
          // Be tolerant of legacy records that might contain extra fields
          people.value = parsed.map((p: any) => ({ id: String(p.id), name: String(p.name || '') }))
        }
      }
    } catch (_) {
      // ignore parse errors
    }
  })

  // Persist whenever list changes
  watch(people, (val) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(val))
    } catch (_) {
      // ignore storage errors
    }
  }, { deep: true })

  const count = computed(() => people.value.length)

  function add(name: string) {
    people.value.push({ id: newId(), name: name.trim() })
  }

  function update(id: string, name: string) {
    const idx = people.value.findIndex(p => p.id === id)
    if (idx !== -1) {
      people.value[idx] = { id, name: name.trim() }
    }
  }

  function remove(id: string) {
    people.value = people.value.filter(p => p.id !== id)
  }

  return { people, count, add, update, remove }
}
