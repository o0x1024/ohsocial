import type Database from 'better-sqlite3'
import { BUILTIN_PLATFORMS } from '../../shared/constants/platforms'

export function seedBuiltinPlatformAccounts(db: Database.Database): void {
  const count = db.prepare('SELECT COUNT(*) as c FROM platform_accounts').get() as { c: number }
  if (count.c > 0) return

  const insert = db.prepare(
    `INSERT INTO platform_accounts
      (platform, display_name, account_name, account_id, followers, notes, content_domain, content_keywords, content_brief, is_builtin)
     VALUES (?, ?, '', '', 0, '', '', '[]', '', 1)`
  )
  for (const p of BUILTIN_PLATFORMS) {
    insert.run(p.id, p.name)
  }
}

export function backfillPlatformDisplayNames(db: Database.Database): void {
  for (const p of BUILTIN_PLATFORMS) {
    db.prepare(
      `UPDATE platform_accounts
       SET display_name = ?, is_builtin = 1
       WHERE platform = ? AND (display_name IS NULL OR display_name = '')`
    ).run(p.name, p.id)
  }
}
