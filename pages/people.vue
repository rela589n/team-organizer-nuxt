<script setup lang="ts">
import { nextTick } from 'vue'
import { usePeople } from '~/composables/usePeople'
import { useI18n } from '~/composables/useI18n'

const { t: tt } = useI18n()
useHead({ title: `${tt('nav_people')} — ${tt('app_title')}` })

// People state and actions from composable
const { people, count: peopleCount, add, update, remove } = usePeople()

function addPerson() {
  // Create a new person with a default name, then focus it for inline edit
  const id = add()
  nextTick(() => {
    const el = document.querySelector<HTMLInputElement>(`input[data-person-id="${id}"]`)
    el?.focus()
    el?.select()
  })
}

function updatePerson(id: string, name: string) {
  update(id, name)
}

function removePerson(id: string) {
  const list = people.value
  const person = Array.isArray(list) ? list.find(p => p.id === id) : undefined
  const label = person && person.name ? ` "${person.name}"` : ''
  const ok = confirm(tt('people_remove_confirm', { label }))
  if (ok) {
    remove(id)
  }
}
</script>

<template>
  <section class="space-y-6">
    <div class="flex items-end justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold">{{ tt('people_title') }}</h1>
        <p class="text-gray-600">{{ tt('people_desc') }}</p>
      </div>
      <div class="text-sm text-gray-600">{{ tt('people_total') }}: <span class="font-medium text-gray-900">{{ peopleCount }}</span></div>
    </div>

    <PeopleList
      :people="people"
      @update="updatePerson"
      @remove="removePerson"
    />

    <div class="flex items-center justify-between gap-4 mt-4">
      <button @click="addPerson" class="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">{{ tt('people_add') }}</button>
    </div>
  </section>
</template>
