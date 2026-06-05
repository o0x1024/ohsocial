import { computed, ref, watch, type Ref } from 'vue'
import type { Editor } from '@tiptap/core'

export interface EditorStats {
  chars: number
  words: number
  paragraphs: number
  readingMinutes: number
}

function computeStats(html: string): EditorStats {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  const chars = text.length
  const paragraphs = (html.match(/<p[\s>]/gi) ?? []).length || (text ? 1 : 0)
  const readingMinutes = Math.max(1, Math.ceil(chars / 400))
  return { chars, words: chars, paragraphs, readingMinutes }
}

export function useEditorStats(editor: Ref<Editor | undefined>, fallbackHtml: Ref<string>) {
  const stats = ref<EditorStats>(computeStats(fallbackHtml.value))

  function refresh() {
    const html = editor.value?.getHTML() ?? fallbackHtml.value
    stats.value = computeStats(html)
  }

  watch(fallbackHtml, refresh)
  watch(editor, (ed, _, onCleanup) => {
    if (!ed) return
    const handler = () => refresh()
    ed.on('update', handler)
    refresh()
    onCleanup(() => ed.off('update', handler))
  })

  const statsLabel = computed(
    () =>
      `${stats.value.chars} 字 · ${stats.value.paragraphs} 段 · 约 ${stats.value.readingMinutes} 分钟阅读`
  )

  return { stats, statsLabel, refresh }
}
