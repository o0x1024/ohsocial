import { BaseDAO } from './base-dao'
import { parseAvailableModelsJson } from '../../context/model-catalog'
import { getModelConfigLegacyColumns } from '../model-config-legacy'

export interface ModelConfigRow {
  id: number
  model_type: string
  model_name: string | null
  api_key: string | null
  api_base: string | null
  is_enabled: number
  priority: number
  max_context_tokens: number | null
  available_models_json: string | null
  display_name: string | null
  provider_protocol: string | null
  provider_options_json: string | null
}

class ModelConfigDAO extends BaseDAO {
  private typeWhereClause(): string {
    const legacy = getModelConfigLegacyColumns(this.db)
    if (legacy.provider) {
      return '(model_type = ? OR provider = ?)'
    }
    return 'model_type = ?'
  }

  private typeWhereParams(modelType: string): string[] {
    const legacy = getModelConfigLegacyColumns(this.db)
    return legacy.provider ? [modelType, modelType] : [modelType]
  }

  list(): ModelConfigRow[] {
    return this.all<ModelConfigRow>('SELECT * FROM model_configs ORDER BY priority, id')
  }

  getPrimary(): ModelConfigRow | undefined {
    return this.get<ModelConfigRow>(
      `SELECT * FROM model_configs WHERE is_enabled = 1 AND api_key IS NOT NULL AND api_key != '' ORDER BY priority, id LIMIT 1`
    )
  }

  getByType(modelType: string): ModelConfigRow | undefined {
    return this.get<ModelConfigRow>(
      `SELECT * FROM model_configs WHERE ${this.typeWhereClause()} LIMIT 1`,
      this.typeWhereParams(modelType)
    )
  }

  upsert(
    modelType: string,
    apiKey: string,
    apiBase?: string,
    modelName?: string,
    displayName?: string | null,
    providerProtocol?: string | null
  ): void {
    const legacy = getModelConfigLegacyColumns(this.db)
    const label = displayName?.trim() || modelType
    const base = apiBase ?? null
    const existing = this.getByType(modelType)

    if (existing) {
      const sets = [
        'api_key = ?',
        'api_base = ?',
        'model_name = ?',
        'display_name = COALESCE(?, display_name)',
        'provider_protocol = COALESCE(?, provider_protocol)',
        'model_type = ?'
      ]
      const params: unknown[] = [
        apiKey,
        base,
        modelName ?? null,
        displayName,
        providerProtocol,
        modelType
      ]
      if (legacy.provider) {
        sets.push('provider = ?')
        params.push(modelType)
      }
      if (legacy.name) {
        sets.push('name = ?')
        params.push(label)
      }
      if (legacy.baseUrl) {
        sets.push('base_url = ?')
        params.push(base)
      }
      params.push(...this.typeWhereParams(modelType))
      this.run(
        `UPDATE model_configs SET ${sets.join(', ')} WHERE ${this.typeWhereClause()}`,
        params
      )
      return
    }

    const columns = ['model_type', 'api_key', 'api_base', 'model_name', 'display_name', 'provider_protocol']
    const placeholders = ['?', '?', '?', '?', '?', '?']
    const values: unknown[] = [modelType, apiKey, base, modelName ?? null, displayName, providerProtocol]

    if (legacy.provider) {
      columns.push('provider')
      placeholders.push('?')
      values.push(modelType)
    }
    if (legacy.name) {
      columns.push('name')
      placeholders.push('?')
      values.push(label)
    }
    if (legacy.baseUrl) {
      columns.push('base_url')
      placeholders.push('?')
      values.push(base)
    }
    if (legacy.params) {
      columns.push('params')
      placeholders.push('?')
      values.push('{}')
    }
    if (legacy.isDefault) {
      columns.push('is_default')
      placeholders.push('?')
      values.push(0)
    }

    this.run(
      `INSERT INTO model_configs (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`,
      values
    )
  }

  createCustom(
    modelType: string,
    displayName: string,
    providerProtocol: string,
    apiKey: string,
    apiBase: string,
    modelName: string
  ): void {
    const maxPriority = this.get<{ max_p: number }>(
      'SELECT COALESCE(MAX(priority), 0) AS max_p FROM model_configs'
    )
    const legacy = getModelConfigLegacyColumns(this.db)
    const columns = [
      'model_type',
      'display_name',
      'provider_protocol',
      'api_key',
      'api_base',
      'model_name',
      'is_enabled',
      'priority'
    ]
    const values: unknown[] = [
      modelType,
      displayName,
      providerProtocol,
      apiKey,
      apiBase,
      modelName,
      0,
      (maxPriority?.max_p ?? 0) + 1
    ]
    if (legacy.provider) {
      columns.push('provider')
      values.push(modelType)
    }
    if (legacy.name) {
      columns.push('name')
      values.push(displayName)
    }
    if (legacy.baseUrl) {
      columns.push('base_url')
      values.push(apiBase)
    }
    if (legacy.params) {
      columns.push('params')
      values.push('{}')
    }
    const placeholders = columns.map(() => '?').join(', ')
    this.run(
      `INSERT INTO model_configs (${columns.join(', ')}) VALUES (${placeholders})`,
      values
    )
  }

  setEnabled(modelType: string, enabled: boolean): boolean {
    return (
      this.run(`UPDATE model_configs SET is_enabled = ? WHERE ${this.typeWhereClause()}`, [
        enabled ? 1 : 0,
        ...this.typeWhereParams(modelType)
      ]).changes > 0
    )
  }

  setPriority(modelType: string, priority: number): boolean {
    return (
      this.run(`UPDATE model_configs SET priority = ? WHERE ${this.typeWhereClause()}`, [
        priority,
        ...this.typeWhereParams(modelType)
      ]).changes > 0
    )
  }

  delete(modelType: string): boolean {
    return (
      this.run(`DELETE FROM model_configs WHERE ${this.typeWhereClause()}`, this.typeWhereParams(modelType))
        .changes > 0
    )
  }

  setMaxContextTokens(modelType: string, tokens: number): boolean {
    return (
      this.run(`UPDATE model_configs SET max_context_tokens = ? WHERE ${this.typeWhereClause()}`, [
        Math.max(1024, Math.floor(tokens)),
        ...this.typeWhereParams(modelType)
      ]).changes > 0
    )
  }

  setAvailableModels(modelType: string, models: string[]): boolean {
    const unique = [...new Set(models.map(m => m.trim()).filter(Boolean))]
    return (
      this.run(`UPDATE model_configs SET available_models_json = ? WHERE ${this.typeWhereClause()}`, [
        JSON.stringify(unique),
        ...this.typeWhereParams(modelType)
      ]).changes > 0
    )
  }

  setProviderOptions(modelType: string, optionsJson: string | null): boolean {
    return (
      this.run(`UPDATE model_configs SET provider_options_json = ? WHERE ${this.typeWhereClause()}`, [
        optionsJson,
        ...this.typeWhereParams(modelType)
      ]).changes > 0
    )
  }

  hasEnabled(): boolean {
    const row = this.get<{ c: number }>(
      `SELECT COUNT(*) as c FROM model_configs WHERE is_enabled = 1 AND api_key IS NOT NULL AND api_key != ''`
    )
    return (row?.c ?? 0) > 0
  }
}

export const modelConfigDAO = new ModelConfigDAO()
export { parseAvailableModelsJson }
