import { BaseDAO } from './base-dao'
import type {
  PlatformAccountCreateInput,
  PlatformAccountUpsertInput
} from '../../../shared/types/platform-account'

interface Row {
  id: number
  platform: string
  display_name: string
  account_name: string
  account_id: string
  followers: number
  notes: string
  content_domain: string
  content_keywords: string
  content_brief: string
  is_builtin: number
  updated_at: string
}

function rowToAccount(row: Row) {
  return {
    id: row.id,
    platform: row.platform,
    displayName: row.display_name ?? '',
    accountName: row.account_name,
    accountId: row.account_id,
    followers: row.followers,
    notes: row.notes,
    contentDomain: row.content_domain ?? '',
    contentKeywords: JSON.parse(row.content_keywords || '[]') as string[],
    contentBrief: row.content_brief ?? '',
    isBuiltin: row.is_builtin === 1,
    updatedAt: row.updated_at
  }
}

class PlatformAccountDAO extends BaseDAO {
  list() {
    return this.all<Row>(
      'SELECT * FROM platform_accounts ORDER BY is_builtin DESC, platform ASC'
    ).map(rowToAccount)
  }

  getByPlatform(platform: string) {
    const row = this.get<Row>('SELECT * FROM platform_accounts WHERE platform = ?', [platform])
    return row ? rowToAccount(row) : undefined
  }

  create(platform: string, input: PlatformAccountCreateInput) {
    const existing = this.getByPlatform(platform)
    if (existing) return existing

    const id = this.insert(
      `INSERT INTO platform_accounts
        (platform, display_name, account_name, account_id, followers, notes,
         content_domain, content_keywords, content_brief, is_builtin)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      [
        platform,
        input.displayName,
        input.accountName ?? '',
        input.accountId ?? '',
        input.followers ?? 0,
        input.notes ?? '',
        input.contentDomain ?? '',
        JSON.stringify(input.contentKeywords ?? []),
        input.contentBrief ?? ''
      ]
    )
    const row = this.get<Row>('SELECT * FROM platform_accounts WHERE id = ?', [id])
    return row ? rowToAccount(row) : undefined
  }

  upsert(platform: string, data: PlatformAccountUpsertInput) {
    const existing = this.get<Row>('SELECT * FROM platform_accounts WHERE platform = ?', [platform])
    if (existing) {
      this.run(
        `UPDATE platform_accounts SET
          display_name = ?, account_name = ?, account_id = ?, followers = ?, notes = ?,
          content_domain = ?, content_keywords = ?, content_brief = ?,
          updated_at = datetime('now')
         WHERE id = ?`,
        [
          data.displayName ?? existing.display_name ?? '',
          data.accountName ?? existing.account_name,
          data.accountId ?? existing.account_id,
          data.followers ?? existing.followers,
          data.notes ?? existing.notes,
          data.contentDomain ?? existing.content_domain ?? '',
          JSON.stringify(data.contentKeywords ?? JSON.parse(existing.content_keywords || '[]')),
          data.contentBrief ?? existing.content_brief ?? '',
          existing.id
        ]
      )
      return this.getByPlatform(platform)
    }
    return this.create(platform, {
      displayName: data.displayName ?? platform,
      ...data
    })
  }

  delete(platform: string): boolean {
    const result = this.run('DELETE FROM platform_accounts WHERE platform = ?', [platform])
    return result.changes > 0
  }
}

export const platformAccountDAO = new PlatformAccountDAO()
