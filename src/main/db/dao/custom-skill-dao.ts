import { BaseDAO } from './base-dao'

interface Row {
  id: number
  skill_id: string
  name: string
  description: string
  content: string
  is_enabled: number
  created_at: string
  updated_at: string
}

class CustomSkillDAO extends BaseDAO {
  list() {
    return this.all<Row>('SELECT * FROM custom_skills ORDER BY id').map(r => ({
      id: r.id,
      skillId: r.skill_id,
      name: r.name,
      description: r.description,
      content: r.content,
      isEnabled: r.is_enabled === 1,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }))
  }

  upsert(skillId: string, name: string, content: string, description = '') {
    const existing = this.get<Row>('SELECT * FROM custom_skills WHERE skill_id = ?', [skillId])
    if (existing) {
      this.run(
        `UPDATE custom_skills SET name = ?, content = ?, description = ?, updated_at = datetime('now') WHERE skill_id = ?`,
        [name, content, description, skillId]
      )
    } else {
      this.insert(
        'INSERT INTO custom_skills (skill_id, name, description, content) VALUES (?, ?, ?, ?)',
        [skillId, name, description, content]
      )
    }
    return this.list().find(s => s.skillId === skillId)!
  }

  delete(skillId: string) {
    return this.run('DELETE FROM custom_skills WHERE skill_id = ?', [skillId]).changes > 0
  }
}

export const customSkillDAO = new CustomSkillDAO()
