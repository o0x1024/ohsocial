/** 从内容记录解析关联的目标平台 id 列表 */
export function resolveContentPlatformIds(input: {
  platform: string
  meta?: Record<string, unknown> | null
  topicTargetPlatforms?: string[]
}): string[] {
  if (input.platform && input.platform !== 'origin') {
    return [input.platform]
  }
  const meta = input.meta ?? {}
  if (typeof meta.sourcePlatform === 'string' && meta.sourcePlatform) {
    return [meta.sourcePlatform]
  }
  const targets = meta.targetPlatforms
  if (Array.isArray(targets) && targets.length > 0) {
    return targets.filter((p): p is string => typeof p === 'string' && Boolean(p))
  }
  if (input.topicTargetPlatforms?.length) {
    return [...input.topicTargetPlatforms]
  }
  return []
}
