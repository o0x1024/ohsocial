import fs from 'fs'
import path from 'path'

export type AppLogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR'

export interface LlmRequestLogEntry {
  step: string
  provider?: string
  model?: string
  url: string
  stream?: boolean
  body: Record<string, unknown>
  meta?: Record<string, unknown>
}

export interface LlmResponseLogEntry {
  step: string
  provider?: string
  model?: string
  durationMs: number
  success: boolean
  stream?: boolean
  content?: string
  thinking?: string
  error?: string
  usage?: Record<string, unknown>
  meta?: Record<string, unknown>
}

const MAX_LOG_FIELD_CHARS = 8000

export function getLogDir(): string {
  return path.join(process.cwd(), 'logs')
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function timestamp(): string {
  return new Date().toISOString()
}

function ensureLogDir(): string {
  const dir = getLogDir()
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

function appendLine(fileName: string, line: string): void {
  try {
    ensureLogDir()
    fs.appendFileSync(path.join(getLogDir(), fileName), `${line}\n`, 'utf-8')
  } catch (err) {
    console.error('[file-logger] write failed:', err)
  }
}

function truncateText(text: string, max = MAX_LOG_FIELD_CHARS): string {
  if (text.length <= max) return text
  return `${text.slice(0, max)}…[truncated ${text.length - max} chars]`
}

function sanitizeValue(value: unknown): unknown {
  if (typeof value === 'string') return truncateText(value)
  if (Array.isArray(value)) return value.map(sanitizeValue)
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(obj)) {
      if (/api[_-]?key|authorization|token|secret|password/i.test(k)) {
        out[k] = '[REDACTED]'
      } else {
        out[k] = sanitizeValue(v)
      }
    }
    return out
  }
  return value
}

function formatExtra(extra?: Record<string, unknown>): string {
  if (!extra || Object.keys(extra).length === 0) return ''
  try {
    return ` ${JSON.stringify(sanitizeValue(extra))}`
  } catch {
    return ' [extra-unserializable]'
  }
}

function normalizeAppLevel(level: string): AppLogLevel {
  const upper = level.toUpperCase()
  if (upper === 'DEBUG' || upper === 'INFO' || upper === 'WARN' || upper === 'ERROR') {
    return upper
  }
  return 'INFO'
}

export function appLogFileName(date = todayKey()): string {
  return `app-${date}.log`
}

export function llmLogFileName(date = todayKey()): string {
  return `llm-${date}.log`
}

export function getAppLogPath(date = todayKey()): string {
  return path.join(getLogDir(), appLogFileName(date))
}

export function getLlmLogPath(date = todayKey()): string {
  return path.join(getLogDir(), llmLogFileName(date))
}

export function readRecentLogLines(fileName: string, maxLines = 80): string[] {
  const filePath = path.join(getLogDir(), fileName)
  if (!fs.existsSync(filePath)) return []
  try {
    const text = fs.readFileSync(filePath, 'utf-8')
    const lines = text.split('\n').filter(Boolean)
    return lines.slice(-maxLines)
  } catch {
    return []
  }
}

export const appLogger = {
  write(level: string, category: string, message: string, extra?: Record<string, unknown>): void {
    const normalized = normalizeAppLevel(level)
    const line = `${timestamp()} [${normalized}] [${category}] ${message}${formatExtra(extra)}`
    appendLine(appLogFileName(), line)
    if (normalized === 'ERROR') console.error(line)
    else if (normalized === 'WARN') console.warn(line)
    else if (normalized === 'DEBUG') console.debug(line)
    else console.log(line)
  },

  debug(category: string, message: string, extra?: Record<string, unknown>): void {
    this.write('DEBUG', category, message, extra)
  },

  info(category: string, message: string, extra?: Record<string, unknown>): void {
    this.write('INFO', category, message, extra)
  },

  warn(category: string, message: string, extra?: Record<string, unknown>): void {
    this.write('WARN', category, message, extra)
  },

  error(category: string, message: string, extra?: Record<string, unknown>): void {
    this.write('ERROR', category, message, extra)
  }
}

export const llmLogger = {
  logRequest(entry: LlmRequestLogEntry): void {
    const payload = {
      time: timestamp(),
      event: 'request',
      step: entry.step,
      provider: entry.provider ?? null,
      model: entry.model ?? null,
      url: entry.url,
      stream: entry.stream ?? false,
      body: sanitizeValue(entry.body),
      meta: entry.meta ? sanitizeValue(entry.meta) : undefined
    }
    appendLine(llmLogFileName(), JSON.stringify(payload))
  },

  logResponse(entry: LlmResponseLogEntry): void {
    const payload = {
      time: timestamp(),
      event: 'response',
      step: entry.step,
      provider: entry.provider ?? null,
      model: entry.model ?? null,
      durationMs: entry.durationMs,
      success: entry.success,
      stream: entry.stream ?? false,
      content: entry.content != null ? truncateText(entry.content) : undefined,
      thinking: entry.thinking != null ? truncateText(entry.thinking) : undefined,
      error: entry.error,
      usage: entry.usage,
      meta: entry.meta ? sanitizeValue(entry.meta) : undefined
    }
    appendLine(llmLogFileName(), JSON.stringify(payload))
  }
}
