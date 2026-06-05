import { BaseDAO } from './base-dao'

interface Row {
  id: number
  title: string
  source: string
  url: string | null
  heat_score: number | null
  notes: string
  created_at: string
}

class HotspotDAO extends BaseDAO {
  list(limit = 50) {
    return this.all<Row>('SELECT * FROM hotspots ORDER BY id DESC LIMIT ?', [limit]).map(r => ({
      id: r.id,
      title: r.title,
      source: r.source,
      url: r.url,
      heatScore: r.heat_score,
      notes: r.notes,
      createdAt: r.created_at
    }))
  }

  create(title: string, source: string, extra?: { url?: string; heatScore?: number; notes?: string }) {
    const id = this.insert(
      'INSERT INTO hotspots (title, source, url, heat_score, notes) VALUES (?, ?, ?, ?, ?)',
      [title, source, extra?.url ?? null, extra?.heatScore ?? null, extra?.notes ?? '']
    )
    return this.list(1)[0]
  }

  clearBySource(source: string) {
    this.run('DELETE FROM hotspots WHERE source = ?', [source])
  }

  bulkInsert(items: Array<{ title: string; url?: string; heatScore?: number }>, source: string) {
    const insert = this.db.prepare(
      'INSERT INTO hotspots (title, source, url, heat_score) VALUES (?, ?, ?, ?)'
    )
    const tx = this.db.transaction((rows: typeof items) => {
      for (const item of rows) {
        insert.run(item.title, source, item.url ?? null, item.heatScore ?? null)
      }
    })
    tx(items)
  }
}

export const hotspotDAO = new HotspotDAO()
