import { getDatabase } from './connection'
import { ensureIncrementalMigrations } from './migrations'
import { ensureModelConfigsAnovelSchema } from './assistant-schema'
import { seedModelConfigs } from './model-seed'

export function initSchema(): void {
  const db = getDatabase()

  db.exec(`
    CREATE TABLE IF NOT EXISTS topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      domain TEXT DEFAULT '',
      target_platforms TEXT DEFAULT '[]',
      content_type TEXT DEFAULT 'article',
      source TEXT DEFAULT 'manual',
      status TEXT DEFAULT 'idea',
      ai_score INTEGER,
      ai_score_reason TEXT,
      tags TEXT DEFAULT '[]',
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS contents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      topic_id INTEGER,
      title TEXT NOT NULL,
      body TEXT DEFAULT '',
      content_type TEXT DEFAULT 'article',
      platform TEXT DEFAULT 'origin',
      parent_id INTEGER,
      status TEXT DEFAULT 'draft',
      word_count INTEGER DEFAULT 0,
      cover_image TEXT,
      tags TEXT DEFAULT '[]',
      seo_title TEXT,
      summary TEXT,
      meta TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content_id INTEGER,
      topic_id INTEGER,
      platform TEXT NOT NULL,
      scheduled_at TEXT NOT NULL,
      status TEXT DEFAULT 'planned',
      reminder_minutes INTEGER DEFAULT 30,
      notes TEXT DEFAULT '',
      template_id INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (content_id) REFERENCES contents(id) ON DELETE SET NULL,
      FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS persona (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      domains TEXT DEFAULT '[]',
      audience TEXT DEFAULT '',
      style TEXT DEFAULT '',
      persona_desc TEXT DEFAULT '',
      differentiator TEXT DEFAULT '',
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS model_configs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      model_type TEXT NOT NULL UNIQUE,
      api_key TEXT,
      api_base TEXT,
      model_name TEXT,
      is_enabled INTEGER DEFAULT 0,
      priority INTEGER DEFAULT 1,
      max_context_tokens INTEGER DEFAULT 256000,
      available_models_json TEXT,
      display_name TEXT,
      provider_protocol TEXT,
      provider_options_json TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS app_preferences (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_topics_status ON topics(status);
    CREATE INDEX IF NOT EXISTS idx_contents_topic_id ON contents(topic_id);
    CREATE INDEX IF NOT EXISTS idx_schedules_scheduled_at ON schedules(scheduled_at);
  `)

  ensureIncrementalMigrations(db)
  ensureModelConfigsAnovelSchema(db)
  seedModelConfigs()

  const personaCount = db.prepare('SELECT COUNT(*) as c FROM persona').get() as { c: number }
  if (personaCount.c === 0) {
    db.prepare('INSERT INTO persona (domains, audience, style) VALUES (?, ?, ?)').run('[]', '', '')
  }
}
