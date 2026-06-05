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
}

export interface PlatformAccountCreateInput extends PlatformAccountUpsertInput {
  displayName: string
}
