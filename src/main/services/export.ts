import { dialog } from 'electron'
import fs from 'fs'
import { contentDAO } from '../db/dao/content-dao'
import { topicDAO } from '../db/dao/topic-dao'
import { stripHtml } from '../../shared/text-diff'

export async function exportContentMarkdown(contentId: number) {
  const content = contentDAO.getById(contentId)
  if (!content) return { success: false, error: '内容不存在' }
  const md = `# ${content.title}\n\n${stripHtml(content.body)}\n`
  const { filePath, canceled } = await dialog.showSaveDialog({
    defaultPath: `${content.title.slice(0, 30)}.md`,
    filters: [{ name: 'Markdown', extensions: ['md'] }]
  })
  if (canceled || !filePath) return { success: false, error: '已取消' }
  fs.writeFileSync(filePath, md, 'utf-8')
  return { success: true, path: filePath }
}

export async function exportAllMarkdown() {
  const contents = contentDAO.list()
  const parts = contents.map(c => `# ${c.title}\n\n平台: ${c.platform}\n状态: ${c.status}\n\n${stripHtml(c.body)}\n\n---\n`)
  const md = parts.join('\n')
  const { filePath, canceled } = await dialog.showSaveDialog({
    defaultPath: `ohsocial-export-${new Date().toISOString().slice(0, 10)}.md`,
    filters: [{ name: 'Markdown', extensions: ['md'] }]
  })
  if (canceled || !filePath) return { success: false, error: '已取消' }
  fs.writeFileSync(filePath, md, 'utf-8')
  return { success: true, path: filePath }
}
