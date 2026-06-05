<script setup lang="ts">
import type { OutlineItem } from './useEditorOutline'

defineProps<{
  items: OutlineItem[]
  collapsed?: boolean
}>()

const emit = defineEmits<{ scroll: [pos: number]; 'update:collapsed': [boolean] }>()
</script>

<template>
  <aside
    v-if="items.length"
    class="editor-outline shrink-0 w-48 border-r border-base-300 bg-base-200/50 overflow-y-auto hidden lg:block"
  >
    <div class="flex items-center justify-between px-3 py-2 border-b border-base-300">
      <span class="text-xs font-semibold text-base-content/70">大纲</span>
      <span class="text-xs text-base-content/40">{{ items.length }}</span>
    </div>
    <nav class="p-2 space-y-0.5">
      <button
        v-for="item in items"
        :key="item.id"
        type="button"
        class="w-full text-left text-xs py-1.5 px-2 rounded hover:bg-base-300 truncate text-base-content/80"
        :class="item.level === 3 ? 'pl-4' : ''"
        :title="item.text"
        @click="emit('scroll', item.pos)"
      >
        {{ item.text }}
      </button>
    </nav>
  </aside>
</template>
