import { BaseDAO } from './base-dao'
import type { ScheduleCreateInput, ScheduleUpdateInput } from '../../../shared/types/schedule'

export interface ScheduleRow {
  id: number
  content_id: number | null
  topic_id: number | null
  platform: string
  scheduled_at: string
  status: string
  reminder_minutes: number
  notes: string
  template_id: number | null
  created_at: string
  updated_at: string
  content_title?: string | null
  topic_title?: string | null
}

function rowToSchedule(row: ScheduleRow) {
  return {
    id: row.id,
    contentId: row.content_id,
    topicId: row.topic_id,
    platform: row.platform,
    scheduledAt: row.scheduled_at,
    status: row.status,
    reminderMinutes: row.reminder_minutes,
    notes: row.notes,
    templateId: row.template_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    contentTitle: row.content_title ?? null,
    topicTitle: row.topic_title ?? null
  }
}

class ScheduleDAO extends BaseDAO {
  list(from?: string, to?: string): ReturnType<typeof rowToSchedule>[] {
    let sql = `
      SELECT s.*, c.title as content_title, t.title as topic_title
      FROM schedules s
      LEFT JOIN contents c ON c.id = s.content_id
      LEFT JOIN topics t ON t.id = s.topic_id
    `
    const params: string[] = []
    if (from && to) {
      sql += ' WHERE s.scheduled_at >= ? AND s.scheduled_at <= ?'
      params.push(from, to)
    }
    sql += ' ORDER BY s.scheduled_at ASC'
    return this.all<ScheduleRow>(sql, params).map(rowToSchedule)
  }

  getById(id: number): ReturnType<typeof rowToSchedule> | undefined {
    const rows = this.list()
    return rows.find(s => s.id === id)
  }

  /** 发布前 reminder_minutes 分钟的提前提醒 */
  listAdvanceReminders(): ReturnType<typeof rowToSchedule>[] {
    const rows = this.all<ScheduleRow>(
      `SELECT s.*, c.title as content_title, t.title as topic_title
       FROM schedules s
       LEFT JOIN contents c ON c.id = s.content_id
       LEFT JOIN topics t ON t.id = s.topic_id
       WHERE s.status IN ('planned', 'ready')
         AND datetime(s.scheduled_at, printf('-%d minutes', s.reminder_minutes)) <= datetime('now')
         AND s.scheduled_at > datetime('now')`
    )
    return rows.map(rowToSchedule)
  }

  /** 已到发布时间的提醒 */
  listDuePublishReminders(): ReturnType<typeof rowToSchedule>[] {
    const rows = this.all<ScheduleRow>(
      `SELECT s.*, c.title as content_title, t.title as topic_title
       FROM schedules s
       LEFT JOIN contents c ON c.id = s.content_id
       LEFT JOIN topics t ON t.id = s.topic_id
       WHERE s.status IN ('planned', 'ready')
         AND s.scheduled_at <= datetime('now')`
    )
    return rows.map(rowToSchedule)
  }

  markOverdue(): number {
    const result = this.run(
      `UPDATE schedules SET status = 'overdue', updated_at = datetime('now')
       WHERE status IN ('planned', 'ready') AND scheduled_at < datetime('now')`
    )
    return result.changes
  }

  create(input: ScheduleCreateInput): ReturnType<typeof rowToSchedule> {
    const id = this.insert(
      `INSERT INTO schedules (content_id, topic_id, platform, scheduled_at, status, reminder_minutes, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        input.contentId ?? null,
        input.topicId ?? null,
        input.platform,
        input.scheduledAt,
        input.status ?? 'planned',
        input.reminderMinutes ?? 30,
        input.notes ?? ''
      ]
    )
    return this.list().find(s => s.id === id)!
  }

  update(id: number, input: ScheduleUpdateInput): ReturnType<typeof rowToSchedule> | undefined {
    const existing = this.all<ScheduleRow>('SELECT * FROM schedules WHERE id = ?', [id])[0]
    if (!existing) return undefined
    this.run(
      `UPDATE schedules SET
        content_id = ?, topic_id = ?, platform = ?, scheduled_at = ?,
        status = ?, reminder_minutes = ?, notes = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [
        input.contentId !== undefined ? input.contentId : existing.content_id,
        input.topicId !== undefined ? input.topicId : existing.topic_id,
        input.platform ?? existing.platform,
        input.scheduledAt ?? existing.scheduled_at,
        input.status ?? existing.status,
        input.reminderMinutes ?? existing.reminder_minutes,
        input.notes ?? existing.notes,
        id
      ]
    )
    return this.list().find(s => s.id === id)
  }

  delete(id: number): boolean {
    return this.run('DELETE FROM schedules WHERE id = ?', [id]).changes > 0
  }
}

export const scheduleDAO = new ScheduleDAO()
