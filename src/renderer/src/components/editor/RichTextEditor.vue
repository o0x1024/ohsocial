<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import type { Editor } from '@tiptap/core'
import type { DiffLine } from '../../../../shared/text-diff'
import type { EditorComment } from '../../../../shared/types/editor'
import { createEditorExtensions } from './editor-extensions'
import { buildSlashCommands } from './slash-commands'
import { useEditorStats } from './useEditorStats'
import { useEditorOutline } from './useEditorOutline'
import { pickLocalImageDataUrl } from './useEditorImage'
import EditorToolbar from './EditorToolbar.vue'
import EditorBubbleMenu from './EditorBubbleMenu.vue'
import EditorSlashMenu from './EditorSlashMenu.vue'
import EditorOutline from './EditorOutline.vue'
import EditorStatusBar from './EditorStatusBar.vue'
import EditorCommentPanel from './EditorCommentPanel.vue'
import EditorImagePicker from './EditorImagePicker.vue'
import EditorDiffPanel from './EditorDiffPanel.vue'

const props = withDefaults(
  defineProps<{
    modelValue: string
    aiEnabled?: boolean
    diffLines?: DiffLine[]
    comments?: EditorComment[]
    layoutClass?: string
  }>(),
  {
    aiEnabled: false,
    diffLines: () => [],
    comments: () => [],
    layoutClass: ''
  }
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  'update:comments': [EditorComment[]]
  'ai-rewrite': [payload: { text: string; instruction: string }]
}>()

const focusMode = ref(false)
const showDiff = ref(false)
const commentsOpen = ref(false)
const imagePickerOpen = ref(false)

const slashOpen = ref(false)
const slashQuery = ref('')
const slashRange = ref<{ from: number; to: number } | null>(null)
const slashAnchor = ref<{ top: number; left: number } | null>(null)
const slashMenuRef = ref<InstanceType<typeof EditorSlashMenu> | null>(null)

const localComments = ref<EditorComment[]>([...props.comments])

watch(
  () => props.comments,
  c => {
    localComments.value = [...c]
  },
  { deep: true }
)

const slashItems = buildSlashCommands({
  insertImage: () => {
    imagePickerOpen.value = true
  }
})

function updateSlashAnchor(clientRect?: (() => DOMRect | null) | null) {
  const rect = clientRect?.()
  if (rect) {
    slashAnchor.value = { top: rect.bottom + 4, left: rect.left }
  }
}

const editor = useEditor({
  content: props.modelValue || '<p></p>',
  extensions: createEditorExtensions({
    onSlashCommand: ({ range, query, clientRect }) => {
      slashOpen.value = true
      slashQuery.value = query
      slashRange.value = range
      updateSlashAnchor(clientRect)
    },
    onSlashExit: () => {
      slashOpen.value = false
      slashQuery.value = ''
      slashRange.value = null
    }
  }),
  editorProps: {
    attributes: {
      class: 'outline-none min-h-[320px]'
    },
    handleKeyDown: (_view, event) => {
      if (slashOpen.value) {
        slashMenuRef.value?.onKeydown(event)
        if (['ArrowUp', 'ArrowDown', 'Enter'].includes(event.key)) return true
      }
      return false
    },
    handlePaste: (_view, event) => {
      const items = event.clipboardData?.items
      if (!items) return false
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          event.preventDefault()
          const file = item.getAsFile()
          if (file) void insertImageFile(file)
          return true
        }
      }
      return false
    },
    handleDrop: (_view, event) => {
      const files = event.dataTransfer?.files
      if (!files?.length) return false
      const image = Array.from(files).find(f => f.type.startsWith('image/'))
      if (image) {
        event.preventDefault()
        void insertImageFile(image)
        return true
      }
      return false
    }
  },
  onUpdate: ({ editor: e }) => {
    emit('update:modelValue', e.getHTML())
  }
})

const editorRef = shallowRef<Editor | undefined>(undefined)
watch(editor, ed => {
  editorRef.value = ed
})

const modelRef = computed(() => props.modelValue)
const { statsLabel } = useEditorStats(editorRef, modelRef)
const { items: outlineItems, scrollTo } = useEditorOutline(editorRef)

async function insertImageFile(file: File) {
  const reader = new FileReader()
  reader.onload = () => {
    const src = reader.result as string
    editor.value?.chain().focus().setImage({ src }).run()
  }
  reader.readAsDataURL(file)
}

function onImageSelected(src: string) {
  editor.value?.chain().focus().setImage({ src }).run()
  imagePickerOpen.value = false
}

async function insertImageFromToolbar() {
  const src = await pickLocalImageDataUrl()
  if (src) editor.value?.chain().focus().setImage({ src }).run()
  else imagePickerOpen.value = true
}

function getSelectionText(): string {
  const ed = editor.value
  if (!ed) return ''
  const { from, to } = ed.state.selection
  return ed.state.doc.textBetween(from, to, ' ')
}

function onAiRewrite(instruction: string) {
  const text = getSelectionText().trim()
  if (!text) return
  emit('ai-rewrite', { text, instruction })
}

function onAddComment() {
  const ed = editor.value
  const text = getSelectionText().trim()
  if (!ed || !text) {
    alert('请先选中要批注的文字')
    return
  }
  const note = window.prompt('批注内容', '')
  if (!note?.trim()) return
  const id = `c-${Date.now()}`
  ed.chain().focus().setCommentMark(id).run()
  const next: EditorComment[] = [
    ...localComments.value,
    { id, text: note.trim(), quote: text, createdAt: new Date().toISOString() }
  ]
  localComments.value = next
  emit('update:comments', next)
  commentsOpen.value = true
}

function removeComment(id: string) {
  const next = localComments.value.filter(c => c.id !== id)
  localComments.value = next
  emit('update:comments', next)
}

function highlightComment(c: EditorComment) {
  const ed = editor.value
  if (!ed) return
  const docText = ed.state.doc.textContent
  const idx = docText.indexOf(c.quote)
  if (idx >= 0) {
    ed.chain().focus().setTextSelection({ from: idx + 1, to: idx + c.quote.length + 1 }).run()
  }
}

watch(
  () => props.modelValue,
  val => {
    if (editor.value && val !== editor.value.getHTML()) {
      editor.value.commands.setContent(val || '<p></p>', false)
    }
  }
)

onBeforeUnmount(() => editor.value?.destroy())
</script>

<template>
  <div
    class="editor-shell border border-base-300 rounded-box bg-base-100 overflow-hidden flex flex-col"
    :class="layoutClass"
  >
    <EditorToolbar v-if="editor" :editor="editor">
      <slot name="toolbar-extra" />
      <button type="button" class="btn btn-xs" title="插入图片" @click="insertImageFromToolbar">🖼</button>
    </EditorToolbar>

    <div class="flex flex-1 min-h-0">
      <EditorOutline :items="outlineItems" @scroll="scrollTo" />

      <div class="flex-1 flex flex-col min-w-0">
        <div
          class="tiptap-editor flex-1 overflow-y-auto"
          :class="{ 'editor-focus-mode': focusMode }"
        >
          <EditorBubbleMenu
            v-if="editor"
            :editor="editor"
            :ai-enabled="aiEnabled"
            @ai-rewrite="onAiRewrite"
            @add-comment="onAddComment"
          />
          <EditorContent :editor="editor" />
        </div>

        <EditorDiffPanel
          :lines="diffLines"
          :open="showDiff"
          @update:open="showDiff = $event"
        />

        <EditorStatusBar
          :stats-label="statsLabel"
          :focus-mode="focusMode"
          :show-diff="showDiff"
          :comment-count="localComments.length"
          @update:focus-mode="focusMode = $event"
          @update:show-diff="showDiff = $event"
          @toggle-comments="commentsOpen = !commentsOpen"
        />
      </div>

      <EditorCommentPanel
        :comments="localComments"
        :open="commentsOpen"
        @update:open="commentsOpen = $event"
        @remove="removeComment"
        @highlight="highlightComment"
      />
    </div>

    <EditorSlashMenu
      ref="slashMenuRef"
      :open="slashOpen"
      :query="slashQuery"
      :items="slashItems"
      :editor="editor"
      :range="slashRange"
      :anchor="slashAnchor"
      @close="slashOpen = false"
    />

    <EditorImagePicker
      v-if="imagePickerOpen"
      @select="onImageSelected"
      @close="imagePickerOpen = false"
    />
  </div>
</template>

<style>
@import './editor-styles.css';
</style>
