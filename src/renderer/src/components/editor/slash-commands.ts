import type { Editor } from '@tiptap/core'

export interface SlashCommandItem {
  id: string
  label: string
  description?: string
  icon?: string
  keywords?: string[]
  action: (editor: Editor) => void
}

export function buildSlashCommands(handlers: {
  insertImage: () => void
}): SlashCommandItem[] {
  return [
    {
      id: 'h2',
      label: '二级标题',
      description: '小节标题',
      icon: 'H2',
      keywords: ['heading', 'title', '标题'],
      action: ed => ed.chain().focus().toggleHeading({ level: 2 }).run()
    },
    {
      id: 'h3',
      label: '三级标题',
      description: '子标题',
      icon: 'H3',
      keywords: ['heading', 'subtitle'],
      action: ed => ed.chain().focus().toggleHeading({ level: 3 }).run()
    },
    {
      id: 'bullet',
      label: '无序列表',
      icon: '•',
      keywords: ['list', 'ul'],
      action: ed => ed.chain().focus().toggleBulletList().run()
    },
    {
      id: 'ordered',
      label: '有序列表',
      icon: '1.',
      keywords: ['ol', 'number'],
      action: ed => ed.chain().focus().toggleOrderedList().run()
    },
    {
      id: 'task',
      label: '任务列表',
      icon: '☑',
      keywords: ['todo', 'checkbox'],
      action: ed => ed.chain().focus().toggleTaskList().run()
    },
    {
      id: 'quote',
      label: '引用',
      icon: '❝',
      keywords: ['blockquote'],
      action: ed => ed.chain().focus().toggleBlockquote().run()
    },
    {
      id: 'code',
      label: '代码块',
      icon: '</>',
      keywords: ['code'],
      action: ed => ed.chain().focus().toggleCodeBlock().run()
    },
    {
      id: 'hr',
      label: '分割线',
      icon: '—',
      keywords: ['divider', 'line'],
      action: ed => ed.chain().focus().setHorizontalRule().run()
    },
    {
      id: 'table',
      label: '表格',
      icon: '⊞',
      keywords: ['grid'],
      action: ed =>
        ed.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
    },
    {
      id: 'image',
      label: '图片',
      description: '从素材库或本地上传',
      icon: '🖼',
      keywords: ['img', 'photo'],
      action: () => handlers.insertImage()
    }
  ]
}

export function filterSlashCommands(items: SlashCommandItem[], query: string): SlashCommandItem[] {
  const q = query.trim().toLowerCase()
  if (!q) return items
  return items.filter(
    item =>
      item.label.toLowerCase().includes(q) ||
      item.id.includes(q) ||
      item.keywords?.some(k => k.includes(q))
  )
}
