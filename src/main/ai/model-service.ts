import axios from 'axios'
import type { ModelChatRequest, ModelChatResponse } from '../../shared/types/model'
import { getPlatformAdaptRules, platformName } from '../platform/rules'
import { selectModelConfig } from './model-resolve'
import { openAICompatibleAuthHeaders } from '../../shared/mimo-api-params'
import {
  applyDeepSeekThinkingParams,
  isDeepSeekProvider,
  parseDeepSeekProviderOptions
} from '../../shared/deepseek-api-params'
import type { AiProgressEmitter } from './ai-progress'
import { generationLogDAO } from '../db/dao/generation-log-dao'
import { llmLogger } from '../services/file-logger'
import { topicDAO } from '../db/dao/topic-dao'
import { platformAccountDAO } from '../db/dao/platform-account-dao'
import { writingStyleDAO } from '../db/dao/writing-style-dao'
import { hotspotDAO } from '../db/dao/hotspot-dao'
import type { WritingStyleDimensions } from '../../shared/types/writing-style'
import type { StyleStepRules } from '../../shared/style-step-rules'

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

/** 部分模型 SSE 返回累积全文而非增量，需剥离已接收前缀避免重复追加 */
function takeStreamIncrement(accumulated: string, incoming: string): string {
  if (!incoming) return ''
  if (!accumulated) return incoming
  if (incoming.startsWith(accumulated)) return incoming.slice(accumulated.length)
  return incoming
}

function parseSseDataLines(buffer: string): { lines: string[]; rest: string } {
  const parts = buffer.split('\n')
  const rest = parts.pop() ?? ''
  const lines = parts.filter(l => l.startsWith('data: '))
  return { lines, rest }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

/** 剥离模型嵌入正文中的思考块 */
function stripEmbeddedThinking(text: string): string {
  const thinkOpen = '<' + 'think' + '>'
  const thinkClose = '<' + '/' + 'think' + '>'
  let result = text
  result = result.replace(new RegExp(thinkOpen + '[\\s\\S]*?' + thinkClose, 'gi'), '')
  result = result.replace(/<redacted_reasoning>[\s\S]*?<\/redacted_reasoning>/gi, '')
  if (new RegExp('^' + thinkOpen + '[\\s\\S]*$', 'i').test(result) && !new RegExp(thinkClose, 'i').test(result)) {
    result = ''
  } else if (/^<redacted_reasoning>[\s\S]*$/i.test(result) && !/<\/redacted_reasoning>/i.test(result)) {
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
  'schedule_suggest',
  'script_generate'
])

function applyProviderBodyParams(
  body: Record<string, unknown>,
  modelType: string,
  providerOptionsJson: string | null,
  step: string
): void {
  if (CONTENT_OUTPUT_STEPS.has(step)) {
    // 豆包/DeepSeek 等思考模型：正文产出步骤关闭 thinking，避免正文只出现在 reasoning_content
    body.thinking = { type: 'disabled' }
    if (isDeepSeekProvider(modelType)) {
      const opts = parseDeepSeekProviderOptions(providerOptionsJson)
      applyDeepSeekThinkingParams(body, { ...opts, thinkingEnabled: false })
    }
    return
  }
  if (isDeepSeekProvider(modelType)) {
    const opts = parseDeepSeekProviderOptions(providerOptionsJson)
    applyDeepSeekThinkingParams(body, opts)
  }
}

function finalizeModelContent(raw: string): string {
  return stripEmbeddedThinking(raw)
}

function resolveOutputContent(step: string, content: string, thinking: string): string {
  const finalized = finalizeModelContent(content)
  if (finalized || !CONTENT_OUTPUT_STEPS.has(step)) return finalized
  return finalizeModelContent(thinking)
}

function extractStreamParts(choice: Record<string, unknown> | undefined): {
  thinkingRaw: string
  contentRaw: string
} {
  const delta = choice?.delta as Record<string, unknown> | undefined
  const message = choice?.message as Record<string, unknown> | undefined
  const thinkingRaw = String(
    delta?.reasoning_content ?? delta?.reasoning ?? message?.reasoning_content ?? message?.reasoning ?? ''
  )
  const contentRaw = String(delta?.content ?? message?.content ?? '')
  return { thinkingRaw, contentRaw }
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
        let sseBuffer = ''
        await new Promise<void>((resolve, reject) => {
          response.data.on('data', (chunk: Buffer) => {
            sseBuffer += chunk.toString()
            const { lines, rest } = parseSseDataLines(sseBuffer)
            sseBuffer = rest
            for (const line of lines) {
              const data = line.slice(6).trim()
              if (data === '[DONE]') continue
              try {
                const parsed = JSON.parse(data)
                const { thinkingRaw, contentRaw } = extractStreamParts(parsed.choices?.[0])
                const thinkingDelta = takeStreamIncrement(thinking, thinkingRaw)
                const delta = takeStreamIncrement(content, contentRaw)
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
        const finalContent = resolveOutputContent(request.step, content, thinking)
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
      const thinking = ((message?.reasoning_content ?? message?.reasoning ?? '') as string) || ''
      const content = resolveOutputContent(request.step, (message?.content ?? '') as string, thinking)
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

  buildWritingStyleContext(styleId?: number | null): string {
    if (!styleId) return ''
    try {
      const style = writingStyleDAO.getById(styleId)
      if (!style) return ''
      const parts = [
        `【文风：${style.name}】`,
        style.description ? `说明：${style.description}` : '',
        style.promptTemplate ? `写作要求：\n${style.promptTemplate}` : '',
        this.buildDimensionsContext(style.dimensions),
        this.buildStepRulesContext(style.stepRules),
        style.referenceText
          ? `参考范文（请模仿其语气、节奏与表达方式，不要照抄）：\n${style.referenceText.slice(0, 4000)}`
          : ''
      ].filter(Boolean)
      return parts.join('\n\n')
    } catch {
      return ''
    }
  }

  private buildDimensionsContext(dimensions?: WritingStyleDimensions): string {
    if (!dimensions) return ''
    const lines: string[] = []
    if (dimensions.sentenceRhythm) lines.push(`句式节奏：${dimensions.sentenceRhythm}`)
    if (dimensions.dialogueStyle) lines.push(`对话风格：${dimensions.dialogueStyle}`)
    if (dimensions.narrativeDistance) lines.push(`叙事距离：${dimensions.narrativeDistance}`)
    if (dimensions.rhetoricPrefs?.length) lines.push(`修辞偏好：${dimensions.rhetoricPrefs.join('、')}`)
    if (dimensions.pacing) lines.push(`行文节奏：${dimensions.pacing}`)
    if (dimensions.vocabularyNotes) lines.push(`用词特征：${dimensions.vocabularyNotes}`)
    if (dimensions.taboos?.length) lines.push(`禁忌用词/表达：${dimensions.taboos.join('、')}`)
    return lines.length ? `文风维度指标：\n${lines.join('\n')}` : ''
  }

  private buildStepRulesContext(stepRules?: StyleStepRules | null): string {
    if (!stepRules) return ''
    const lines: string[] = []
    if (stepRules.identity?.emotional_core?.length) {
      lines.push(`情感内核：${stepRules.identity.emotional_core.join('、')}`)
    }
    if (stepRules.decision_rules?.length) {
      lines.push(`写作决策规则：\n${stepRules.decision_rules.map(r => `- ${r}`).join('\n')}`)
    }
    if (stepRules.quality_checklist?.length) {
      lines.push(`质量自检清单：\n${stepRules.quality_checklist.map(r => `- ${r}`).join('\n')}`)
    }
    return lines.length ? `文风高级规则：\n${lines.join('\n\n')}` : ''
  }

  async generateWriting(
    title: string,
    brief: string,
    callbacks?: StreamCallbacks,
    writingStyleId?: number | null,
    platformIds: string[] = []
  ): Promise<ModelChatResponse> {
    const styleCtx = this.buildWritingStyleContext(writingStyleId)
    const platformCtx = this.buildPlatformsContext(platformIds)
    const personaHint = this.hasConfiguredPersona(platformIds)
      ? '\n写作时必须代入上述创作人设的视角、专业背景与表达口吻。'
      : ''
    const formatRules = `
排版规则（必须严格遵守）：
1. 使用丰富的 HTML 标签构建层次：<h2> 小节标题、<p> 正文段落、<strong> 关键词/重点句、<blockquote> 金句或引言、<ul>/<ol> 要点列举
2. 每 3-5 个段落设置一个 <h2> 小节标题，让文章有清晰的结构感
3. 段落精炼：每段 2-4 句话，避免大段堆砌
4. 适当使用 <strong> 标注核心观点和关键信息（每段最多 1-2 处）
5. 列举要点时用 <ul><li> 或 <ol><li>，不要用纯文字罗列
6. 精彩金句或引言使用 <blockquote> 包裹
7. 直接输出 HTML 正文，不要输出文章大标题、不要解释、不要 markdown 代码块`
    return this.chat({
      step: 'content_generate',
      systemPrompt: `你是自媒体写作助手。${platformCtx ? `\n${platformCtx}` : ''}${personaHint}${styleCtx ? `\n\n${styleCtx}` : ''}\n请严格遵循上述文风要求，根据标题与要点独立完成一篇完整文章，由你全权代笔。\n${formatRules}`,
      prompt: `文章标题：${title}${brief ? `\n\n选题要点：\n${brief}` : ''}\n\n请撰写完整正文。`,
      temperature: 0.85,
      maxTokens: 8192
    }, callbacks)
  }

  async rewriteSelection(
    title: string,
    selectedText: string,
    instruction: string,
    callbacks?: StreamCallbacks,
    writingStyleId?: number | null,
    platformIds: string[] = []
  ): Promise<ModelChatResponse> {
    const styleCtx = this.buildWritingStyleContext(writingStyleId)
    const platformCtx = this.buildPlatformsContext(platformIds)
    const personaHint = this.hasConfiguredPersona(platformIds)
      ? '\n改写时保持上述创作人设的视角与口吻。'
      : ''
    return this.chat({
      step: 'content_rewrite',
      systemPrompt: `你是自媒体写作助手。${platformCtx ? `\n${platformCtx}` : ''}${personaHint}${styleCtx ? `\n\n${styleCtx}` : ''}\n按用户指令改写选中文本，保留 HTML 排版标签（<p>、<strong>、<blockquote>、<ul> 等），只输出改写结果，不要解释。`,
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
    const rules = getPlatformAdaptRules(targetPlatform)
    const platformCtx = this.buildPlatformContext(targetPlatform)
    const plain = stripHtml(bodyHtml)
    return this.chat({
      step: 'platform_adapt',
      systemPrompt: `你是自媒体多平台内容改写专家。${platformCtx}\n只输出改写后的正文（使用丰富 HTML 标签：<p> 段落、<h2> 小节标题、<strong> 强调、<blockquote> 金句、<ul>/<ol> 列表），不要解释。`,
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

  private hasConfiguredPersona(platformIds: string[]): boolean {
    return platformIds.some(id => {
      const account = platformAccountDAO.getByPlatform(id)
      return Boolean(account?.authorPersona?.trim())
    })
  }

  private buildPlatformsContext(platformIds: string[]): string {
    const ids = [...new Set(platformIds.filter(Boolean))]
    if (ids.length === 0) return ''
    return ids
      .map(id => this.buildPlatformContext(id).trim())
      .filter(Boolean)
      .join('\n\n')
  }

  private buildPlatformContext(platformId?: string): string {
    if (!platformId) return ''
    const account = platformAccountDAO.getByPlatform(platformId)
    if (!account) {
      return `\n目标平台：${platformName(platformId)}`
    }
    const keywords = account.contentKeywords.length ? account.contentKeywords.join('、') : '未配置'
    const persona = account.authorPersona?.trim() || '未配置'
    return `
目标平台：${platformName(platformId)}
内容领域：${account.contentDomain || '未配置'}
领域关键词：${keywords}
运营方向：${account.contentBrief || '未配置'}
创作人设：${persona}`
  }

  async recommendTopics(
    count = 5,
    callbacks?: StreamCallbacks,
    platformId?: string
  ): Promise<ModelChatResponse> {
    const platformContext = this.buildPlatformContext(platformId)
    const hotspots = hotspotDAO.list(10).map(h => h.title).join('、')
    const existing = topicDAO
      .list(platformId ? { platform: platformId } : undefined)
      .slice(0, 15)
      .map(t => t.title)
      .join('、')
    const platformFields = platformId
      ? 'title、description、domain 字段'
      : 'title、description、domain、targetPlatforms（平台 id 数组，如 ["wechat"]）字段'
    return this.chat({
      step: 'topic_recommend',
      systemPrompt: `你是自媒体选题策划。${platformContext}\n输出 JSON 数组，每项含 ${platformFields}，不要 markdown 代码块。`,
      prompt: `请推荐 ${count} 个新选题。${platformId ? `\n选题必须适合【${platformName(platformId)}】平台及其内容领域。` : ''}${hotspots ? `\n近期热点：${hotspots}` : ''}${existing ? `\n已有选题（避免重复）：${existing}` : ''}`,
      temperature: 0.85
    }, callbacks)
  }

  async scoreTopic(
    title: string,
    description: string,
    callbacks?: StreamCallbacks,
    targetPlatforms: string[] = []
  ): Promise<ModelChatResponse> {
    let platformContext = ''
    if (targetPlatforms.length > 0) {
      const parts = targetPlatforms.map(id => {
        const account = platformAccountDAO.getByPlatform(id)
        if (!account) return `${platformName(id)}：未配置内容领域`
        const persona = account.authorPersona?.trim()
        const personaPart = persona ? `；人设：${persona}` : ''
        return `${platformName(id)}：${account.contentDomain || '未配置领域'}（${account.contentBrief || '无运营说明'}${personaPart}）`
      })
      platformContext = `\n目标平台及领域定位：\n${parts.join('\n')}`
    }
    return this.chat({
      step: 'topic_score',
      systemPrompt: `你是选题评估专家。评估时重点考虑选题与目标平台内容领域的匹配度。输出 JSON：{"score":0-100,"reason":"..."}`,
      prompt: `评估选题：\n标题：${title}\n描述：${description || '无'}${platformContext}`,
      temperature: 0.5
    }, callbacks)
  }

  async suggestSchedule(weekSummary: string, callbacks?: StreamCallbacks): Promise<ModelChatResponse> {
    return this.chat({
      step: 'schedule_suggest',
      systemPrompt: '你是内容排期顾问。给出本周排期建议（Markdown 列表，含日期、平台、内容类型）。',
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
    return this.chat({
      step: 'title_generate',
      systemPrompt: '你是标题专家。输出 5 个标题，每行一个，不要编号说明。',
      prompt: `正文摘要：\n${bodyPlain.slice(0, 1500)}`,
      temperature: 0.9
    }, callbacks)
  }
}

export const modelService = new ModelService()
