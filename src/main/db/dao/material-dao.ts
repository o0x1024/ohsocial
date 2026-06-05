import { BaseDAO } from './base-dao'
import type { MaterialCreateInput, MaterialUpdateInput } from '../../../shared/types/material'

interface MaterialRow {
  id: number
  type: string
  title: string
  content: string
  url: string | null
  description: string
  tags: string
  folder: string
  created_at: string
}

function rowToMaterial(row: MaterialRow) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    content: row.content,
    url: row.url,
    description: row.description,
    tags: JSON.parse(row.tags || '[]') as string[],
    folder: row.folder,
    createdAt: row.created_at
  }
}

class MaterialDAO extends BaseDAO {
  list(type?: string) {
    if (type) {
      return this.all<MaterialRow>('SELECT * FROM materials WHERE type = ? ORDER BY created_at DESC', [type]).map(rowToMaterial)
    }
    return this.all<MaterialRow>('SELECT * FROM materials ORDER BY created_at DESC').map(rowToMaterial)
  }

  getById(id: number) {
    const row = this.get<MaterialRow>('SELECT * FROM materials WHERE id = ?', [id])
    return row ? rowToMaterial(row) : undefined
  }

  create(input: MaterialCreateInput) {
    const id = this.insert(
      `INSERT INTO materials (type, title, content, url, description, tags, folder)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        input.type ?? 'text_snippet',
        input.title,
        input.content ?? '',
        input.url ?? null,
        input.description ?? '',
        JSON.stringify(input.tags ?? []),
        input.folder ?? ''
      ]
    )
    return this.getById(id)!
  }

  update(id: number, input: MaterialUpdateInput) {
    const e = this.getById(id)
    if (!e) return undefined
    this.run(
      `UPDATE materials SET title = ?, content = ?, url = ?, description = ?, tags = ?, folder = ?
       WHERE id = ?`,
      [
        input.title ?? e.title,
        input.content ?? e.content,
        input.url !== undefined ? input.url : e.url,
        input.description ?? e.description,
        JSON.stringify(input.tags ?? e.tags),
        input.folder ?? e.folder,
        id
      ]
    )
    return this.getById(id)
  }

  delete(id: number) {
    return this.run('DELETE FROM materials WHERE id = ?', [id]).changes > 0
  }

  search(q: string) {
    const like = `%${q}%`
    return this.all<MaterialRow>(
      `SELECT * FROM materials WHERE title LIKE ? OR content LIKE ? OR description LIKE ?
       ORDER BY created_at DESC LIMIT 20`,
      [like, like, like]
    ).map(rowToMaterial)
  }
}

export const materialDAO = new MaterialDAO()
