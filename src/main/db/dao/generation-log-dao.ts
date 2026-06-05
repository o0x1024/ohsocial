import { BaseDAO } from './base-dao'

class GenerationLogDAO extends BaseDAO {
  log(entry: {
    step: string
    modelProvider?: string
    modelName?: string
    inputTokens?: number
    outputTokens?: number
    durationMs?: number
    status?: string
    errorMessage?: string
  }) {
    this.insert(
      `INSERT INTO generation_log (step, model_provider, model_name, input_tokens, output_tokens, duration_ms, status, error_message)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.step,
        entry.modelProvider ?? null,
        entry.modelName ?? null,
        entry.inputTokens ?? 0,
        entry.outputTokens ?? 0,
        entry.durationMs ?? 0,
        entry.status ?? 'success',
        entry.errorMessage ?? null
      ]
    )
  }

  stats() {
    const total = this.get<{ c: number }>('SELECT COUNT(*) as c FROM generation_log')?.c ?? 0
    const byStep = this.all<{ step: string; c: number }>(
      'SELECT step, COUNT(*) as c FROM generation_log GROUP BY step ORDER BY c DESC'
    )
    const last7 = this.get<{ c: number }>(
      `SELECT COUNT(*) as c FROM generation_log WHERE created_at >= datetime('now', '-7 days')`
    )?.c ?? 0
    return { total, byStep, last7 }
  }
}

export const generationLogDAO = new GenerationLogDAO()
