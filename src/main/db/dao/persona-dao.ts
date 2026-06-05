import { BaseDAO } from './base-dao'
import type { PersonaUpdateInput } from '../../../shared/types/persona'

export interface PersonaRow {
  id: number
  domains: string
  audience: string
  style: string
  persona_desc: string
  differentiator: string
  updated_at: string
}

export type { PersonaUpdateInput }

function rowToPersona(row: PersonaRow) {
  return {
    id: row.id,
    domains: JSON.parse(row.domains || '[]') as string[],
    audience: row.audience,
    style: row.style,
    personaDesc: row.persona_desc,
    differentiator: row.differentiator,
    updatedAt: row.updated_at
  }
}

class PersonaDAO extends BaseDAO {
  get(): ReturnType<typeof rowToPersona> {
    const row = super.get<PersonaRow>('SELECT * FROM persona ORDER BY id LIMIT 1')
    if (!row) throw new Error('Persona not initialized')
    return rowToPersona(row)
  }

  update(input: PersonaUpdateInput): ReturnType<typeof rowToPersona> {
    const current = this.get()
    this.run(
      `UPDATE persona SET
        domains = ?, audience = ?, style = ?,
        persona_desc = ?, differentiator = ?,
        updated_at = datetime('now')
       WHERE id = ?`,
      [
        JSON.stringify(input.domains ?? current.domains),
        input.audience ?? current.audience,
        input.style ?? current.style,
        input.personaDesc ?? current.personaDesc,
        input.differentiator ?? current.differentiator,
        current.id
      ]
    )
    return this.get()
  }

  isConfigured(): boolean {
    const p = this.get()
    return p.domains.length > 0 && p.audience.trim().length > 0
  }
}

export const personaDAO = new PersonaDAO()
