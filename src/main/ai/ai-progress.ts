import { randomUUID } from 'crypto'
import type { WebContents } from 'electron'

export type AiDeltaKind = 'content' | 'thinking'

export class AiProgressEmitter {
  readonly taskId: string
  readonly abortController = new AbortController()

  constructor(
    private readonly sender: WebContents | undefined,
    public readonly label: string
  ) {
    this.taskId = randomUUID()
  }

  get signal(): AbortSignal {
    return this.abortController.signal
  }

  cancel(): void {
    if (!this.abortController.signal.aborted) {
      this.abortController.abort()
    }
  }

  start(modelName?: string): void {
    this.sender?.send('ai:task-start', {
      taskId: this.taskId,
      label: this.label,
      modelName: modelName ?? ''
    })
  }

  delta(text: string, kind: AiDeltaKind = 'content', legacy?: Record<string, unknown>): void {
    if (!text) return
    this.sender?.send('ai:delta', { taskId: this.taskId, delta: text, kind, ...legacy })
  }

  status(message: string): void {
    if (!message) return
    this.sender?.send('ai:status', { taskId: this.taskId, status: message })
  }

  end(success: boolean, error?: string): void {
    this.sender?.send('ai:task-end', { taskId: this.taskId, success, error })
  }
}

export function createAiProgress(
  sender: WebContents | undefined,
  label: string
): AiProgressEmitter | undefined {
  if (!sender || sender.isDestroyed()) return undefined
  return new AiProgressEmitter(sender, label)
}
