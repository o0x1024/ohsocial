import { BaseDAO } from './base-dao'
import type { TopicCreateInput, TopicUpdateInput } from '../../../shared/types/topic'

export interface TopicRow {
  id: number
  title: string
  description: string
  domain: string
  target_platforms: string
  content_type: string
  source: string
  status: string
  ai_score: number | null
  ai_score_reason: string | null
  tags: string
  notes: string
  created_at: string
  updated_at: string
}

export type { TopicCreateInput, TopicUpdateInput }

function rowToTopic(row: TopicRow) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    domain: row.domain,
    targetPlatforms: JSON.parse(row.target_platforms || '[]') as string[],
    contentType: row.content_type,
    source: row.source,
    status: row.status,
    aiScore: row.ai_score,
    aiScoreReason: row.ai_score_reason,
    tags: JSON.parse(row.tags || '[]') as string[],
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

class TopicDAO extends BaseDAO {
  list(status?: string): ReturnType<typeof rowToTopic>[] {
    if (status) {
      return this.all<TopicRow>(
        'SELECT * FROM topics WHERE status = ? ORDER BY updated_at DESC',
        [status]
      ).map(rowToTopic)
    }
    return this.all<TopicRow>('SELECT * FROM topics ORDER BY updated_at DESC').map(rowToTopic)
  }

  getById(id: number): ReturnType<typeof rowToTopic> | undefined {
    const row = this.get<TopicRow>('SELECT * FROM topics WHERE id = ?', [id])
    return row ? rowToTopic(row) : undefined
  }

  create(input: TopicCreateInput): ReturnType<typeof rowToTopic> {
    const id = this.insert(
      `INSERT INTO topics (title, description, domain, target_platforms, content_type, source, status, tags, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.title,
        input.description ?? '',
        input.domain ?? '',
        JSON.stringify(input.targetPlatforms ?? []),
        input.contentType ?? 'article',
        input.source ?? 'manual',
        input.status ?? 'idea',
        JSON.stringify(input.tags ?? []),
        input.notes ?? ''
      ]
    )
    return this.getById(id)!
  }

  update(id: number, input: TopicUpdateInput): ReturnType<typeof rowToTopic> | undefined {
    const existing = this.getById(id)
    if (!existing) return undefined

    this.run(
      `UPDATE topics SET
        title = ?, description = ?, domain = ?, target_platforms = ?,
        content_type = ?, status = ?, ai_score = ?, ai_score_reason = ?,
        tags = ?, notes = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [
        input.title ?? existing.title,
        input.description ?? existing.description,
        input.domain ?? existing.domain,
        JSON.stringify(input.targetPlatforms ?? existing.targetPlatforms),
        input.contentType ?? existing.contentType,
        input.status ?? existing.status,
        input.aiScore !== undefined ? input.aiScore : existing.aiScore,
        input.aiScoreReason !== undefined ? input.aiScoreReason : existing.aiScoreReason,
        JSON.stringify(input.tags ?? existing.tags),
        input.notes ?? existing.notes,
        id
      ]
    )
    return this.getById(id)
  }

  delete(id: number): boolean {
    const result = this.run('DELETE FROM topics WHERE id = ?', [id])
    return result.changes > 0
  }

  countByStatus(): Record<string, number> {
    const rows = this.all<{ status: string; count: number }>(
      'SELECT status, COUNT(*) as count FROM topics GROUP BY status'
    )
    return Object.fromEntries(rows.map(r => [r.status, r.count]))
  }
}

export const topicDAO = new TopicDAO()
