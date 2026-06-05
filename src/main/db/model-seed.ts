import { modelConfigDAO } from './dao/model-config-dao'
import { BUILTIN_PROVIDERS } from '../../shared/model-providers'

export function seedModelConfigs(): void {
  try {
    if (modelConfigDAO.list().length > 0) return
    BUILTIN_PROVIDERS.forEach((p, i) => {
      modelConfigDAO.upsert(p.type, '', p.defaultBase, p.defaultModel, p.label, p.protocol)
      modelConfigDAO.setPriority(p.type, i + 1)
    })
  } catch (err) {
    console.error('[seedModelConfigs] failed:', err)
  }
}
