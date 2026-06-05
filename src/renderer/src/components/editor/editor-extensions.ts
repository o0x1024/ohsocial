import type { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Typography from '@tiptap/extension-typography'
import Highlight from '@tiptap/extension-highlight'
import TextAlign from '@tiptap/extension-text-align'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import Image from '@tiptap/extension-image'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Underline from '@tiptap/extension-underline'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import Focus from '@tiptap/extension-focus'
import GlobalDragHandle from 'tiptap-extension-global-drag-handle'
import { common, createLowlight } from 'lowlight'
import { CommentMark } from './comment-mark'
import { SlashCommandExtension } from './slash-command'
import type { SlashCommandItem } from './slash-commands'

const lowlight = createLowlight(common)

export interface CreateEditorExtensionsOptions {
  onSlashCommand?: (props: {
    editor: Editor
    range: { from: number; to: number }
    query: string
    clientRect?: (() => DOMRect | null) | null
  }) => void
  onSlashExit?: () => void
  slashItems?: SlashCommandItem[]
}

export function createEditorExtensions(options: CreateEditorExtensionsOptions = {}) {
  return [
    StarterKit.configure({
      codeBlock: false,
      dropcursor: { color: 'oklch(var(--p))', width: 2 }
    }),
    Typography,
    Highlight.configure({ multicolor: false }),
    TextAlign.configure({ types: ['heading', 'paragraph'] }),
    Link.configure({
      openOnClick: false,
      HTMLAttributes: { class: 'editor-link', rel: 'noopener noreferrer' }
    }),
    Placeholder.configure({
      placeholder: ({ node }) => {
        if (node.type.name === 'heading') return '输入小节标题…'
        if (node.type.name === 'blockquote') return '输入引言或金句…'
        return '开始写作… 输入 / 插入块'
      },
      includeChildren: true
    }),
    Image.configure({ HTMLAttributes: { class: 'editor-image' } }),
    Table.configure({ resizable: true }),
    TableRow,
    TableCell,
    TableHeader,
    TaskList,
    TaskItem.configure({ nested: true }),
    TextStyle,
    Color,
    Underline,
    CodeBlockLowlight.configure({ lowlight }),
    Focus.configure({
      className: 'has-focus',
      mode: 'deepest'
    }),
    GlobalDragHandle.configure(),
    CommentMark,
    SlashCommandExtension.configure({
      onActivate: options.onSlashCommand,
      onExit: options.onSlashExit
    })
  ]
}

export { lowlight }
