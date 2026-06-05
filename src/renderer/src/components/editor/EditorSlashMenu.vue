<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { SlashCommandItem } from './slash-commands'
import { filterSlashCommands } from './slash-commands'
import type { Editor } from '@tiptap/core'

const props = defineProps<{
  open: boolean
  query: string
  items: SlashCommandItem[]
  editor: Editor | undefined
  range: { from: number; to: number } | null
  anchor: { top: number; left: number } | null
}>()

const emit = defineEmits<{ close: [] }>()

const activeIndex = ref(0)
const filtered = computed(() => filterSlashCommands(props.items, props.query))

watch(
  () => props.query,
  () => {
    activeIndex.value = 0
  }
)

function select(item: SlashCommandItem) {
  const ed = props.editor
  const range = props.range
  if (!ed || !range) return
  ed.chain().focus().deleteRange(range).run()
  item.action(ed)
  emit('close')
}

function onKeydown(e: KeyboardEvent) {
  if (!props.open || !filtered.value.length) return
  if (e.key === 'ArrowDown') {
    e.preventDefault()
    activeIndex.value = (activeIndex.value + 1) % filtered.value.length
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    activeIndex.value = (activeIndex.value - 1 + filtered.value.length) % filtered.value.length
  } else if (e.key === 'Enter') {
    e.preventDefault()
    select(filtered.value[activeIndex.value])
  } else if (e.key === 'Escape') {
    emit('close')
  }
}

defineExpose({ onKeydown })
</script>

<template>
  <div
    v-if="open && anchor && filtered.length"
    class="editor-slash-menu fixed z-50 min-w-[220px] max-h-64 overflow-y-auto bg-base-100 border border-base-300 rounded-box shadow-xl py-1"
    :style="{ top: `${anchor.top}px`, left: `${anchor.left}px` }"
  >
    <button
      v-for="(item, idx) in filtered"
      :key="item.id"
      type="button"
      class="w-full flex items-center gap-3 px-3 py-2 text-left text-sm hover:bg-base-200"
      :class="{ 'bg-base-200': idx === activeIndex }"
      @click="select(item)"
    >
      <span class="w-8 text-center text-base-content/60 font-mono text-xs">{{ item.icon }}</span>
      <span>
        <span class="font-medium">{{ item.label }}</span>
        <span v-if="item.description" class="block text-xs text-base-content/50">{{ item.description }}</span>
      </span>
    </button>
  </div>
</template>
