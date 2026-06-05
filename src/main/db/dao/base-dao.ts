import Database from 'better-sqlite3'
import { getDatabase } from '../connection'

export abstract class BaseDAO {
  protected get db(): Database.Database {
    return getDatabase()
  }

  protected all<T = Record<string, unknown>>(sql: string, params?: unknown[]): T[] {
    return this.db.prepare(sql).all(...(params ?? [])) as T[]
  }

  protected get<T = Record<string, unknown>>(sql: string, params?: unknown[]): T | undefined {
    return this.db.prepare(sql).get(...(params ?? [])) as T | undefined
  }

  protected run(sql: string, params?: unknown[]): Database.RunResult {
    return this.db.prepare(sql).run(...(params ?? []))
  }

  protected insert(sql: string, params?: unknown[]): number {
    const result = this.db.prepare(sql).run(...(params ?? []))
    return Number(result.lastInsertRowid)
  }
}
