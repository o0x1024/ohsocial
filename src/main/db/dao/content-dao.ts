import { BaseDAO } from './base-dao'
import type { ContentCreateInput, ContentUpdateInput } from '../../../shared/types/content'
import { versionDAO } from './version-dao'

export interface ContentRow {
  id: number
  topic_id: number | null
  title: string
  body: string
  content_type: string
  platform: string
  parent_id: number | null
  status: string
  word_count: number
  cover_image: string | null
  tags: string
  seo_title: string | null
  summary: string | null
  meta: string
  created_at: string
  updated_at: string
}

function countWords(html: string): number {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  if (!text) return 0
  return text.length
}

function rowToContent(row: ContentRow) {
  return {
    id: row.id,
    topicId: row.topic_id,
    title: row.title,
    body: row.body,
    contentType: row.content_type,
    platform: row.platform,
    parentId: row.parent_id,
    status: row.status,
    wordCount: row.word_count,
    coverImage: row.cover_image,
    tags: JSON.parse(row.tags || '[]') as string[],
    seoTitle: row.seo_title,
    summary: row.summary,
    meta: JSON.parse(row.meta || '{}') as Record<string, unknown>,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

class ContentDAO extends BaseDAO {
  list(status?: string): ReturnType<typeof rowToContent>[] {
    if (status) {
      return this.all<ContentRow>(
        'SELECT * FROM contents WHERE status = ? ORDER BY updated_at DESC',
        [status]
      ).map(rowToContent)
    }
    return this.all<ContentRow>('SELECT * FROM contents ORDER BY updated_at DESC').map(rowToContent)
  }

  getById(id: number): ReturnType<typeof rowToContent> | undefined {
    const row = this.get<ContentRow>('SELECT * FROM contents WHERE id = ?', [id])
    return row ? rowToContent(row) : undefined
  }

  /** 选题关联的源稿（非平台改写版本） */
  getOriginByTopicId(topicId: number): ReturnType<typeof rowToContent> | undefined {
    const row = this.get<ContentRow>(
      `SELECT * FROM contents
       WHERE topic_id = ? AND (parent_id IS NULL OR platform = 'origin')
       ORDER BY id ASC LIMIT 1`,
      [topicId]
    )
    return row ? rowToContent(row) : undefined
  }

  create(input: ContentCreateInput): ReturnType<typeof rowToContent> {
    const body = input.body ?? ''
    const id = this.insert(
      `INSERT INTO contents (topic_id, title, body, content_type, platform, parent_id, status, word_count, tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.topicId ?? null,
        input.title,
        body,
        input.contentType ?? 'article',
        input.platform ?? 'origin',
        input.parentId ?? null,
        input.status ?? 'draft',
        countWords(body),
        JSON.stringify(input.tags ?? [])
      ]
    )
    return this.getById(id)!
  }

  update(id: number, input: ContentUpdateInput, operation = 'manual_edit'): ReturnType<typeof rowToContent> | undefined {
    const existing = this.getById(id)
    if (!existing) return undefined
    const body = input.body ?? existing.body
    const title = input.title ?? existing.title
    if (body !== existing.body || title !== existing.title) {
      versionDAO.create(id, existing.title, existing.body, operation)
    }
    const meta = input.meta !== undefined ? input.meta : existing.meta
    this.run(
      `UPDATE contents SET
        title = ?, topic_id = ?, body = ?, status = ?, word_count = ?,
        tags = ?, summary = ?, seo_title = ?, meta = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [
        title,
        input.topicId !== undefined ? input.topicId : existing.topicId,
        body,
        input.status ?? existing.status,
        countWords(body),
        JSON.stringify(input.tags ?? existing.tags),
        input.summary !== undefined ? input.summary : existing.summary,
        input.seoTitle !== undefined ? input.seoTitle : existing.seoTitle,
        JSON.stringify(meta),
        id
      ]
    )
    return this.getById(id)
  }

  delete(id: number): boolean {
    return this.run('DELETE FROM contents WHERE id = ?', [id]).changes > 0
  }

  listVersions(parentId: number): ReturnType<typeof rowToContent>[] {
    return this.all<ContentRow>(
      'SELECT * FROM contents WHERE parent_id = ? OR id = ? ORDER BY id',
      [parentId, parentId]
    ).map(rowToContent)
  }

  getOriginId(content: ReturnType<typeof rowToContent>): number {
    return content.parentId ?? content.id
  }
}

export const contentDAO = new ContentDAO()
