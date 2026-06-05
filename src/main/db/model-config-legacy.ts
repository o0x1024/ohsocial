import type Database from 'better-sqlite3'

export interface ModelConfigLegacyColumns {
  provider: boolean
  name: boolean
  baseUrl: boolean
  params: boolean
  isDefault: boolean
}

let cached: ModelConfigLegacyColumns | null = null

export function getModelConfigLegacyColumns(db: Database.Database): ModelConfigLegacyColumns {
  if (cached) return cached
  const names = new Set(
    db.prepare('PRAGMA table_info(model_configs)').all().map((c: { name: string }) => c.name)
  )
  cached = {
    provider: names.has('provider'),
    name: names.has('name'),
    baseUrl: names.has('base_url'),
    params: names.has('params'),
    isDefault: names.has('is_default')
  }
  return cached
}

export function resetModelConfigLegacyCache(): void {
  cached = null
}
