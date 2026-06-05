import { BaseDAO } from './base-dao'

interface Row {
  id: number
  platform: string
  account_name: string
  account_id: string
  followers: number
  notes: string
  updated_at: string
}

class PlatformAccountDAO extends BaseDAO {
  list() {
    return this.all<Row>('SELECT * FROM platform_accounts ORDER BY platform').map(r => ({
      id: r.id,
      platform: r.platform,
      accountName: r.account_name,
      accountId: r.account_id,
      followers: r.followers,
      notes: r.notes,
      updatedAt: r.updated_at
    }))
  }

  upsert(platform: string, data: { accountName?: string; accountId?: string; followers?: number; notes?: string }) {
    const existing = this.get<Row>('SELECT * FROM platform_accounts WHERE platform = ?', [platform])
    if (existing) {
      this.run(
        `UPDATE platform_accounts SET account_name = ?, account_id = ?, followers = ?, notes = ?, updated_at = datetime('now') WHERE id = ?`,
        [
          data.accountName ?? existing.account_name,
          data.accountId ?? existing.account_id,
          data.followers ?? existing.followers,
          data.notes ?? existing.notes,
          existing.id
        ]
      )
      return this.get<Row>('SELECT * FROM platform_accounts WHERE id = ?', [existing.id])
    }
    const id = this.insert(
      'INSERT INTO platform_accounts (platform, account_name, account_id, followers, notes) VALUES (?, ?, ?, ?, ?)',
      [platform, data.accountName ?? '', data.accountId ?? '', data.followers ?? 0, data.notes ?? '']
    )
    return this.get<Row>('SELECT * FROM platform_accounts WHERE id = ?', [id])
  }
}

export const platformAccountDAO = new PlatformAccountDAO()
