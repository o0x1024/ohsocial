import { OH_LAYOUT_CLASS } from './content-layout-templates'

/** class → 内联样式，粘贴到微信公众号等平台时保留视觉效果 */
export const OH_LAYOUT_INLINE_STYLES: Record<string, string> = {
  [OH_LAYOUT_CLASS.h2]:
    'font-size:18px;font-weight:bold;color:#1a1a1a;margin:28px 0 14px;padding-bottom:8px;border-bottom:2px solid #576b95;line-height:1.4;',
  [OH_LAYOUT_CLASS.h3]:
    'font-size:16px;font-weight:bold;color:#333;margin:20px 0 10px;line-height:1.5;',
  [OH_LAYOUT_CLASS.quote]:
    'border-left:4px solid #576b95;padding:14px 18px;margin:20px 0;background-color:#f6f8fa;color:#555;font-size:15px;line-height:1.7;',
  [OH_LAYOUT_CLASS.tip]:
    'border-left:4px solid #3b82f6;padding:14px 18px;margin:16px 0;background-color:#eef7ff;color:#333;font-size:14px;line-height:1.7;',
  [OH_LAYOUT_CLASS.intro]:
    'font-size:16px;color:#666;line-height:1.8;margin:0 0 20px;font-style:italic;',
  [OH_LAYOUT_CLASS.key]: 'font-weight:bold;color:#c0392b;',
  [OH_LAYOUT_CLASS.highlight]:
    'background-color:#fff3cd;padding:2px 6px;border-radius:3px;color:#333;',
  [OH_LAYOUT_CLASS.divider]: 'border:none;border-top:1px dashed #ddd;margin:24px 0;height:0;'
}

const OH_CLASS_NAMES = new Set(Object.values(OH_LAYOUT_CLASS))

function mergeStyle(existing: string | null, added: string): string {
  const base = existing?.trim().replace(/;?\s*$/, '') ?? ''
  if (!base) return added
  return `${base};${added}`
}

/** 将 oh-* class 转为 inline style，供复制到外部平台 */
export function prepareHtmlForExport(html: string): string {
  if (!html.trim() || typeof DOMParser === 'undefined') return html

  const doc = new DOMParser().parseFromString(`<div id="oh-export-root">${html}</div>`, 'text/html')
  const root = doc.getElementById('oh-export-root')
  if (!root) return html

  root.querySelectorAll('[class]').forEach(el => {
    const classes = (el.getAttribute('class') ?? '')
      .split(/\s+/)
      .filter(Boolean)
    const ohClasses = classes.filter(c => OH_CLASS_NAMES.has(c as (typeof OH_LAYOUT_CLASS)[keyof typeof OH_LAYOUT_CLASS]))
    if (!ohClasses.length) return

    let style = el.getAttribute('style')
    for (const cls of ohClasses) {
      const inline = OH_LAYOUT_INLINE_STYLES[cls]
      if (inline) style = mergeStyle(style, inline)
    }
    if (style) el.setAttribute('style', style)

    const remaining = classes.filter(c => !OH_CLASS_NAMES.has(c as (typeof OH_LAYOUT_CLASS)[keyof typeof OH_LAYOUT_CLASS]))
    if (remaining.length) el.setAttribute('class', remaining.join(' '))
    else el.removeAttribute('class')
  })

  return root.innerHTML
}
