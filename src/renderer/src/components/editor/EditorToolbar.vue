<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import type { Editor } from '@tiptap/core'
import { copyEditorContent } from './editor-clipboard'
import { shortcut } from './editor-shortcuts'

defineProps<{ editor: Editor }>()

const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899']
const copyDone = ref(false)
let copyTimer: ReturnType<typeof setTimeout> | null = null

async function copyContent(editor: Editor) {
  const ok = await copyEditorContent(editor)
  if (!ok) {
    alert('复制失败')
    return
  }
  copyDone.value = true
  if (copyTimer) clearTimeout(copyTimer)
  copyTimer = setTimeout(() => {
    copyDone.value = false
    copyTimer = null
  }, 1200)
}

onBeforeUnmount(() => {
  if (copyTimer) clearTimeout(copyTimer)
})

function setLink(editor: Editor) {
  const prev = editor.getAttributes('link').href as string | undefined
  const url = window.prompt('链接地址', prev ?? 'https://')
  if (url === null) return
  if (url === '') {
    editor.chain().focus().extendMarkRange('link').unsetLink().run()
    return
  }
  editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-1 p-2 border-b border-base-300 bg-base-200">
    <button
      type="button"
      class="btn btn-xs"
      :class="{ 'btn-active': editor.can().undo() }"
      :disabled="!editor.can().undo()"
      :title="`撤销 ${shortcut('Mod+Z')}`"
      @click="editor.chain().focus().undo().run()"
    >
      ↶
    </button>
    <button
      type="button"
      class="btn btn-xs"
      :class="{ 'btn-active': editor.can().redo() }"
      :disabled="!editor.can().redo()"
      :title="`重做 ${shortcut('Mod+Shift+Z')}`"
      @click="editor.chain().focus().redo().run()"
    >
      ↷
    </button>
    <span class="w-px h-4 bg-base-300 mx-1" />

    <button
      type="button"
      class="btn btn-xs"
      :class="{ 'btn-active': editor.isActive('bold') }"
      :title="`加粗 ${shortcut('Mod+B')}`"
      @click="editor.chain().focus().toggleBold().run()"
    >
      B
    </button>
    <button
      type="button"
      class="btn btn-xs"
      :class="{ 'btn-active': editor.isActive('italic') }"
      :title="`斜体 ${shortcut('Mod+I')}`"
      @click="editor.chain().focus().toggleItalic().run()"
    >
      <em>I</em>
    </button>
    <button
      type="button"
      class="btn btn-xs"
      :class="{ 'btn-active': editor.isActive('underline') }"
      :title="`下划线 ${shortcut('Mod+U')}`"
      @click="editor.chain().focus().toggleUnderline().run()"
    >
      U
    </button>
    <button
      type="button"
      class="btn btn-xs"
      :class="{ 'btn-active': editor.isActive('strike') }"
      title="删除线"
      @click="editor.chain().focus().toggleStrike().run()"
    >
      S
    </button>
    <button
      type="button"
      class="btn btn-xs"
      :class="{ 'btn-active': editor.isActive('highlight') }"
      title="高亮"
      @click="editor.chain().focus().toggleHighlight().run()"
    >
      H
    </button>
    <button
      type="button"
      class="btn btn-xs"
      :class="{ 'btn-active': editor.isActive('link') }"
      title="链接"
      @click="setLink(editor)"
    >
      🔗
    </button>

    <div class="dropdown dropdown-hover">
      <button type="button" class="btn btn-xs" tabindex="0" title="文字颜色">A</button>
      <div tabindex="0" class="dropdown-content z-20 flex gap-1 p-2 bg-base-100 border border-base-300 rounded-box shadow-lg">
        <button
          v-for="c in colors"
          :key="c"
          type="button"
          class="w-5 h-5 rounded-full border border-base-300"
          :style="{ backgroundColor: c }"
          @click="editor.chain().focus().setColor(c).run()"
        />
        <button
          type="button"
          class="btn btn-xs"
          @click="editor.chain().focus().unsetColor().run()"
        >
          清除
        </button>
      </div>
    </div>

    <span class="w-px h-4 bg-base-300 mx-1" />

    <button
      type="button"
      class="btn btn-xs"
      :class="{ 'btn-active': editor.isActive('heading', { level: 2 }) }"
      title="二级标题"
      @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
    >
      H2
    </button>
    <button
      type="button"
      class="btn btn-xs"
      :class="{ 'btn-active': editor.isActive('heading', { level: 3 }) }"
      title="三级标题"
      @click="editor.chain().focus().toggleHeading({ level: 3 }).run()"
    >
      H3
    </button>

    <span class="w-px h-4 bg-base-300 mx-1" />

    <button
      type="button"
      class="btn btn-xs"
      :class="{ 'btn-active': editor.isActive({ textAlign: 'left' }) }"
      title="左对齐"
      @click="editor.chain().focus().setTextAlign('left').run()"
    >
      ≡
    </button>
    <button
      type="button"
      class="btn btn-xs"
      :class="{ 'btn-active': editor.isActive({ textAlign: 'center' }) }"
      title="居中"
      @click="editor.chain().focus().setTextAlign('center').run()"
    >
      ≡
    </button>

    <span class="w-px h-4 bg-base-300 mx-1" />

    <button
      type="button"
      class="btn btn-xs"
      :class="{ 'btn-active': editor.isActive('bulletList') }"
      title="无序列表"
      @click="editor.chain().focus().toggleBulletList().run()"
    >
      列表
    </button>
    <button
      type="button"
      class="btn btn-xs"
      :class="{ 'btn-active': editor.isActive('orderedList') }"
      title="有序列表"
      @click="editor.chain().focus().toggleOrderedList().run()"
    >
      1.
    </button>
    <button
      type="button"
      class="btn btn-xs"
      :class="{ 'btn-active': editor.isActive('taskList') }"
      title="任务列表"
      @click="editor.chain().focus().toggleTaskList().run()"
    >
      ☑
    </button>
    <button
      type="button"
      class="btn btn-xs"
      :class="{ 'btn-active': editor.isActive('blockquote') }"
      title="引用"
      @click="editor.chain().focus().toggleBlockquote().run()"
    >
      引用
    </button>
    <button
      type="button"
      class="btn btn-xs"
      :class="{ 'btn-active': editor.isActive('codeBlock') }"
      title="代码块"
      @click="editor.chain().focus().toggleCodeBlock().run()"
    >
      &lt;/&gt;
    </button>
    <button
      type="button"
      class="btn btn-xs"
      title="分割线"
      @click="editor.chain().focus().setHorizontalRule().run()"
    >
      —
    </button>
    <button
      type="button"
      class="btn btn-xs"
      title="插入表格"
      @click="editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()"
    >
      表
    </button>

    <span class="w-px h-4 bg-base-300 mx-1" />

    <button
      type="button"
      class="btn btn-xs"
      :class="{ 'btn-success': copyDone }"
      :title="copyDone ? '已复制' : '一键复制'"
      @click="copyContent(editor)"
    >
      {{ copyDone ? '已复制' : '复制' }}
    </button>

    <slot />
  </div>
</template>
