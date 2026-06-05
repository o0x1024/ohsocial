import axios from 'axios'
import type { ModelChatRequest, ModelChatResponse } from '../../shared/types/model'
import { PLATFORM_ADAPT_RULES, platformName } from '../platform/rules'
import type { PlatformId } from '../../shared/constants/platforms'
import { selectModelConfig } from './model-resolve'
import { openAICompatibleAuthHeaders } from '../../shared/mimo-api-params'
import {
  applyDeepSeekThinkingParams,
  isDeepSeekProvider,
  parseDeepSeekProviderOptions
} from '../../shared/deepseek-api-params'
import type { AiProgressEmitter } from './ai-progress'
import { personaDAO } from '../db/dao/persona-dao'
import { generationLogDAO } from '../db/dao/generation-log-dao'
import { llmLogger } from '../services/file-logger'
import { topicDAO } from '../db/dao/topic-dao'
import { hotspotDAO } from '../db/dao/hotspot-dao'

export interface StreamCallbacks {
  onDelta?: (delta: string) => void
  progress?: AiProgressEmitter
  deltaLegacy?: Record<string, unknown>
  signal?: AbortSignal
}

function emitStreamDelta(
  callbacks: StreamCallbacks | undefined,
  delta: string,
  kind: 'content' | 'thinking' = 'content'
): void {
  if (!delta) return
  callbacks?.progress?.delta(delta, kind, callbacks.deltaLegacy)
  if (kind === 'content') callbacks?.onDelta?.(delta)
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

/** 剥离模型嵌入正文中的思考块（如 …） */
function stripEmbeddedThinking(text: string): string {
  let result = text
  result = result.replace(/[\s\S]*?<\/think>/gi, '')
  result = result.replace(/[\s\S]*?<\/redacted_reasoning>/gi, '')
  const hasUnclosedThinking =
    (/^[\s\S]*$/i.test(result) && !/<\/think>/i.test(result)) ||
    (/^[\s\S]*$/i.test(result) && !/<\/redacted_reasoning>/i.test(result))
  if (hasUnclosedThinking) {
    result = ''
  }
  return result.trim()
}

const CONTENT_OUTPUT_STEPS = new Set([
  'content_generate',
  'content_rewrite',
  'platform_adapt',
  'title_generate',
  'material_tag',
  'topic_score',
  'topic_recommend',
  'schedule_suggest'
])

function applyProviderBodyParams(
  body: Record<string, unknown>,
  modelType: string,
  providerOptionsJson: string | null,
  step: string
): void {
  if (!isDeepSeekProvider(modelType)) return
  const opts = parseDeepSeekProviderOptions(providerOptionsJson)
  if (CONTENT_OUTPUT_STEPS.has(step)) {
    applyDeepSeekThinkingParams(body, { ...opts, thinkingEnabled: false })
  } else {
    applyDeepSeekThinkingParams(body, opts)
  }
}

function finalizeModelContent(raw: string): string {
  return stripEmbeddedThinking(raw)
}

export class ModelService {
  async chat(request: ModelChatRequest, callbacks?: StreamCallbacks): Promise<ModelChatResponse> {
    const config = selectModelConfig()
    if (!config) {
      return { success: false, content: '', error: '请先在设置中配置 AI 模型和 API Key' }
    }

    const started = Date.now()
    const baseUrl = config.apiBase
    const modelName = config.modelName
    const url = `${baseUrl}/chat/completions`
    const gen = config.generationParams

    const messages: Array<{ role: string; content: string }> = []
    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt })
    }
    messages.push({ role: 'user', content: request.prompt })

    const body: Record<string, unknown> = {
      model: modelName,
      messages,
      temperature: request.temperature ?? gen.temperature,
      max_tokens: request.maxTokens ?? gen.maxTokens,
      frequency_penalty: gen.frequencyPenalty,
      presence_penalty: gen.presencePenalty,
      top_p: gen.topP,
      stream: !!(callbacks?.onDelta || callbacks?.progress)
    }
    applyProviderBodyParams(body, config.modelType, config.providerOptionsJson, request.step)

    llmLogger.logRequest({
      step: request.step,
      provider: config.modelType,
      model: modelName,
      url,
      stream: !!(callbacks?.onDelta || callbacks?.progress),
      body
    })

    callbacks?.progress?.status('正在思考…')

    try {
      if (callbacks?.onDelta || callbacks?.progress) {
        const response = await axios.post(url, body, {
          headers: {
            ...openAICompatibleAuthHeaders(config.modelType, config.apiKey),
            'Content-Type': 'application/json'
          },
          responseType: 'stream',
          signal: callbacks.signal,
          timeout: 120_000
        })

        let content = ''
        let thinking = ''
        await new Promise<void>((resolve, reject) => {
          response.data.on('data', (chunk: Buffer) => {
            const lines = chunk.toString().split('\n').filter(l => l.startsWith('data: '))
            for (const line of lines) {
              const data = line.slice(6).trim()
              if (data === '[DONE]') continue
              try {
                const parsed = JSON.parse(data)
                const choice = parsed.choices?.[0]?.delta
                const thinkingDelta = (choice?.reasoning_content ?? choice?.reasoning ?? '') as string
                const delta = (choice?.content ?? '') as string
                if (thinkingDelta) {
                  thinking += thinkingDelta
                  emitStreamDelta(callbacks, thinkingDelta, 'thinking')
                }
                if (delta) {
                  content += delta
                  emitStreamDelta(callbacks, delta, 'content')
                }
              } catch {
                // ignore partial json
              }
            }
          })
          response.data.on('end', () => resolve())
          response.data.on('error', reject)
        })
        const finalContent = finalizeModelContent(content)
        this.logGeneration(request.step, config.modelType, modelName, started, true)
        llmLogger.logResponse({
          step: request.step,
          provider: config.modelType,
          model: modelName,
          durationMs: Date.now() - started,
          success: true,
          stream: true,
          content: finalContent,
          thinking: thinking || undefined
        })
        return { success: true, content: finalContent }
      }

      const response = await axios.post(url, { ...body, stream: false }, {
        headers: {
          ...openAICompatibleAuthHeaders(config.modelType, config.apiKey),
          'Content-Type': 'application/json'
        },
        signal: callbacks?.signal,
        timeout: 120_000
      })
      const message = response.data.choices?.[0]?.message
      const thinking = ((message?.reasoning_content ?? message?.reasoning ?? '') as string) || undefined
      const content = finalizeModelContent((message?.content ?? '') as string)
      this.logGeneration(request.step, config.modelType, modelName, started, true)
      llmLogger.logResponse({
        step: request.step,
        provider: config.modelType,
        model: modelName,
        durationMs: Date.now() - started,
        success: true,
        stream: false,
        content,
        thinking,
        usage: response.data.usage
      })
      return { success: true, content }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'AI 调用失败'
      this.logGeneration(request.step, config.modelType, modelName, started, false, msg)
      llmLogger.logResponse({
        step: request.step,
        provider: config.modelType,
        model: modelName,
        durationMs: Date.now() - started,
        success: false,
        stream: !!(callbacks?.onDelta || callbacks?.progress),
        error: msg
      })
      return { success: false, content: '', error: msg }
    }
  }

  private logGeneration(
    step: string,
    provider: string | undefined,
    modelName: string,
    started: number,
    ok: boolean,
    errorMessage?: string
  ) {
    try {
      generationLogDAO.log({
        step,
        modelProvider: provider,
        modelName,
        durationMs: Date.now() - started,
        status: ok ? 'success' : 'error',
        errorMessage
      })
    } catch {
      // ignore logging failures
    }
  }

  buildPersonaContext(): string {
    try {
      const p = personaDAO.get()
      const parts = [
        p.domains.length ? `领域：${p.domains.join('、')}` : '',
        p.audience ? `受众：${p.audience}` : '',
        p.style ? `风格：${p.style}` : '',
        p.personaDesc ? `人设：${p.personaDesc}` : ''
      ].filter(Boolean)
      return parts.join('\n')
    } catch {
      return ''
    }
  }

  async generateWriting(
    title: string,
    brief: string,
    callbacks?: StreamCallbacks
  ): Promise<ModelChatResponse> {
    const persona = this.buildPersonaContext()
    return this.chat({
      step: 'content_generate',
      systemPrompt: `你是自媒体写作助手。${persona ? `\n创作者定位：\n${persona}` : ''}\n请根据标题与要点独立完成一篇完整文章，由你全权代笔。直接输出正文（HTML 段落，用 <p> 标签），不要标题、不要解释、不要 markdown 代码块。`,
      prompt: `文章标题：${title}${brief ? `\n\n选题要点：\n${brief}` : ''}\n\n请撰写完整正文。`,
      temperature: 0.85,
      maxTokens: 8192
    }, callbacks)
  }

  async rewriteSelection(
    title: string,
    selectedText: string,
    instruction: string,
    callbacks?: StreamCallbacks
  ): Promise<ModelChatResponse> {
    const persona = this.buildPersonaContext()
    return this.chat({
      step: 'content_rewrite',
      systemPrompt: `你是自媒体写作助手。${persona ? `\n创作者定位：\n${persona}` : ''}\n按用户指令改写选中文本，只输出改写结果，不要解释。`,
      prompt: `文章标题：${title}\n选中文本：\n${selectedText}\n\n改写要求：${instruction || '换个说法'}`,
      temperature: 0.7
    }, callbacks)
  }

  async adaptToPlatform(
    title: string,
    bodyHtml: string,
    targetPlatform: string,
    callbacks?: StreamCallbacks
  ): Promise<ModelChatResponse> {
    const rules = PLATFORM_ADAPT_RULES[targetPlatform as PlatformId]
    if (!rules) {
      return { success: false, content: '', error: `不支持的平台：${targetPlatform}` }
    }
    const persona = this.buildPersonaContext()
    const plain = stripHtml(bodyHtml)
    return this.chat({
      step: 'platform_adapt',
      systemPrompt: `你是自媒体多平台内容改写专家。${persona ? `\n创作者定位：\n${persona}` : ''}\n只输出改写后的正文（HTML 用 <p> 标签），不要解释。`,
      prompt: `将以下内容改写为【${platformName(targetPlatform)}】版本。

改写规则：
${rules}

原文标题：${title}

原文正文：
${plain}`,
      temperature: 0.75,
      maxTokens: 8192
    }, callbacks)
  }

  async recommendTopics(count = 5, callbacks?: StreamCallbacks): Promise<ModelChatResponse> {
    const persona = this.buildPersonaContext()
    const hotspots = hotspotDAO.list(10).map(h => h.title).join('、')
    const existing = topicDAO.list().slice(0, 15).map(t => t.title).join('、')
    return this.chat({
      step: 'topic_recommend',
      systemPrompt: `你是自媒体选题策划。${persona ? `\n创作者：\n${persona}` : ''}\n输出 JSON 数组，每项含 title、description、domain 字段，不要 markdown 代码块。`,
      prompt: `请推荐 ${count} 个新选题。${hotspots ? `\n近期热点：${hotspots}` : ''}${existing ? `\n已有选题（避免重复）：${existing}` : ''}`,
      temperature: 0.85
    }, callbacks)
  }

  async scoreTopic(title: string, description: string, callbacks?: StreamCallbacks): Promise<ModelChatResponse> {
    const persona = this.buildPersonaContext()
    return this.chat({
      step: 'topic_score',
      systemPrompt: `你是选题评估专家。${persona ? `\n创作者：\n${persona}` : ''}\n输出 JSON：{"score":0-100,"reason":"..."}`,
      prompt: `评估选题：\n标题：${title}\n描述：${description || '无'}`,
      temperature: 0.5
    }, callbacks)
  }

  async suggestSchedule(weekSummary: string, callbacks?: StreamCallbacks): Promise<ModelChatResponse> {
    const persona = this.buildPersonaContext()
    return this.chat({
      step: 'schedule_suggest',
      systemPrompt: `你是内容排期顾问。${persona ? `\n创作者：\n${persona}` : ''}\n给出本周排期建议（Markdown 列表，含日期、平台、内容类型）。`,
      prompt: `当前排期概况：\n${weekSummary || '暂无排期'}`,
      temperature: 0.7
    }, callbacks)
  }

  async tagMaterial(title: string, description: string, callbacks?: StreamCallbacks): Promise<ModelChatResponse> {
    return this.chat({
      step: 'material_tag',
      systemPrompt: '为素材打标签。输出 JSON 数组 tags，3-6 个中文标签。',
      prompt: `标题：${title}\n描述/路径：${description}`,
      temperature: 0.4
    }, callbacks)
  }

  async generateTitles(bodyPlain: string, callbacks?: StreamCallbacks): Promise<ModelChatResponse> {
    const persona = this.buildPersonaContext()
    return this.chat({
      step: 'title_generate',
      systemPrompt: `你是标题专家。${persona ? `\n创作者：\n${persona}` : ''}\n输出 5 个标题，每行一个，不要编号说明。`,
      prompt: `正文摘要：\n${bodyPlain.slice(0, 1500)}`,
      temperature: 0.9
    }, callbacks)
  }
}

export const modelService = new ModelService()
