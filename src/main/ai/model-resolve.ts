import { modelConfigDAO, type ModelConfigRow } from '../db/dao/model-config-dao'
import { appPreferenceDAO } from '../db/dao/app-preference-dao'
import { DEFAULT_GENERATION_PARAMS } from '../db/dao/app-preference-dao'

export interface ResolvedModelConfig {
  modelType: string
  apiKey: string
  apiBase: string
  modelName: string
  providerProtocol: string | null
  providerOptionsJson: string | null
  generationParams: typeof DEFAULT_GENERATION_PARAMS
}

export function selectModelConfig(
  preferredType?: string,
  preferredModelName?: string | null
): ResolvedModelConfig | null {
  let row: ModelConfigRow | undefined

  if (preferredType) {
    const config = modelConfigDAO.getByType(preferredType)
    if (config?.is_enabled && config.api_key?.trim()) {
      row = config
      if (preferredModelName?.trim()) {
        row = { ...config, model_name: preferredModelName.trim() }
      }
    }
  }

  if (!row) {
    const global = appPreferenceDAO.getGlobalLlmDefault()
    if (global.provider) {
      const config = modelConfigDAO.getByType(global.provider)
      if (config?.is_enabled && config.api_key?.trim()) {
        row = global.modelName
          ? { ...config, model_name: global.modelName }
          : config
      }
    }
  }

  if (!row) {
    row = modelConfigDAO.getPrimary()
  }

  if (!row?.api_key?.trim()) return null

  const gen = appPreferenceDAO.getGenerationParams()
  return {
    modelType: row.model_type,
    apiKey: row.api_key.trim(),
    apiBase: (row.api_base ?? 'https://api.openai.com/v1').replace(/\/$/, ''),
    modelName: row.model_name?.trim() || 'gpt-4o-mini',
    providerProtocol: row.provider_protocol,
    providerOptionsJson: row.provider_options_json,
    generationParams: gen
  }
}
