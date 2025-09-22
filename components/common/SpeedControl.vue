<script setup lang="ts">
const props = withDefaults(defineProps<{
  modelValue: number
  label?: string
  min?: number
  max?: number
  step?: number
  valueText?: string
}>(), {
  min: 0.5,
  max: 2,
  step: 0.1,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: number): void
}>()

function onInput(e: Event) {
  const el = e.target as HTMLInputElement
  const n = Math.min(props.max, Math.max(props.min, Number(el.value)))
  emit('update:modelValue', n)
}
</script>

<template>
  <div class="flex items-center gap-2">
    <label v-if="label" class="text-sm text-gray-700">{{ label }}</label>
    <input
      type="range"
      :min="min"
      :max="max"
      :step="step"
      :value="modelValue"
      @input="onInput"
      class="h-2 w-40 accent-indigo-600"
    />
    <span v-if="valueText" class="text-xs text-gray-600 tabular-nums">{{ valueText }}</span>
  </div>
</template>
