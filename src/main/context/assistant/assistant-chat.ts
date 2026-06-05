import type { WebContents } from 'electron'
import { assistantConversationDAO } from '../../db/dao/assistant-conversation-dao'
import { assistantDocumentDAO } from '../../db/dao/assistant-document-dao'
import { assistantMessageDAO } from '../../db/dao/assistant-message-dao'
import { resolveAssistantGlobalRoleId } from './global-role'
import { assistantRoleDAO } from '../../db/dao/assistant-role-dao'
import { executeTool, TOOL_SCHEMAS } from '../../tools/executor'
import { sampleDocumentText } from './document-sampling'
import {
  buildContentReferenceContext,
  buildContentReferenceMetadata
} from './content-reference'
import type { AssistantWorkReference } from '../../../shared/assistant-types'
import axios from 'axios'
import { modelConfigDAO } from '../../db/dao/model-config-dao'
import { llmLogger } from '../../services/file-logger'

const activeChats = new Map<number, AbortController>()

function resolveRole() {
  const roleId = resolveAssistantGlobalRoleId()
  if (roleId) {
    const role = assistantRoleDAO.getById(roleId)
    if (role) return role
  }
  return {
    system_prompt:
      '你是 OhSocial 自媒体运营 AI 助手，帮助用户选题、调研和规划内容。可使用工具查询本地选题、内容与素材。',
    analysis_rules_json: null as string | null,
    capabilities_json: null as string | null
  }
}

function buildDocumentContext(documentIds: number[]): string {
  const parts: string[] = []
  for (const docId of documentIds) {
    const doc = assistantDocumentDAO.getById(docId)
    if (!doc?.content_text?.trim()) continue
    parts.push(sampleDocumentText(doc.content_text))
  }
  return parts.join('\n\n')
}

function buildReferenceContext(documentIds: number[], workRefs: AssistantWorkReference[]): string {
  return [buildDocumentContext(documentIds), buildContentReferenceContext(workRefs)]
    .filter(Boolean)
    .join('\n\n')
    .trim()
}

function buildUserPrompt(
  history: { role: string; content: string }[],
  userText: string,
  refContext: string
): string {
  const historyLines = history
    .filter(m => m.content.trim())
    .map(m => `${m.role === 'user' ? '用户' : '助手'}：${m.content}`)
  return [
    historyLines.length ? `【对话历史】\n${historyLines.join('\n\n')}` : '',
    refContext
      ? `【当前消息】\n${userText}\n\n【引用上下文】\n${refContext}`
      : `【当前消息】\n${userText}`
  ]
    .filter(Boolean)
    .join('\n\n')
}

async function streamChat(
  sender: WebContents,
  conversationId: number,
  assistantMessageId: number,
  systemPrompt: string,
  userPrompt: string,
  modelType?: string | null,
  modelName?: string | null,
  signal?: AbortSignal
): Promise<string> {
  const config = modelType
    ? modelConfigDAO.getByType(modelType)
    : modelConfigDAO.getPrimary()
  if (!config?.api_key) throw new Error('请先在设置中配置 AI 模型和 API Key')

  const baseUrl = (config.api_base ?? 'https://api.openai.com/v1').replace(/\/$/, '')
  const resolvedModel = modelName ?? config.model_name ?? 'gpt-4o-mini'
  const messages: Array<Record<string, unknown>> = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userPrompt }
  ]

  let fullContent = ''
  for (let round = 0; round < 6; round++) {
    const started = Date.now()
    const url = `${baseUrl}/chat/completions`
    const body = {
      model: resolvedModel,
      messages,
      tools: TOOL_SCHEMAS,
      tool_choice: 'auto',
      temperature: 0.7,
      max_tokens: 4096,
      stream: false
    }
    llmLogger.logRequest({
      step: 'assistant_stream_chat',
      provider: config.model_type,
      model: resolvedModel,
      url,
      stream: false,
      body,
      meta: { conversationId, round }
    })

    const response = await axios.post(url, body, {
      headers: {
        Authorization: `Bearer ${config.api_key}`,
        'Content-Type': 'application/json'
      },
      signal,
      timeout: 120_000
    })

    const message = response.data.choices?.[0]?.message
    if (message?.tool_calls?.length) {
      llmLogger.logResponse({
        step: 'assistant_stream_chat',
        provider: config.model_type,
        model: resolvedModel,
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
      messages.push({
        role: 'assistant',
        content: message.content ?? null,
        tool_calls: message.tool_calls
      })
      for (const tc of message.tool_calls as Array<{
        id: string
        function: { name: string; arguments: string }
      }>) {
        const args = JSON.parse(tc.function.arguments || '{}')
        const result = await executeTool(tc.function.name, args)
        messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(result, null, 2) })
      }
      continue
    }

    fullContent = message?.content ?? ''
    llmLogger.logResponse({
      step: 'assistant_stream_chat',
      provider: config.model_type,
      model: resolvedModel,
      durationMs: Date.now() - started,
      success: true,
      stream: false,
      content: fullContent,
      usage: response.data.usage,
      meta: { conversationId, round }
    })
    assistantMessageDAO.updateContent(assistantMessageId, fullContent)
    const chunkSize = 24
    for (let i = 0; i < fullContent.length; i += chunkSize) {
      const delta = fullContent.slice(i, i + chunkSize)
      sender.send('assistant:delta', {
        conversationId,
        messageId: assistantMessageId,
        delta,
        content: fullContent.slice(0, i + delta.length)
      })
    }
    return fullContent
  }
  return fullContent
}

export async function runAssistantChat(
  sender: WebContents,
  conversationId: number,
  userText: string,
  documentIds: number[] = [],
  workReferences: AssistantWorkReference[] = []
): Promise<{ userMessageId: number; assistantMessageId: number }> {
  activeChats.get(conversationId)?.abort()
  const controller = new AbortController()
  activeChats.set(conversationId, controller)

  const conv = assistantConversationDAO.getById(conversationId)
  if (!conv) throw new Error('会话不存在')
  const trimmed = userText.trim()
  if (!trimmed) throw new Error('消息不能为空')

  const role = resolveRole()
  const refMeta = buildContentReferenceMetadata(workReferences)
  const meta = {
    ...(refMeta ?? {}),
    ...(documentIds.length ? { documentIds } : {})
  }
  const userMessageId = assistantMessageDAO.create({
    conversation_id: conversationId,
    role: 'user',
    content: trimmed,
    message_type: documentIds.length || workReferences.length ? 'attachment' : 'text',
    metadata_json: Object.keys(meta).length ? JSON.stringify(meta) : null
  })

  const refContext = buildReferenceContext(documentIds, workReferences)
  const rules: string[] = role.analysis_rules_json ? JSON.parse(role.analysis_rules_json) : []
  const systemPrompt = [
    role.system_prompt,
    rules.length ? `\n【规则】\n${rules.map(r => `- ${r}`).join('\n')}` : ''
  ].join('')

  const assistantMessageId = assistantMessageDAO.create({
    conversation_id: conversationId,
    role: 'assistant',
    content: '',
    message_type: 'text',
    metadata_json: null
  })

  const prior = assistantMessageDAO.listByConversation(conversationId).filter(
    m => m.id !== userMessageId && m.id !== assistantMessageId
  )
  const userPrompt = buildUserPrompt(prior, trimmed, refContext)

  try {
    const fullContent = await streamChat(
      sender,
      conversationId,
      assistantMessageId,
      systemPrompt,
      userPrompt,
      conv.model_type,
      conv.model_name,
      controller.signal
    )
    assistantMessageDAO.updateContent(assistantMessageId, fullContent || '（无回复）')
    assistantConversationDAO.touch(conversationId)
    if (conv.title === '新对话' && trimmed) {
      assistantConversationDAO.updateTitle(conversationId, trimmed.slice(0, 40))
    }
    sender.send('assistant:chat-end', {
      conversationId,
      messageId: assistantMessageId,
      success: true
    })
    return { userMessageId, assistantMessageId }
  } catch (err) {
    const msg = err instanceof Error ? err.message : '对话失败'
    assistantMessageDAO.updateContent(assistantMessageId, `（失败：${msg}）`)
    sender.send('assistant:chat-end', {
      conversationId,
      messageId: assistantMessageId,
      success: false,
      error: msg
    })
    throw err
  } finally {
    activeChats.delete(conversationId)
  }
}

export function cancelAssistantChat(conversationId: number): boolean {
  const c = activeChats.get(conversationId)
  if (!c) return false
  c.abort()
  activeChats.delete(conversationId)
  return true
}

export function clearAssistantConversationMessages(conversationId: number): void {
  assistantMessageDAO.deleteByConversation(conversationId)
  assistantConversationDAO.touch(conversationId)
}

export async function editAndResendAssistantChat(
  sender: WebContents,
  conversationId: number,
  messageId: number,
  newText: string,
  documentIds: number[] = [],
  workReferences: AssistantWorkReference[] = []
): Promise<void> {
  assistantMessageDAO.deleteFromId(conversationId, messageId)
  await runAssistantChat(sender, conversationId, newText, documentIds, workReferences)
}
