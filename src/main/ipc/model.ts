import { ipcMain } from 'electron'
import { modelConfigDAO } from '../db/dao/model-config-dao'
import { appPreferenceDAO } from '../db/dao/app-preference-dao'
import { fetchProviderModelCatalog } from '../context/model-catalog'
import {
  defaultBaseForProtocol,
  defaultModelForProtocol,
  generateCustomProviderId,
  type ProviderProtocol
} from '../../shared/model-providers'

export function registerModelHandlers(): void {
  ipcMain.handle('model:list', () => modelConfigDAO.list())
  ipcMain.handle('model:hasEnabled', () => modelConfigDAO.hasEnabled())

  ipcMain.handle(
    'model:upsert',
    (
      _e,
      type: string,
      apiKey: string,
      apiBase?: string,
      modelName?: string,
      displayName?: string | null,
      providerProtocol?: string | null
    ) => {
      modelConfigDAO.upsert(type, apiKey, apiBase, modelName, displayName ?? null, providerProtocol ?? null)
    }
  )

  ipcMain.handle(
    'model:createCustom',
    (_e, displayName: string, providerProtocol: string, apiKey?: string, apiBase?: string, modelName?: string) => {
      const modelType = generateCustomProviderId()
      const protocol = providerProtocol as ProviderProtocol
      modelConfigDAO.createCustom(
        modelType,
        displayName.trim(),
        protocol,
        apiKey?.trim() ?? '',
        apiBase?.trim() || defaultBaseForProtocol(protocol),
        modelName?.trim() || defaultModelForProtocol(protocol)
      )
      return modelType
    }
  )

  ipcMain.handle('model:setEnabled', (_e, type: string, enabled: boolean) =>
    modelConfigDAO.setEnabled(type, enabled)
  )
  ipcMain.handle('model:setPriority', (_e, type: string, priority: number) =>
    modelConfigDAO.setPriority(type, priority)
  )
  ipcMain.handle('model:delete', (_e, type: string) => modelConfigDAO.delete(type))
  ipcMain.handle('model:setMaxContextTokens', (_e, type: string, tokens: number) =>
    modelConfigDAO.setMaxContextTokens(type, tokens)
  )
  ipcMain.handle('model:setProviderOptions', (_e, type: string, optionsJson: string | null) =>
    modelConfigDAO.setProviderOptions(type, optionsJson)
  )

  ipcMain.handle('model:getGlobalDefault', () => appPreferenceDAO.getGlobalLlmDefault())
  ipcMain.handle('model:setGlobalDefault', (_e, provider: string | null, modelName: string | null) =>
    appPreferenceDAO.setGlobalLlmDefault(provider, modelName)
  )
  ipcMain.handle('model:getGenerationParams', () => appPreferenceDAO.getGenerationParams())
  ipcMain.handle('model:setGenerationParams', (_e, params: Record<string, number>) =>
    appPreferenceDAO.setGenerationParams(params)
  )

  ipcMain.handle('model:refreshCatalog', async (_e, modelType: string) => {
    const config = modelConfigDAO.getByType(modelType)
    if (!config?.api_key) {
      throw new Error('请先配置 API Key')
    }
    const models = await fetchProviderModelCatalog(
      modelType,
      config.api_key,
      config.api_base,
      config.provider_protocol
    )
    if (!models.length) {
      throw new Error('未获取到任何模型')
    }
    modelConfigDAO.setAvailableModels(modelType, models)
    if (config.model_name && !models.includes(config.model_name)) {
      modelConfigDAO.upsert(modelType, config.api_key, config.api_base ?? undefined, models[0])
    }
    return models
  })
}
