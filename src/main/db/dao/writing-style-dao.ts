import { BaseDAO } from './base-dao'
import type {
  WritingStyleCreateInput,
  WritingStyleDimensions,
  WritingStyleUpdateInput
} from '../../../shared/types/writing-style'
import type { StyleStepRules } from '../../../shared/style-step-rules'

interface WritingStyleRow {
  id: number
  name: string
  description: string
  prompt_template: string
  reference_text: string
  dimensions_json: string
  step_rules_json: string | null
  source: string
  is_default: number
  created_at: string
  updated_at: string
}

function rowToStyle(row: WritingStyleRow) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    promptTemplate: row.prompt_template,
    referenceText: row.reference_text,
    dimensions: JSON.parse(row.dimensions_json || '{}') as WritingStyleDimensions,
    stepRules: row.step_rules_json
      ? (JSON.parse(row.step_rules_json) as StyleStepRules)
      : null,
    source: row.source as 'manual' | 'ai_analysis' | 'builtin',
    isDefault: row.is_default === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  }
}

class WritingStyleDAO extends BaseDAO {
  list(): ReturnType<typeof rowToStyle>[] {
    return this.all<WritingStyleRow>(
      'SELECT * FROM writing_styles ORDER BY is_default DESC, updated_at DESC'
    ).map(rowToStyle)
  }

  getById(id: number): ReturnType<typeof rowToStyle> | undefined {
    const row = this.get<WritingStyleRow>('SELECT * FROM writing_styles WHERE id = ?', [id])
    return row ? rowToStyle(row) : undefined
  }

  getByName(name: string): ReturnType<typeof rowToStyle> | undefined {
    const row = this.get<WritingStyleRow>('SELECT * FROM writing_styles WHERE name = ?', [name])
    return row ? rowToStyle(row) : undefined
  }

  create(input: WritingStyleCreateInput): ReturnType<typeof rowToStyle> {
    if (input.isDefault) {
      this.run('UPDATE writing_styles SET is_default = 0')
    }
    const id = this.insert(
      `INSERT INTO writing_styles
        (name, description, prompt_template, reference_text, dimensions_json, step_rules_json, source, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.name.trim(),
        input.description ?? '',
        input.promptTemplate,
        input.referenceText ?? '',
        JSON.stringify(input.dimensions ?? {}),
        input.stepRules ? JSON.stringify(input.stepRules) : null,
        input.source ?? 'manual',
        input.isDefault ? 1 : 0
      ]
    )
    return this.getById(id)!
  }

  update(id: number, input: WritingStyleUpdateInput): ReturnType<typeof rowToStyle> | undefined {
    const existing = this.getById(id)
    if (!existing) return undefined
    if (input.isDefault) {
      this.run('UPDATE writing_styles SET is_default = 0')
    }
    this.run(
      `UPDATE writing_styles SET
        name = ?, description = ?, prompt_template = ?, reference_text = ?,
        dimensions_json = ?, step_rules_json = ?, is_default = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [
        input.name ?? existing.name,
        input.description ?? existing.description,
        input.promptTemplate ?? existing.promptTemplate,
        input.referenceText ?? existing.referenceText,
        JSON.stringify(input.dimensions ?? existing.dimensions),
        input.stepRules !== undefined
          ? input.stepRules
            ? JSON.stringify(input.stepRules)
            : null
          : existing.stepRules
            ? JSON.stringify(existing.stepRules)
            : null,
        input.isDefault !== undefined ? (input.isDefault ? 1 : 0) : existing.isDefault ? 1 : 0,
        id
      ]
    )
    return this.getById(id)
  }

  delete(id: number): { ok: boolean; error?: string } {
    const existing = this.getById(id)
    if (!existing) return { ok: false, error: '文风不存在' }
    if (existing.source === 'builtin') {
      return { ok: false, error: '内置文风不可删除' }
    }
    const changed = this.run('DELETE FROM writing_styles WHERE id = ?', [id]).changes > 0
    return changed ? { ok: true } : { ok: false, error: '删除失败' }
  }
}

export const writingStyleDAO = new WritingStyleDAO()
