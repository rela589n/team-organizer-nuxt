<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { usePeople, type Person } from '~/composables/usePeople'

useHead({ title: 'People — Team Organizer' })

// People state and actions from composable
const { people, count: peopleCount, add, update, remove } = usePeople()

// Local UI state for form and editing
const form = reactive<{ name: string }>({ name: '' })
const editingId = ref<string | null>(null)
const error = ref<string | null>(null)
const isEditing = computed(() => editingId.value !== null)

function resetForm() {
  form.name = ''
  editingId.value = null
  error.value = null
}

function validate(): boolean {
  if (!form.name.trim()) {
    error.value = 'Name is required.'
    return false
  }
  error.value = null
  return true
}

function handleSubmit() {
  if (!validate()) return
  if (isEditing.value && editingId.value) {
    update(editingId.value, form.name)
  } else {
    add(form.name)
  }
  resetForm()
}

function startEdit(p: Person) {
  editingId.value = p.id
  form.name = p.name
}

function removePerson(id: string) {
  remove(id)
  if (editingId.value === id) {
    resetForm()
  }
}
</script>

<template>
  <section class="space-y-6">
    <div class="flex items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold">People</h1>
        <p class="text-gray-600">Add people you want to organize into teams.</p>
      </div>
      <div class="text-sm text-gray-600">Total: <span class="font-medium text-gray-900">{{ peopleCount }}</span></div>
    </div>

    <PeopleForm
      :mode="isEditing ? 'edit' : 'add'"
      :name="form.name"
      :error="error"
      @update:name="val => (form.name = val)"
      @submit="handleSubmit"
    />

    <PeopleList
      :people="people"
      @edit="startEdit"
      @remove="removePerson"
    />
  </section>
</template>
