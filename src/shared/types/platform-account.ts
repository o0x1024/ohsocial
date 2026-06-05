export interface PlatformAccount {
  id: number
  platform: string
  displayName: string
  accountName: string
  accountId: string
  followers: number
  notes: string
  contentDomain: string
  contentKeywords: string[]
  contentBrief: string
  /** 创作人设：写作视角与身份，如「网络安全从业者，用科普口吻面向普通读者」 */
  authorPersona: string
  isBuiltin: boolean
  updatedAt: string
}

export interface PlatformAccountUpsertInput {
  displayName?: string
  accountName?: string
  accountId?: string
  followers?: number
  notes?: string
  contentDomain?: string
  contentKeywords?: string[]
  contentBrief?: string
  authorPersona?: string
}

export interface PlatformAccountCreateInput extends PlatformAccountUpsertInput {
  displayName: string
}
