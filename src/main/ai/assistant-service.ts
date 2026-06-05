import axios from 'axios'
import { selectModelConfig } from './model-resolve'
import { openAICompatibleAuthHeaders } from '../../shared/mimo-api-params'
import { assistantDAO } from '../db/dao/assistant-dao'
import { executeTool, TOOL_SCHEMAS } from '../tools/executor'
import { getSkill, BUILTIN_SKILLS } from '../../shared/skills'
import { personaDAO } from '../db/dao/persona-dao'
import { customSkillDAO } from '../db/dao/custom-skill-dao'
import type { AiProgressEmitter } from './ai-progress'
import { llmLogger } from '../services/file-logger'

function resolveSkill(skillId?: string) {
  if (!skillId) return undefined
  const builtin = getSkill(skillId)
  if (builtin) return builtin
  const custom = customSkillDAO.list().find(s => s.skillId === skillId && s.isEnabled)
  if (custom) {
    return {
      id: custom.skillId,
      name: custom.name,
      description: custom.description,
      systemPrompt: custom.content
    }
  }
  return undefined
}

export function listAllSkills() {
  const custom = customSkillDAO.list().filter(s => s.isEnabled).map(s => ({
    id: s.skillId,
    name: s.name,
    description: s.description,
    systemPrompt: s.content
  }))
  return [...BUILTIN_SKILLS, ...custom]
}

const MAX_TOOL_ROUNDS = 6

export class AssistantService {
  async sendMessage(
    conversationId: number,
    userText: string,
    skillId?: string,
    onDelta?: (delta: string) => void,
    progress?: AiProgressEmitter
  ): Promise<{ success: boolean; content: string; error?: string }> {
    const config = selectModelConfig()
    if (!config) {
      return { success: false, content: '', error: '请先在设置中配置 AI 模型' }
    }

    assistantDAO.addMessage(conversationId, 'user', userText)

    const msgs = assistantDAO.listMessages(conversationId)
    if (msgs.length === 1) {
      const title = userText.slice(0, 30) + (userText.length > 30 ? '…' : '')
      assistantDAO.updateTitle(conversationId, title)
    }

    const skill = resolveSkill(skillId)
    let personaCtx = ''
    try {
      const p = personaDAO.get()
      personaCtx = `领域：${p.domains.join('、')}\n受众：${p.audience}\n风格：${p.style}`
    } catch {
      // ignore
    }

    const systemParts = [
      '你是 OhSocial 自媒体运营 AI 助手，帮助用户选题、调研和规划内容。',
      personaCtx ? `创作者定位：\n${personaCtx}` : '',
      skill?.systemPrompt ?? '可使用工具查询本地选题、内容，并帮助创建选题。'
    ].filter(Boolean)

    const apiMessages: Array<Record<string, unknown>> = [
      { role: 'system', content: systemParts.join('\n\n') },
      ...assistantDAO.toApiMessages(conversationId)
    ]

    const baseUrl = config.apiBase
    const modelName = config.modelName
    const gen = config.generationParams

    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      progress?.status(round === 0 ? '正在思考…' : '正在根据工具结果继续推理…')
      const body: Record<string, unknown> = {
        model: modelName,
        messages: apiMessages,
        tools: TOOL_SCHEMAS,
        tool_choice: 'auto',
        temperature: gen.temperature,
        max_tokens: gen.maxTokens,
        frequency_penalty: gen.frequencyPenalty,
        presence_penalty: gen.presencePenalty,
        top_p: gen.topP,
        stream: false
      }

      const started = Date.now()
      const url = `${baseUrl}/chat/completions`
      llmLogger.logRequest({
        step: 'assistant_chat',
        provider: config.modelType,
        model: modelName,
        url,
        stream: false,
        body,
        meta: { conversationId, round }
      })

      try {
        const response = await axios.post(url, body, {
          headers: {
            ...openAICompatibleAuthHeaders(config.modelType, config.apiKey),
            'Content-Type': 'application/json'
          },
          timeout: 120_000
        })

        const choice = response.data.choices?.[0]
        const message = choice?.message

        if (message?.tool_calls?.length) {
          llmLogger.logResponse({
            step: 'assistant_chat',
            provider: config.modelType,
            model: modelName,
            durationMs: Date.now() - started,
            success: true,
            stream: false,
            content: message.content ?? '',
            meta: {
              conversationId,
              round,
              toolCalls: message.tool_calls.map((tc: { function: { name: string } }) => tc.function.name)
            }
          })
          apiMessages.push({
            role: 'assistant',
            content: message.content ?? null,
            tool_calls: message.tool_calls
          })
          assistantDAO.addMessage(conversationId, 'assistant', message.content ?? '', {
            toolCalls: message.tool_calls
          })

          for (const tc of message.tool_calls) {
            const fn = tc.function
            progress?.status(`调用工具：${fn.name}`)
            const args = JSON.parse(fn.arguments || '{}')
            const result = await executeTool(fn.name, args)
            const resultStr = JSON.stringify(result, null, 2)
            apiMessages.push({
              role: 'tool',
              tool_call_id: tc.id,
              content: resultStr
            })
            assistantDAO.addMessage(conversationId, 'tool', resultStr, {
              toolCallId: tc.id,
              toolName: fn.name
            })
          }
          continue
        }

        const content = message?.content ?? ''
        llmLogger.logResponse({
          step: 'assistant_chat',
          provider: config.modelType,
          model: modelName,
          durationMs: Date.now() - started,
          success: true,
          stream: false,
          content,
          usage: response.data.usage,
          meta: { conversationId, round }
        })
        assistantDAO.addMessage(conversationId, 'assistant', content)
        if (content) {
          progress?.delta(content, 'content', { conversationId, mode: 'assistant' })
          onDelta?.(content)
        }
        return { success: true, content }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : '助手调用失败'
        llmLogger.logResponse({
          step: 'assistant_chat',
          provider: config.modelType,
          model: modelName,
          durationMs: Date.now() - started,
          success: false,
          stream: false,
          error: msg,
          meta: { conversationId, round }
        })
        return { success: false, content: '', error: msg }
      }
    }

    return { success: false, content: '', error: '工具调用轮次过多' }
  }
}

export const assistantService = new AssistantService()
