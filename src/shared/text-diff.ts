export interface DiffLine {
  type: 'same' | 'add' | 'remove'
  text: string
}

/** 简单行级 diff（Myers 简化版：按行 LCS） */
export function diffLines(oldText: string, newText: string): DiffLine[] {
  const a = oldText.split('\n')
  const b = newText.split('\n')
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1])
    }
  }
  const result: DiffLine[] = []
  let i = m
  let j = n
  const stack: DiffLine[] = []
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      stack.push({ type: 'same', text: a[i - 1] })
      i--
      j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      stack.push({ type: 'add', text: b[j - 1] })
      j--
    } else {
      stack.push({ type: 'remove', text: a[i - 1] })
      i--
    }
  }
  while (stack.length) result.push(stack.pop()!)
  return result
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '\n').replace(/\n+/g, '\n').trim()
}
