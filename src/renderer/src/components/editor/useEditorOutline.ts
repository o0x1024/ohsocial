import { ref, watch, type Ref } from 'vue'
import type { Editor } from '@tiptap/core'

export interface OutlineItem {
  id: string
  level: number
  text: string
  pos: number
}

export function useEditorOutline(editor: Ref<Editor | undefined>) {
  const items = ref<OutlineItem[]>([])

  function refresh() {
    const ed = editor.value
    if (!ed) {
      items.value = []
      return
    }
    const next: OutlineItem[] = []
    ed.state.doc.descendants((node, pos) => {
      if (node.type.name === 'heading') {
        next.push({
          id: `h-${pos}`,
          level: node.attrs.level as number,
          text: node.textContent || '（空标题）',
          pos
        })
      }
    })
    items.value = next
  }

  function scrollTo(pos: number) {
    editor.value?.chain().focus().setTextSelection(pos + 1).scrollIntoView().run()
  }

  watch(editor, (ed, _, onCleanup) => {
    if (!ed) return
    const handler = () => refresh()
    ed.on('update', handler)
    refresh()
    onCleanup(() => ed.off('update', handler))
  })

  return { items, refresh, scrollTo }
}
