import { BaseDAO } from './base-dao'

interface VersionRow {
  id: number
  content_id: number
  body: string
  title: string
  operation: string
  word_count: number
  created_at: string
}

class VersionDAO extends BaseDAO {
  list(contentId: number) {
    return this.all<VersionRow>(
      'SELECT * FROM content_versions WHERE content_id = ? ORDER BY id DESC LIMIT 50',
      [contentId]
    ).map(r => ({
      id: r.id,
      contentId: r.content_id,
      body: r.body,
      title: r.title,
      operation: r.operation,
      wordCount: r.word_count,
      createdAt: r.created_at
    }))
  }

  create(contentId: number, title: string, body: string, operation: string) {
    const text = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
    return this.insert(
      `INSERT INTO content_versions (content_id, title, body, operation, word_count) VALUES (?, ?, ?, ?, ?)`,
      [contentId, title, body, operation, text.length]
    )
  }

  getById(id: number) {
    const r = this.get<VersionRow>('SELECT * FROM content_versions WHERE id = ?', [id])
    if (!r) return undefined
    return {
      id: r.id,
      contentId: r.content_id,
      body: r.body,
      title: r.title,
      operation: r.operation,
      wordCount: r.word_count,
      createdAt: r.created_at
    }
  }
}

export const versionDAO = new VersionDAO()
