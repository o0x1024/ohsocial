import type { Editor } from '@tiptap/core'
import { DOMSerializer } from '@tiptap/pm/model'

function fragmentToHtml(editor: Editor, fragment: Parameters<DOMSerializer['serializeFragment']>[0]): string {
  const div = document.createElement('div')
  const serializer = DOMSerializer.fromSchema(editor.schema)
  div.appendChild(serializer.serializeFragment(fragment))
  return div.innerHTML
}

function wrapClipboardHtml(html: string): string {
  return `<html><body><!--StartFragment-->${html}<!--EndFragment--></body></html>`
}

export function getEditorCopyPayload(editor: Editor): { html: string; text: string } | null {
  const { state } = editor
  const { empty, from, to } = state.selection

  if (empty) {
    const html = editor.getHTML().trim()
    const text = editor.getText().trim()
    if (!text) return null
    return { html, text }
  }

  const slice = state.doc.slice(from, to)
  const html = fragmentToHtml(editor, slice.content)
  const div = document.createElement('div')
  div.innerHTML = html
  const text = (div.textContent ?? '').trim()
  if (!text) return null
  return { html, text }
}

export async function copyEditorContent(editor: Editor): Promise<boolean> {
  const payload = getEditorCopyPayload(editor)
  if (!payload) return false

  const { html, text } = payload

  try {
    if (typeof ClipboardItem !== 'undefined') {
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([wrapClipboardHtml(html)], { type: 'text/html' }),
          'text/plain': new Blob([text], { type: 'text/plain' })
        })
      ])
      return true
    }
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
