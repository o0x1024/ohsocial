<script setup lang="ts">
import type { EditorComment } from '../../../../shared/types/editor'

defineProps<{
  comments: EditorComment[]
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [boolean]
  remove: [id: string]
  highlight: [comment: EditorComment]
}>()
</script>

<template>
  <aside
    v-if="open"
    class="editor-comments shrink-0 w-56 border-l border-base-300 bg-base-200/50 flex flex-col max-h-full"
  >
    <div class="flex items-center justify-between px-3 py-2 border-b border-base-300">
      <span class="text-xs font-semibold text-base-content/70">批注</span>
      <button type="button" class="btn btn-xs btn-ghost" @click="emit('update:open', false)">×</button>
    </div>
    <div v-if="!comments.length" class="p-4 text-xs text-base-content/50 text-center">
      选中文字后点击「批注」添加
    </div>
    <ul v-else class="flex-1 overflow-y-auto p-2 space-y-2">
      <li
        v-for="c in comments"
        :key="c.id"
        class="p-2 bg-base-100 rounded-box border border-base-300 text-xs cursor-pointer hover:border-primary/40"
        @click="emit('highlight', c)"
      >
        <p class="text-base-content/50 line-clamp-2 mb-1 italic">「{{ c.quote }}」</p>
        <p class="text-base-content">{{ c.text }}</p>
        <button
          type="button"
          class="btn btn-ghost btn-xs mt-1 text-error"
          @click.stop="emit('remove', c.id)"
        >
          删除
        </button>
      </li>
    </ul>
  </aside>
</template>
