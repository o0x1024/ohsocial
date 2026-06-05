/**
 * AI 输出 → TipTap HTML 转换器
 * 支持三种输入：纯 HTML、Markdown、纯文本
 * 最终做一轮排版优化 pass
 */

const HTML_BLOCK_RE = /<(?:p|h[1-6]|ul|ol|li|blockquote|div|br|table)\b/i

/** 将 AI 输出转为 Tiptap 可用的 HTML */
export function toEditorHtml(text: string): string {
  const trimmed = text.trim()
  if (!trimmed) return '<p></p>'

  let html: string
  if (HTML_BLOCK_RE.test(trimmed)) {
    html = trimmed
  } else if (looksLikeMarkdown(trimmed)) {
    html = markdownToHtml(trimmed)
  } else {
    html = plainTextToHtml(trimmed)
  }

  return polishHtml(html)
}

function looksLikeMarkdown(text: string): boolean {
  const mdIndicators = [
    /^#{1,6}\s/m,
    /\*\*.+?\*\*/,
    /^[-*+]\s/m,
    /^\d+\.\s/m,
    /^>\s/m,
    /^---$/m
  ]
  const matchCount = mdIndicators.filter(re => re.test(text)).length
  return matchCount >= 1
}

function markdownToHtml(md: string): string {
  const lines = md.split('\n')
  const output: string[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.trim() === '') {
      i++
      continue
    }

    if (line.trim() === '---' || line.trim() === '***') {
      output.push('<hr>')
      i++
      continue
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      const level = headingMatch[1].length
      output.push(`<h${level}>${inlineFormat(headingMatch[2])}</h${level}>`)
      i++
      continue
    }

    if (/^>\s/.test(line)) {
      const quoteLines: string[] = []
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quoteLines.push(lines[i].replace(/^>\s?/, ''))
        i++
      }
      output.push(`<blockquote><p>${inlineFormat(quoteLines.join(' '))}</p></blockquote>`)
      continue
    }

    if (/^[-*+]\s/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^[-*+]\s/.test(lines[i])) {
        items.push(lines[i].replace(/^[-*+]\s+/, ''))
        i++
      }
      output.push('<ul>' + items.map(item => `<li>${inlineFormat(item)}</li>`).join('') + '</ul>')
      continue
    }

    if (/^\d+\.\s/.test(line)) {
      const items: string[] = []
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ''))
        i++
      }
      output.push('<ol>' + items.map(item => `<li>${inlineFormat(item)}</li>`).join('') + '</ol>')
      continue
    }

    const paraLines: string[] = []
    while (i < lines.length && lines[i].trim() !== '' && !isBlockStart(lines[i])) {
      paraLines.push(lines[i])
      i++
    }
    output.push(`<p>${inlineFormat(paraLines.join(' '))}</p>`)
  }

  return output.join('')
}

function isBlockStart(line: string): boolean {
  return /^#{1,6}\s/.test(line) ||
    /^[-*+]\s/.test(line) ||
    /^\d+\.\s/.test(line) ||
    /^>\s/.test(line) ||
    /^---$/.test(line.trim()) ||
    /^\*\*\*$/.test(line.trim())
}

function inlineFormat(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>')
}

function plainTextToHtml(text: string): string {
  const paragraphs = text.split(/\n{2,}/)
  return paragraphs
    .map(p => {
      const inner = p
        .split('\n')
        .map(line => escapeHtml(line))
        .join('<br>')
      return `<p>${inner}</p>`
    })
    .join('')
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/**
 * 排版优化 pass — 清理 AI 输出中的常见排版问题
 */
function polishHtml(html: string): string {
  let result = html

  // 移除空段落
  result = result.replace(/<p>\s*<\/p>/g, '')

  // 移除多余的 <br> 开头/结尾
  result = result.replace(/<p><br\s*\/?>/g, '<p>')
  result = result.replace(/<br\s*\/?><\/p>/g, '</p>')

  // 清理连续多个 <br>
  result = result.replace(/(<br\s*\/?>){3,}/g, '<br><br>')

  // 移除 markdown 代码块包裹（有些模型无视指令仍输出）
  result = result.replace(/```html\s*/gi, '')
  result = result.replace(/```\s*/g, '')

  // 移除文章开头的"标题"标签（prompt 要求不要输出标题）
  result = result.replace(/^\s*<h1>.*?<\/h1>\s*/i, '')

  // 确保以有效标签开头
  if (result.trim() && !/<[a-z]/i.test(result.trim().charAt(0) + result.trim().charAt(1))) {
    result = `<p>${result}</p>`
  }

  // 如果处理完为空，返回空段落
  if (!result.trim()) return '<p></p>'

  return result
}
