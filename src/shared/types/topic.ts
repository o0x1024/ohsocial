export type TopicStatus = 'idea' | 'todo' | 'writing' | 'done' | 'skipped'
export type TopicSource = 'manual' | 'ai_recommend' | 'hotspot' | 'competitor'
export type ContentType = 'article' | 'short_video' | 'long_video'

export interface Topic {
  id: number
  title: string
  description: string
  domain: string
  targetPlatforms: string[]
  contentType: ContentType
  source: TopicSource
  status: TopicStatus
  aiScore: number | null
  aiScoreReason: string | null
  tags: string[]
  notes: string
  createdAt: string
  updatedAt: string
}

export interface TopicCreateInput {
  title: string
  description?: string
  domain?: string
  targetPlatforms?: string[]
  contentType?: ContentType
  source?: TopicSource
  status?: TopicStatus
  tags?: string[]
  notes?: string
}

export interface TopicUpdateInput {
  title?: string
  description?: string
  domain?: string
  targetPlatforms?: string[]
  contentType?: ContentType
  status?: TopicStatus
  aiScore?: number | null
  aiScoreReason?: string | null
  tags?: string[]
  notes?: string
}
