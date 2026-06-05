import { BaseDAO } from './base-dao'

export interface ScheduleSlot {
  day: number
  time: string
  platform: string
  contentType?: string
}

export interface TemplatePattern {
  cycle: string
  slots: ScheduleSlot[]
}

interface TemplateRow {
  id: number
  name: string
  description: string
  pattern: string
  is_active: number
  created_at: string
}

class ScheduleTemplateDAO extends BaseDAO {
  list() {
    return this.all<TemplateRow>('SELECT * FROM schedule_templates ORDER BY id').map(r => ({
      id: r.id,
      name: r.name,
      description: r.description,
      pattern: JSON.parse(r.pattern) as TemplatePattern,
      isActive: r.is_active === 1,
      createdAt: r.created_at
    }))
  }

  create(name: string, pattern: TemplatePattern, description = '') {
    const id = this.insert(
      'INSERT INTO schedule_templates (name, description, pattern) VALUES (?, ?, ?)',
      [name, description, JSON.stringify(pattern)]
    )
    return this.list().find(t => t.id === id)!
  }

  delete(id: number) {
    return this.run('DELETE FROM schedule_templates WHERE id = ?', [id]).changes > 0
  }
}

export const scheduleTemplateDAO = new ScheduleTemplateDAO()
