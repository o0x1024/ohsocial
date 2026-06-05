import { BaseDAO } from './base-dao'

interface ConvRow {
  id: number
  title: string
  skill_id: string | null
  context_type: string
  context_id: number | null
  created_at: string
  updated_at: string
}

interface MsgRow {
  id: number
  conversation_id: number
  role: string
  content: string
  tool_calls: string | null
  tool_call_id: string | null
  tool_name: string | null
  created_at: string
}

class AssistantDAO extends BaseDAO {
  listConversations() {
    return this.all<ConvRow>(
      'SELECT * FROM assistant_conversations ORDER BY updated_at DESC LIMIT 50'
    ).map(r => ({
      id: r.id,
      title: r.title,
      skillId: r.skill_id,
      contextType: r.context_type,
      contextId: r.context_id,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }))
  }

  createConversation(skillId?: string) {
    const id = this.insert(
      'INSERT INTO assistant_conversations (title, skill_id) VALUES (?, ?)',
      ['新对话', skillId ?? null]
    )
    return this.getConversation(id)!
  }

  getConversation(id: number) {
    const r = this.get<ConvRow>('SELECT * FROM assistant_conversations WHERE id = ?', [id])
    if (!r) return undefined
    return {
      id: r.id,
      title: r.title,
      skillId: r.skill_id,
      contextType: r.context_type,
      contextId: r.context_id,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }
  }

  deleteConversation(id: number) {
    this.run('DELETE FROM assistant_messages WHERE conversation_id = ?', [id])
    return this.run('DELETE FROM assistant_conversations WHERE id = ?', [id]).changes > 0
  }

  updateTitle(id: number, title: string) {
    this.run(
      `UPDATE assistant_conversations SET title = ?, updated_at = datetime('now') WHERE id = ?`,
      [title, id]
    )
  }

  listMessages(conversationId: number) {
    return this.all<MsgRow>(
      'SELECT * FROM assistant_messages WHERE conversation_id = ? ORDER BY id',
      [conversationId]
    ).map(r => ({
      id: r.id,
      conversationId: r.conversation_id,
      role: r.role,
      content: r.content,
      toolCalls: r.tool_calls ? JSON.parse(r.tool_calls) : null,
      toolCallId: r.tool_call_id,
      toolName: r.tool_name,
      createdAt: r.created_at
    }))
  }

  addMessage(
    conversationId: number,
    role: string,
    content: string,
    extra?: { toolCalls?: unknown; toolCallId?: string; toolName?: string }
  ) {
    const id = this.insert(
      `INSERT INTO assistant_messages (conversation_id, role, content, tool_calls, tool_call_id, tool_name)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        conversationId,
        role,
        content,
        extra?.toolCalls ? JSON.stringify(extra.toolCalls) : null,
        extra?.toolCallId ?? null,
        extra?.toolName ?? null
      ]
    )
    this.run(
      `UPDATE assistant_conversations SET updated_at = datetime('now') WHERE id = ?`,
      [conversationId]
    )
    return id
  }

  toApiMessages(conversationId: number): Array<Record<string, unknown>> {
    const rows = this.listMessages(conversationId)
    return rows.map(m => {
      if (m.role === 'tool') {
        return { role: 'tool', content: m.content, tool_call_id: m.toolCallId }
      }
      if (m.role === 'assistant' && m.toolCalls) {
        return { role: 'assistant', content: m.content || null, tool_calls: m.toolCalls }
      }
      return { role: m.role, content: m.content }
    })
  }
}

export const assistantDAO = new AssistantDAO()
