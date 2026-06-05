import { ipcMain } from 'electron'
import { writingStyleDAO } from '../db'
import type { WritingStyleCreateInput, WritingStyleUpdateInput } from '../../shared/types/writing-style'
import type { StyleAnalysisResult } from '../../shared/assistant-types'

function fromAnalysis(analysis: StyleAnalysisResult, rename?: string): WritingStyleCreateInput {
  return {
    name: (rename || analysis.styleName).trim(),
    description: analysis.description,
    promptTemplate: analysis.promptTemplate,
    referenceText: analysis.referenceText ?? '',
    dimensions: analysis.dimensions,
    stepRules: analysis.stepRules ?? null,
    source: 'ai_analysis'
  }
}

export function registerWritingStyleHandlers(): void {
  ipcMain.handle('writing-style:list', () => writingStyleDAO.list())

  ipcMain.handle('writing-style:get', (_e, id: number) => writingStyleDAO.getById(id))

  ipcMain.handle('writing-style:create', (_e, input: WritingStyleCreateInput) =>
    writingStyleDAO.create(input)
  )

  ipcMain.handle('writing-style:update', (_e, id: number, input: WritingStyleUpdateInput) =>
    writingStyleDAO.update(id, input)
  )

  ipcMain.handle('writing-style:delete', (_e, id: number) => {
    const result = writingStyleDAO.delete(id)
    if (!result.ok) return { success: false, error: result.error }
    return { success: true }
  })

  ipcMain.handle(
    'assistant:exportStyle',
    (_e, analysis: StyleAnalysisResult, options?: { rename?: string }) => {
      const name = (options?.rename || analysis.styleName).trim()
      if (!name) throw new Error('文风名称不能为空')
      const existing = writingStyleDAO.getByName(name)
      if (existing) {
        throw new Error(`文风「${name}」已存在，请换一个名称`)
      }
      return writingStyleDAO.create(fromAnalysis(analysis, name)).id
    }
  )
}
