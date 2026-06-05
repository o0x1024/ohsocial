import type Database from 'better-sqlite3'

export function ensureIncrementalMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS materials (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL DEFAULT 'text_snippet',
      title TEXT NOT NULL,
      content TEXT DEFAULT '',
      url TEXT,
      description TEXT DEFAULT '',
      tags TEXT DEFAULT '[]',
      folder TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS video_scripts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content_id INTEGER NOT NULL,
      video_type TEXT DEFAULT '口播',
      duration_seconds INTEGER DEFAULT 60,
      scenes TEXT DEFAULT '[]',
      bgm_suggestion TEXT DEFAULT '',
      cover_text TEXT DEFAULT '',
      publish_text TEXT DEFAULT '',
      publish_tags TEXT DEFAULT '[]',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (content_id) REFERENCES contents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS assistant_conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT DEFAULT '新对话',
      skill_id TEXT,
      context_type TEXT DEFAULT 'global',
      context_id INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS assistant_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      role TEXT NOT NULL,
      content TEXT DEFAULT '',
      tool_calls TEXT,
      tool_call_id TEXT,
      tool_name TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (conversation_id) REFERENCES assistant_conversations(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS content_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content_id INTEGER NOT NULL,
      body TEXT NOT NULL,
      title TEXT NOT NULL,
      operation TEXT DEFAULT 'manual_edit',
      word_count INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (content_id) REFERENCES contents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS schedule_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      pattern TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS platform_accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      platform TEXT NOT NULL,
      account_name TEXT DEFAULT '',
      account_id TEXT DEFAULT '',
      followers INTEGER DEFAULT 0,
      notes TEXT DEFAULT '',
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS prompt_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT DEFAULT 'content',
      system_prompt TEXT DEFAULT '',
      user_prompt_template TEXT DEFAULT '',
      is_builtin INTEGER DEFAULT 0,
      is_custom INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS generation_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      step TEXT NOT NULL,
      model_provider TEXT,
      model_name TEXT,
      input_tokens INTEGER DEFAULT 0,
      output_tokens INTEGER DEFAULT 0,
      duration_ms INTEGER DEFAULT 0,
      status TEXT DEFAULT 'success',
      error_message TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS custom_skills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      skill_id TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      content TEXT NOT NULL,
      is_enabled INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS hotspots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      source TEXT DEFAULT 'manual',
      url TEXT,
      heat_score INTEGER,
      notes TEXT DEFAULT '',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS content_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      content_id INTEGER,
      platform TEXT NOT NULL,
      views INTEGER DEFAULT 0,
      likes INTEGER DEFAULT 0,
      comments INTEGER DEFAULT 0,
      shares INTEGER DEFAULT 0,
      recorded_at TEXT DEFAULT (datetime('now')),
      notes TEXT DEFAULT '',
      FOREIGN KEY (content_id) REFERENCES contents(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_contents_parent_id ON contents(parent_id);
    CREATE INDEX IF NOT EXISTS idx_materials_type ON materials(type);
    CREATE INDEX IF NOT EXISTS idx_content_versions_content_id ON content_versions(content_id);
  `)
}
