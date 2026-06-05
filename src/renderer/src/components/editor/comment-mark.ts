import { Mark, mergeAttributes } from '@tiptap/core'

export interface CommentMarkOptions {
  HTMLAttributes: Record<string, unknown>
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    commentMark: {
      setCommentMark: (commentId: string) => ReturnType
      unsetCommentMark: () => ReturnType
      toggleCommentMark: (commentId: string) => ReturnType
    }
  }
}

export const CommentMark = Mark.create<CommentMarkOptions>({
  name: 'commentMark',

  addOptions() {
    return { HTMLAttributes: {} }
  },

  addAttributes() {
    return {
      commentId: {
        default: null,
        parseHTML: el => el.getAttribute('data-comment-id'),
        renderHTML: attrs =>
          attrs.commentId ? { 'data-comment-id': attrs.commentId } : {}
      }
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-comment-id]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        class: 'editor-comment-mark'
      }),
      0
    ]
  },

  addCommands() {
    return {
      setCommentMark:
        (commentId: string) =>
        ({ commands }) =>
          commands.setMark(this.name, { commentId }),
      unsetCommentMark:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name),
      toggleCommentMark:
        (commentId: string) =>
        ({ commands }) =>
          commands.toggleMark(this.name, { commentId })
    }
  }
})
