import { Extension } from '@tiptap/core'
import Suggestion, { type SuggestionProps } from '@tiptap/suggestion'

export interface SlashCommandExtensionOptions {
  onActivate?: (props: {
    editor: SuggestionProps['editor']
    range: SuggestionProps['range']
    query: string
    clientRect?: SuggestionProps['clientRect']
  }) => void
  onExit?: () => void
}

export const SlashCommandExtension = Extension.create<SlashCommandExtensionOptions>({
  name: 'slashCommand',

  addOptions() {
    return {
      onActivate: undefined,
      onExit: undefined
    }
  },

  addProseMirrorPlugins() {
    const ext = this
    return [
      Suggestion({
        editor: this.editor,
        char: '/',
        startOfLine: false,
        allowSpaces: false,
        command: ({ editor, range, props }) => {
          const item = props as { action?: (ed: typeof editor) => void }
          item.action?.(editor)
          editor.chain().focus().deleteRange(range).run()
        },
        items: () => [],
        render: () => ({
          onStart: props => {
            ext.options.onActivate?.({
              editor: props.editor,
              range: props.range,
              query: props.query,
              clientRect: props.clientRect
            })
          },
          onUpdate: props => {
            ext.options.onActivate?.({
              editor: props.editor,
              range: props.range,
              query: props.query,
              clientRect: props.clientRect
            })
          },
          onExit: () => ext.options.onExit?.(),
          onKeyDown: () => false
        })
      })
    ]
  }
})
