import { Extension } from '@tiptap/core'
import Highlight from '@tiptap/extension-highlight'
import Bold from '@tiptap/extension-bold'

/** 保留 AI 生成的 oh-* class，供编辑器预览与导出转换 */
export const PreserveLayoutClasses = Extension.create({
  name: 'preserveLayoutClasses',
  addGlobalAttributes() {
    return [
      {
        types: [
          'heading',
          'paragraph',
          'blockquote',
          'horizontalRule',
          'bulletList',
          'orderedList',
          'listItem'
        ],
        attributes: {
          class: {
            default: null,
            parseHTML: element => element.getAttribute('class'),
            renderHTML: attributes => {
              if (!attributes.class) return {}
              return { class: attributes.class }
            }
          }
        }
      }
    ]
  }
})

export const LayoutBold = Bold.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      class: {
        default: null,
        parseHTML: element => element.getAttribute('class'),
        renderHTML: attributes => {
          if (!attributes.class) return {}
          return { class: attributes.class }
        }
      }
    }
  }
})

export const LayoutHighlight = Highlight.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      class: {
        default: null,
        parseHTML: element => element.getAttribute('class'),
        renderHTML: attributes => {
          if (!attributes.class) return {}
          return { class: attributes.class }
        }
      }
    }
  }
})
