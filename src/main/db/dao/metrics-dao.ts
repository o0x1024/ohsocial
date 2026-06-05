import { BaseDAO } from './base-dao'

interface Row {
  id: number
  content_id: number | null
  platform: string
  views: number
  likes: number
  comments: number
  shares: number
  recorded_at: string
  notes: string
}

class MetricsDAO extends BaseDAO {
  list(contentId?: number) {
    if (contentId) {
      return this.all<Row>('SELECT * FROM content_metrics WHERE content_id = ? ORDER BY recorded_at DESC', [contentId]).map(mapRow)
    }
    return this.all<Row>('SELECT * FROM content_metrics ORDER BY recorded_at DESC LIMIT 100').map(mapRow)
  }

  create(input: {
    contentId?: number | null
    platform: string
    views?: number
    likes?: number
    comments?: number
    shares?: number
    notes?: string
  }) {
    this.insert(
      `INSERT INTO content_metrics (content_id, platform, views, likes, comments, shares, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        input.contentId ?? null,
        input.platform,
        input.views ?? 0,
        input.likes ?? 0,
        input.comments ?? 0,
        input.shares ?? 0,
        input.notes ?? ''
      ]
    )
    return this.list(input.contentId ?? undefined)[0]
  }

  summary() {
    return {
      totalViews: this.get<{ s: number }>('SELECT COALESCE(SUM(views),0) as s FROM content_metrics')?.s ?? 0,
      totalLikes: this.get<{ s: number }>('SELECT COALESCE(SUM(likes),0) as s FROM content_metrics')?.s ?? 0,
      records: this.get<{ c: number }>('SELECT COUNT(*) as c FROM content_metrics')?.c ?? 0
    }
  }
}

function mapRow(r: Row) {
  return {
    id: r.id,
    contentId: r.content_id,
    platform: r.platform,
    views: r.views,
    likes: r.likes,
    comments: r.comments,
    shares: r.shares,
    recordedAt: r.recorded_at,
    notes: r.notes
  }
}

export const metricsDAO = new MetricsDAO()
