/** 内置平台（首次启动时写入数据库，之后以数据库为准） */
export const BUILTIN_PLATFORMS = [
  { id: 'wechat', name: '微信公众号', icon: 'comment-dots' },
  { id: 'xiaohongshu', name: '小红书', icon: 'book' },
  { id: 'douyin', name: '抖音', icon: 'video' },
  { id: 'bilibili', name: 'B站', icon: 'play' },
  { id: 'toutiao', name: '今日头条', icon: 'newspaper' }
] as const

export type BuiltinPlatformId = (typeof BUILTIN_PLATFORMS)[number]['id']

export interface PlatformOption {
  id: string
  name: string
}

export const TOPIC_STATUS_LABELS: Record<string, string> = {
  idea: '灵感',
  todo: '待写',
  writing: '创作中',
  done: '已完成',
  skipped: '已跳过'
}

export const CONTENT_STATUS_LABELS: Record<string, string> = {
  draft: '草稿',
  ready: '待发布',
  published: '已发布',
  archived: '已归档'
}
