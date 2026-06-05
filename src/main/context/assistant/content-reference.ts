import { contentDAO } from '../../db/dao/content-dao'
import { topicDAO } from '../../db/dao/topic-dao'
import type { AssistantWorkReference } from '../../../shared/assistant-types'

/** OhSocial：将「作品引用」映射为内容/选题正文上下文 */
export function buildContentReferenceContext(refs: AssistantWorkReference[]): string {
  const parts: string[] = []
  for (const ref of refs) {
    const content = contentDAO.getById(ref.workId)
    if (content) {
      const plain = content.body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      parts.push(`【内容：${ref.title || content.title}】\n${plain.slice(0, 6000)}`)
      continue
    }
    const topic = topicDAO.getById(ref.workId)
    if (topic) {
      parts.push(
        `【选题：${ref.title || topic.title}】\n${topic.description || ''}\n${topic.notes || ''}`.trim()
      )
    }
  }
  return parts.filter(Boolean).join('\n\n')
}

export function buildContentReferenceMetadata(refs: AssistantWorkReference[]) {
  if (!refs.length) return null
  return {
    workReferences: refs.map(r => ({
      workId: r.workId,
      chapterId: r.chapterId ?? null,
      title: r.title
    }))
  }
}
