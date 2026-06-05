import { BaseDAO } from './base-dao'
import type { VideoScriptInput } from '../../../shared/types/script'
import type { ScriptScene } from '../../../shared/types/script'

interface ScriptRow {
  id: number
  content_id: number
  video_type: string
  duration_seconds: number
  scenes: string
  bgm_suggestion: string
  cover_text: string
  publish_text: string
  publish_tags: string
  created_at: string
  updated_at: string
}

function rowToScript(row: ScriptRow) {
  return {
    id: row.id,
    contentId: row.content_id,
    videoType: row.video_type,
    durationSeconds: row.duration_seconds,
    scenes: JSON.parse(row.scenes || '[]') as ScriptScene[],
    bgmSuggestion: row.bgm_suggestion,
    coverText: row.cover_text,
    publishText: row.publish_text,
    publishTags: JSON.parse(row.publish_tags || '[]') as string[],
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

class ScriptDAO extends BaseDAO {
  getByContentId(contentId: number) {
    const row = this.get<ScriptRow>('SELECT * FROM video_scripts WHERE content_id = ?', [contentId])
    return row ? rowToScript(row) : undefined
  }

  upsert(input: VideoScriptInput) {
    const existing = this.getByContentId(input.contentId)
    const scenes = JSON.stringify(input.scenes ?? existing?.scenes ?? [])
    const tags = JSON.stringify(input.publishTags ?? existing?.publishTags ?? [])
    if (existing) {
      this.run(
        `UPDATE video_scripts SET video_type = ?, duration_seconds = ?, scenes = ?,
         bgm_suggestion = ?, cover_text = ?, publish_text = ?, publish_tags = ?,
         updated_at = datetime('now') WHERE content_id = ?`,
        [
          input.videoType ?? existing.videoType,
          input.durationSeconds ?? existing.durationSeconds,
          scenes,
          input.bgmSuggestion ?? existing.bgmSuggestion,
          input.coverText ?? existing.coverText,
          input.publishText ?? existing.publishText,
          tags,
          input.contentId
        ]
      )
      return this.getByContentId(input.contentId)!
    }
    const id = this.insert(
      `INSERT INTO video_scripts (content_id, video_type, duration_seconds, scenes, bgm_suggestion, cover_text, publish_text, publish_tags)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.contentId,
        input.videoType ?? '口播',
        input.durationSeconds ?? 60,
        scenes,
        input.bgmSuggestion ?? '',
        input.coverText ?? '',
        input.publishText ?? '',
        tags
      ]
    )
    const row = this.get<ScriptRow>('SELECT * FROM video_scripts WHERE id = ?', [id])
    return row ? rowToScript(row) : undefined
  }
}

export const scriptDAO = new ScriptDAO()
