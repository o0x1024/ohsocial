<script setup lang="ts">
import { BubbleMenu } from '@tiptap/vue-3'
import type { Editor } from '@tiptap/core'

const props = defineProps<{
  editor: Editor
  aiEnabled?: boolean
}>()

const emit = defineEmits<{
  'ai-rewrite': [instruction: string]
  'add-comment': []
}>()

const rewriteOptions = [
  { label: '换个说法', instruction: '换个说法，保持原意' },
  { label: '更口语', instruction: '改写得更口语化、更亲切' },
  { label: '更正式', instruction: '改写得更正式、更专业' },
  { label: '精简', instruction: '精简文字，去掉冗余' },
  { label: '扩写', instruction: '适当扩写，补充细节和例子' }
]

function rewrite(instruction: string) {
  emit('ai-rewrite', instruction)
}
</script>

<template>
  <BubbleMenu
    :editor="editor"
    :tippy-options="{ duration: 100, placement: 'top' }"
    class="editor-bubble-menu flex flex-wrap items-center gap-1 p-1.5 bg-base-100 border border-base-300 rounded-box shadow-lg"
  >
    <button
      type="button"
      class="btn btn-xs"
      :class="{ 'btn-active': editor.isActive('bold') }"
      @click="editor.chain().focus().toggleBold().run()"
    >
      B
    </button>
    <button
      type="button"
      class="btn btn-xs"
      :class="{ 'btn-active': editor.isActive('italic') }"
      @click="editor.chain().focus().toggleItalic().run()"
    >
      <em>I</em>
    </button>
    <button
      type="button"
      class="btn btn-xs"
      :class="{ 'btn-active': editor.isActive('highlight') }"
      @click="editor.chain().focus().toggleHighlight().run()"
    >
      H
    </button>
    <span class="w-px h-4 bg-base-300 mx-0.5" />
    <button type="button" class="btn btn-xs" @click="emit('add-comment')">批注</button>
    <template v-if="aiEnabled">
      <span class="w-px h-4 bg-base-300 mx-0.5" />
      <div class="dropdown dropdown-end">
        <button type="button" class="btn btn-xs btn-primary" tabindex="0">AI 改写</button>
        <ul tabindex="0" class="dropdown-content menu menu-sm bg-base-100 border border-base-300 rounded-box shadow-lg z-50 w-36 p-1">
          <li v-for="opt in rewriteOptions" :key="opt.label">
            <button type="button" @click="rewrite(opt.instruction)">{{ opt.label }}</button>
          </li>
        </ul>
      </div>
    </template>
  </BubbleMenu>
</template>
