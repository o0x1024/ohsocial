import type Database from 'better-sqlite3'

function hasTable(db: Database.Database, name: string): boolean {
  return !!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name)
}

function hasColumn(db: Database.Database, table: string, column: string): boolean {
  return db.prepare(`PRAGMA table_info(${table})`).all().some((c: { name: string }) => c.name === column)
}

export function ensureAssistantAnovelSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS assistant_roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT NOT NULL DEFAULT 'robot',
      system_prompt TEXT NOT NULL,
      analysis_rules_json TEXT,
      capabilities_json TEXT,
      is_builtin INTEGER DEFAULT 0,
      create_time TEXT DEFAULT (datetime('now')),
      update_time TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS assistant_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      file_name TEXT,
      content_text TEXT NOT NULL,
      char_count INTEGER DEFAULT 0,
      fingerprint_json TEXT,
      create_time TEXT DEFAULT (datetime('now'))
    );
  `)

  if (hasTable(db, 'assistant_conversations')) {
    if (!hasColumn(db, 'assistant_conversations', 'role_id')) {
      db.exec(`ALTER TABLE assistant_conversations ADD COLUMN role_id INTEGER`)
    }
    if (!hasColumn(db, 'assistant_conversations', 'document_ids_json')) {
      db.exec(`ALTER TABLE assistant_conversations ADD COLUMN document_ids_json TEXT`)
    }
    if (!hasColumn(db, 'assistant_conversations', 'model_type')) {
      db.exec(`ALTER TABLE assistant_conversations ADD COLUMN model_type TEXT`)
    }
    if (!hasColumn(db, 'assistant_conversations', 'model_name')) {
      db.exec(`ALTER TABLE assistant_conversations ADD COLUMN model_name TEXT`)
    }
    if (!hasColumn(db, 'assistant_conversations', 'update_time')) {
      db.exec(`ALTER TABLE assistant_conversations ADD COLUMN update_time TEXT`)
      db.exec(
        `UPDATE assistant_conversations SET update_time = COALESCE(updated_at, datetime('now')) WHERE update_time IS NULL`
      )
    }
    if (!hasColumn(db, 'assistant_conversations', 'create_time')) {
      db.exec(`ALTER TABLE assistant_conversations ADD COLUMN create_time TEXT`)
      db.exec(
        `UPDATE assistant_conversations SET create_time = COALESCE(created_at, datetime('now')) WHERE create_time IS NULL`
      )
    }
  }

  if (hasTable(db, 'assistant_messages')) {
    if (!hasColumn(db, 'assistant_messages', 'message_type')) {
      db.exec(`ALTER TABLE assistant_messages ADD COLUMN message_type TEXT NOT NULL DEFAULT 'text'`)
    }
    if (!hasColumn(db, 'assistant_messages', 'metadata_json')) {
      db.exec(`ALTER TABLE assistant_messages ADD COLUMN metadata_json TEXT`)
    }
    if (!hasColumn(db, 'assistant_messages', 'create_time')) {
      db.exec(`ALTER TABLE assistant_messages ADD COLUMN create_time TEXT`)
      db.exec(
        `UPDATE assistant_messages SET create_time = COALESCE(created_at, datetime('now')) WHERE create_time IS NULL`
      )
    }
  }
}

export function ensureModelConfigsAnovelSchema(db: Database.Database): void {
  if (!hasTable(db, 'model_configs')) return
  const cols: Array<[string, string]> = [
    ['model_type', 'TEXT'],
    ['api_base', 'TEXT'],
    ['priority', 'INTEGER DEFAULT 1'],
    ['max_context_tokens', 'INTEGER DEFAULT 256000'],
    ['available_models_json', 'TEXT'],
    ['display_name', 'TEXT'],
    ['provider_protocol', 'TEXT'],
    ['provider_options_json', 'TEXT']
  ]
  for (const [name, type] of cols) {
    if (!hasColumn(db, 'model_configs', name)) {
      db.exec(`ALTER TABLE model_configs ADD COLUMN ${name} ${type}`)
    }
  }
  if (hasColumn(db, 'model_configs', 'provider') && hasColumn(db, 'model_configs', 'model_type')) {
    db.exec(`UPDATE model_configs SET model_type = provider WHERE model_type IS NULL OR model_type = ''`)
    db.exec(`UPDATE model_configs SET provider = model_type WHERE provider IS NULL OR provider = ''`)
  }
  if (hasColumn(db, 'model_configs', 'name') && hasColumn(db, 'model_configs', 'display_name')) {
    db.exec(
      `UPDATE model_configs SET name = COALESCE(NULLIF(display_name, ''), model_type, provider, name)
       WHERE name IS NULL OR name = ''`
    )
  }
  if (hasColumn(db, 'model_configs', 'base_url') && hasColumn(db, 'model_configs', 'api_base')) {
    db.exec(`UPDATE model_configs SET api_base = base_url WHERE api_base IS NULL OR api_base = ''`)
  }
  if (hasColumn(db, 'model_configs', 'name') && hasColumn(db, 'model_configs', 'display_name')) {
    db.exec(`UPDATE model_configs SET display_name = name WHERE display_name IS NULL OR display_name = ''`)
  }
  if (hasColumn(db, 'model_configs', 'model_type')) {
    db.exec(
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_model_configs_model_type ON model_configs(model_type)`
    )
  }
}
