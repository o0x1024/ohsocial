import { BaseDAO } from './base-dao'

export const GLOBAL_LLM_PROVIDER_KEY = 'global_llm_provider'
export const GLOBAL_LLM_MODEL_KEY = 'global_llm_model'
const GENERATION_PARAMS_KEY = 'generation_params'

export interface GlobalLlmDefault {
  provider: string | null
  modelName: string | null
}

export interface GenerationParams {
  temperature: number
  maxTokens: number
  frequencyPenalty: number
  presencePenalty: number
  topP: number
}

export const DEFAULT_GENERATION_PARAMS: GenerationParams = {
  temperature: 0.92,
  maxTokens: 5250,
  frequencyPenalty: 0.35,
  presencePenalty: 0.3,
  topP: 0.9
}

class AppPreferenceDAO extends BaseDAO {
  get(key: string): string | undefined {
    const row = super.get<{ value: string }>('SELECT value FROM app_preferences WHERE key = ?', [key])
    return row?.value
  }

  set(key: string, value: string): void {
    this.setPreference(key, value)
  }

  getPreference(key: string): string | null {
    const row = super.get<{ value: string }>('SELECT value FROM app_preferences WHERE key = ?', [key])
    return row?.value ?? null
  }

  setPreference(key: string, value: string | null): void {
    if (value === null || value === '') {
      this.run('DELETE FROM app_preferences WHERE key = ?', [key])
      return
    }
    this.run(
      `INSERT INTO app_preferences (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [key, value]
    )
  }

  getGlobalLlmDefault(): GlobalLlmDefault {
    return {
      provider: this.getPreference(GLOBAL_LLM_PROVIDER_KEY),
      modelName: this.getPreference(GLOBAL_LLM_MODEL_KEY)
    }
  }

  setGlobalLlmDefault(provider: string | null, modelName: string | null): GlobalLlmDefault {
    this.setPreference(GLOBAL_LLM_PROVIDER_KEY, provider)
    this.setPreference(GLOBAL_LLM_MODEL_KEY, modelName)
    return this.getGlobalLlmDefault()
  }

  getGenerationParams(): GenerationParams {
    const raw = this.getPreference(GENERATION_PARAMS_KEY)
    if (!raw) return { ...DEFAULT_GENERATION_PARAMS }
    try {
      const parsed = JSON.parse(raw) as Partial<GenerationParams>
      return {
        temperature: parsed.temperature ?? DEFAULT_GENERATION_PARAMS.temperature,
        maxTokens: parsed.maxTokens ?? DEFAULT_GENERATION_PARAMS.maxTokens,
        frequencyPenalty: parsed.frequencyPenalty ?? DEFAULT_GENERATION_PARAMS.frequencyPenalty,
        presencePenalty: parsed.presencePenalty ?? DEFAULT_GENERATION_PARAMS.presencePenalty,
        topP: parsed.topP ?? DEFAULT_GENERATION_PARAMS.topP
      }
    } catch {
      return { ...DEFAULT_GENERATION_PARAMS }
    }
  }

  setGenerationParams(params: Partial<GenerationParams>): GenerationParams {
    const current = this.getGenerationParams()
    const merged: GenerationParams = {
      temperature: params.temperature ?? current.temperature,
      maxTokens: params.maxTokens ?? current.maxTokens,
      frequencyPenalty: params.frequencyPenalty ?? current.frequencyPenalty,
      presencePenalty: params.presencePenalty ?? current.presencePenalty,
      topP: params.topP ?? current.topP
    }
    this.setPreference(GENERATION_PARAMS_KEY, JSON.stringify(merged))
    return merged
  }

  isOnboardingDone(): boolean {
    return this.get('onboarding_done') === '1'
  }

  setOnboardingDone(done: boolean): void {
    this.set('onboarding_done', done ? '1' : '0')
  }
}

export const appPreferenceDAO = new AppPreferenceDAO()
