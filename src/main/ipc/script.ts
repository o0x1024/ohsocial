import { ipcMain } from 'electron'
import type { VideoScriptInput } from '../../shared/types/script'
import { scriptDAO } from '../db/dao/script-dao'
import { contentDAO } from '../db'
import { modelService } from '../ai/model-service'
import { runWithAiProgress } from './ai-progress-runner'

export function registerScriptHandlers(): void {
  ipcMain.handle('script:get', (_e, contentId: number) => scriptDAO.getByContentId(contentId))

  ipcMain.handle('script:save', (_e, input: VideoScriptInput) => scriptDAO.upsert(input))

  ipcMain.handle('script:ai-generate', async (event, contentId: number, videoType: string, duration: number) =>
    runWithAiProgress(
      event.sender,
      '生成视频脚本',
      async progress => {
        const content = contentDAO.getById(contentId)
        if (!content) return { success: false, error: '内容不存在' }
        const plain = content.body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
        const result = await modelService.chat(
          {
            step: 'script_generate',
            systemPrompt:
              '你是短视频脚本专家。输出 JSON 数组，每项含 scene_no, visual, dialogue, subtitle, duration, notes。只输出 JSON，不要 markdown 包裹。',
            prompt: `标题：${content.title}\n类型：${videoType}\n目标时长：${duration}秒\n正文参考：\n${plain.slice(0, 3000)}\n\n生成 5-8 个分镜。`,
            temperature: 0.8,
            maxTokens: 4096
          },
          { progress, deltaLegacy: { contentId, mode: 'script' }, signal: progress?.signal }
        )
        if (!result.success || !result.content) return result
        try {
          const jsonMatch = result.content.match(/\[[\s\S]*\]/)
          const scenes = JSON.parse(jsonMatch?.[0] ?? result.content)
          const script = scriptDAO.upsert({
            contentId,
            videoType,
            durationSeconds: duration,
            scenes
          })
          return { success: true, script }
        } catch {
          return { success: false, error: '脚本 JSON 解析失败', raw: result.content }
        }
      },
      r => ({ success: r.success, error: r.error })
    )
  )
}
