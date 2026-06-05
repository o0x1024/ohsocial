export type ContentStatus = 'draft' | 'ready' | 'published' | 'archived'
export type ContentType = 'article' | 'note' | 'script'

export interface Content {
  id: number
  topicId: number | null
  title: string
  body: string
  contentType: ContentType
  platform: string
  parentId: number | null
  status: ContentStatus
  wordCount: number
  coverImage: string | null
  tags: string[]
  seoTitle: string | null
  summary: string | null
  meta: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface ContentCreateInput {
  title: string
  topicId?: number | null
  body?: string
  contentType?: ContentType
  platform?: string
  parentId?: number | null
  status?: ContentStatus
  tags?: string[]
}

export interface ContentUpdateInput {
  title?: string
  topicId?: number | null
  body?: string
  status?: ContentStatus
  tags?: string[]
  summary?: string | null
  seoTitle?: string | null
  meta?: Record<string, unknown>
}
