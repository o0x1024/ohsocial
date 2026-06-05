function stripMarkdownFence(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
}

/** Remove trailing commas before `}` or `]` (common in LLM JSON output). */
function removeTrailingCommas(json: string): string {
  return json.replace(/,(\s*[}\]])/g, '$1')
}

function tryParseJson<T>(json: string): T | null {
  try {
    return JSON.parse(json) as T
  } catch {
    return null
  }
}

export function parseJsonArrayFromText<T>(text: string): T[] {
  const normalized = stripMarkdownFence(text)
  const match = normalized.match(/\[[\s\S]*\]/)
  if (!match) return []

  const cleaned = removeTrailingCommas(match[0])
  const parsed = tryParseJson<unknown>(cleaned)
  return Array.isArray(parsed) ? (parsed as T[]) : []
}

export function parseJsonObjectFromText<T>(text: string): T | null {
  const normalized = stripMarkdownFence(text)
  const match = normalized.match(/\{[\s\S]*\}/)
  if (!match) return null

  const cleaned = removeTrailingCommas(match[0])
  return tryParseJson<T>(cleaned)
}
