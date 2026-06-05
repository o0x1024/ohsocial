export type MaterialType = 'text_snippet' | 'link' | 'image'

export interface Material {
  id: number
  type: MaterialType
  title: string
  content: string
  url: string | null
  description: string
  tags: string[]
  folder: string
  createdAt: string
}

export interface MaterialCreateInput {
  type?: MaterialType
  title: string
  content?: string
  url?: string
  description?: string
  tags?: string[]
  folder?: string
}

export interface MaterialUpdateInput {
  title?: string
  content?: string
  url?: string
  description?: string
  tags?: string[]
  folder?: string
}
