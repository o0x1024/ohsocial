<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const editor = useEditor({
  content: props.modelValue || '<p></p>',
  extensions: [StarterKit],
  editorProps: {
    attributes: {
      class: 'outline-none min-h-[320px]'
    }
  },
  onUpdate: ({ editor: e }) => {
    emit('update:modelValue', e.getHTML())
  }
})

watch(
  () => props.modelValue,
  (val) => {
    if (editor.value && val !== editor.value.getHTML()) {
      editor.value.commands.setContent(val || '<p></p>', false)
    }
  }
)

onBeforeUnmount(() => editor.value?.destroy())
</script>

<template>
  <div class="border border-base-300 rounded-box bg-base-100 overflow-hidden">
    <div v-if="editor" class="flex flex-wrap gap-1 p-2 border-b border-base-300 bg-base-200">
      <button type="button" class="btn btn-xs" :class="{ 'btn-active': editor.isActive('bold') }" @click="editor.chain().focus().toggleBold().run()">B</button>
      <button type="button" class="btn btn-xs" :class="{ 'btn-active': editor.isActive('italic') }" @click="editor.chain().focus().toggleItalic().run()"><em>I</em></button>
      <button type="button" class="btn btn-xs" :class="{ 'btn-active': editor.isActive('heading', { level: 2 }) }" @click="editor.chain().focus().toggleHeading({ level: 2 }).run()">H2</button>
      <button type="button" class="btn btn-xs" :class="{ 'btn-active': editor.isActive('bulletList') }" @click="editor.chain().focus().toggleBulletList().run()">列表</button>
      <button type="button" class="btn btn-xs" :class="{ 'btn-active': editor.isActive('blockquote') }" @click="editor.chain().focus().toggleBlockquote().run()">引用</button>
    </div>
    <div class="tiptap-editor">
      <EditorContent :editor="editor" />
    </div>
  </div>
</template>

<style>
.ProseMirror p.is-editor-empty:first-child::before {
  content: '开始写作…';
  color: oklch(var(--bc) / 0.4);
  float: left;
  height: 0;
  pointer-events: none;
}
</style>
