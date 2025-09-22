# Sample Refactor: SpeedControl extraction

This demonstrates extracting a small, reusable, strongly-typed UI component from a large page (organize.vue) without changing behavior or design.

## Before

Inline markup in `pages/organize.vue`:

```vue
<div class="flex items-center gap-2">
  <label for="speed" class="text-sm text-gray-700">{{ tt('organize_speed') }}</label>
  <input id="speed" type="range" min="0.5" max="2" step="0.1" v-model.number="speed" class="h-2 w-40 accent-indigo-600" />
  <span class="text-xs text-gray-600 tabular-nums">{{ speedText }}</span>
</div>
```

## After

A reusable component at `components/common/SpeedControl.vue`:

```vue
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
const emit = defineEmits<{ (e: 'update:modelValue', value: number): void }>()
function onInput(e: Event) {
  const el = e.target as HTMLInputElement
  const n = Math.min(props.max, Math.max(props.min, Number(el.value)))
  emit('update:modelValue', n)
}
</script>
<template>
  <div class="flex items-center gap-2">
    <label v-if="label" class="text-sm text-gray-700">{{ label }}</label>
    <input type="range" :min="min" :max="max" :step="step" :value="modelValue" @input="onInput" class="h-2 w-40 accent-indigo-600" />
    <span v-if="valueText" class="text-xs text-gray-600 tabular-nums">{{ valueText }}</span>
  </div>
</template>
```

And `pages/organize.vue` now uses:

```vue
<SpeedControl v-model="speed" :label="tt('organize_speed')" :valueText="speedText" />
```

## Benefits
- Improves readability of `organize.vue` by removing inline detail.
- Encourages reuse across pages where speed or range input is needed.
- Strongly-typed props and emits; clamped values prevent out-of-range state.
- No visual or behavioral change.

## Next Candidates
- TeamCard (encapsulate header, power sum, member list, drag targets)
- QueueDisplay (staging area + upcoming items)
- PersonChip (avatar + name with consistent styles)
