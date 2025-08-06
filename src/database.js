import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = path.join(__dirname, '../data/tokens.db');

export class TokenDatabase {
  constructor() {
    // Ensure data directory exists
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    
    this.db = new Database(DB_PATH);
    this.initSchema();
  }

  initSchema() {
    // Enable foreign keys
    this.db.pragma('foreign_keys = ON');
    
    // Sessions table - tracks overall session data
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        project_path TEXT NOT NULL,
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        ended_at DATETIME,
        total_input_tokens INTEGER DEFAULT 0,
        total_output_tokens INTEGER DEFAULT 0,
        total_cache_creation_tokens INTEGER DEFAULT 0,
        total_cache_read_tokens INTEGER DEFAULT 0,
        total_cost_usd REAL DEFAULT 0,
        api_duration_ms INTEGER DEFAULT 0,
        total_duration_ms INTEGER DEFAULT 0,
        lines_added INTEGER DEFAULT 0,
        lines_removed INTEGER DEFAULT 0,
        web_search_requests INTEGER DEFAULT 0
      )
    `);

    // Conversations table - tracks individual conversations within sessions
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        conversation_index INTEGER NOT NULL,
        started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        ended_at DATETIME,
        input_tokens INTEGER DEFAULT 0,
        output_tokens INTEGER DEFAULT 0,
        cache_creation_tokens INTEGER DEFAULT 0,
        cache_read_tokens INTEGER DEFAULT 0,
        cost_usd REAL DEFAULT 0
      )
    `);

    // Session snapshots - stores raw data from .claude.json
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS session_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        project_path TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        raw_data TEXT NOT NULL,
        input_tokens INTEGER,
        output_tokens INTEGER,
        cache_creation_tokens INTEGER,
        cache_read_tokens INTEGER,
        cost_usd REAL
      )
    `);

    // Create indexes for better query performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions (project_path);
      CREATE INDEX IF NOT EXISTS idx_sessions_started ON sessions (started_at);
      CREATE INDEX IF NOT EXISTS idx_conversations_session ON conversations (session_id);
      CREATE INDEX IF NOT EXISTS idx_snapshots_session ON session_snapshots (session_id);
      CREATE INDEX IF NOT EXISTS idx_snapshots_timestamp ON session_snapshots (timestamp);
    `);
  }

  // Record a new session snapshot
  recordSnapshot(sessionId, projectPath, data) {
    const stmt = this.db.prepare(`
      INSERT INTO session_snapshots 
      (session_id, project_path, raw_data, input_tokens, output_tokens, 
       cache_creation_tokens, cache_read_tokens, cost_usd)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    return stmt.run(
      sessionId,
      projectPath,
      JSON.stringify(data),
      data.lastTotalInputTokens || 0,
      data.lastTotalOutputTokens || 0,
      data.lastTotalCacheCreationInputTokens || 0,
      data.lastTotalCacheReadInputTokens || 0,
      data.lastCost || 0
    );
  }

  // Get or create a session
  getOrCreateSession(sessionId, projectPath) {
    let session = this.db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
    
    if (!session) {
      const stmt = this.db.prepare(`
        INSERT INTO sessions (id, project_path) 
        VALUES (?, ?)
      `);
      stmt.run(sessionId, projectPath);
      session = this.db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId);
    }
    
    return session;
  }

  // Update session with latest data
  updateSession(sessionId, data) {
    const stmt = this.db.prepare(`
      UPDATE sessions SET
        ended_at = CURRENT_TIMESTAMP,
        total_input_tokens = ?,
        total_output_tokens = ?,
        total_cache_creation_tokens = ?,
        total_cache_read_tokens = ?,
        total_cost_usd = ?,
        api_duration_ms = ?,
        total_duration_ms = ?,
        lines_added = ?,
        lines_removed = ?,
        web_search_requests = ?
      WHERE id = ?
    `);

    return stmt.run(
      data.lastTotalInputTokens || 0,
      data.lastTotalOutputTokens || 0,
      data.lastTotalCacheCreationInputTokens || 0,
      data.lastTotalCacheReadInputTokens || 0,
      data.lastCost || 0,
      data.lastAPIDuration || 0,
      data.lastDuration || 0,
      data.lastLinesAdded || 0,
      data.lastLinesRemoved || 0,
      data.lastTotalWebSearchRequests || 0,
      sessionId
    );
  }

  // Calculate and record conversation deltas
  recordConversation(sessionId, deltaTokens) {
    const conversationCount = this.db.prepare(
      'SELECT COUNT(*) as count FROM conversations WHERE session_id = ?'
    ).get(sessionId).count;

    const stmt = this.db.prepare(`
      INSERT INTO conversations 
      (session_id, conversation_index, input_tokens, output_tokens, 
       cache_creation_tokens, cache_read_tokens, cost_usd)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    return stmt.run(
      sessionId,
      conversationCount + 1,
      deltaTokens.input || 0,
      deltaTokens.output || 0,
      deltaTokens.cacheCreation || 0,
      deltaTokens.cacheRead || 0,
      deltaTokens.cost || 0
    );
  }

  // Get session summary
  getSessionSummary(sessionId) {
    return this.db.prepare(`
      SELECT s.*, 
             COUNT(c.id) as conversation_count,
             SUM(c.input_tokens) as conv_input_tokens,
             SUM(c.output_tokens) as conv_output_tokens,
             SUM(c.cost_usd) as conv_total_cost
      FROM sessions s
      LEFT JOIN conversations c ON s.id = c.session_id
      WHERE s.id = ?
      GROUP BY s.id
    `).get(sessionId);
  }

  // Get project summary
  getProjectSummary(projectPath, days = 30) {
    return this.db.prepare(`
      SELECT 
        COUNT(DISTINCT CASE WHEN id NOT LIKE 'placeholder-%' THEN id END) as session_count,
        SUM(CASE WHEN id NOT LIKE 'placeholder-%' THEN total_input_tokens ELSE 0 END) as total_input,
        SUM(CASE WHEN id NOT LIKE 'placeholder-%' THEN total_output_tokens ELSE 0 END) as total_output,
        SUM(CASE WHEN id NOT LIKE 'placeholder-%' THEN total_cache_creation_tokens ELSE 0 END) as total_cache_creation,
        SUM(CASE WHEN id NOT LIKE 'placeholder-%' THEN total_cache_read_tokens ELSE 0 END) as total_cache_read,
        SUM(CASE WHEN id NOT LIKE 'placeholder-%' THEN total_cost_usd ELSE 0 END) as total_cost,
        AVG(CASE WHEN id NOT LIKE 'placeholder-%' THEN total_cost_usd END) as avg_cost_per_session,
        MIN(CASE WHEN id NOT LIKE 'placeholder-%' THEN started_at END) as first_session,
        MAX(CASE WHEN id NOT LIKE 'placeholder-%' THEN ended_at END) as last_session
      FROM sessions 
      WHERE project_path = ? 
      AND started_at >= datetime('now', '-' || ? || ' days')
    `).get(projectPath, days);
  }

  // Get all projects
  getAllProjects() {
    return this.db.prepare(`
      SELECT 
        project_path,
        COUNT(CASE WHEN id NOT LIKE 'placeholder-%' THEN 1 END) as session_count,
        SUM(CASE WHEN id NOT LIKE 'placeholder-%' THEN total_input_tokens ELSE 0 END) as total_input,
        SUM(CASE WHEN id NOT LIKE 'placeholder-%' THEN total_output_tokens ELSE 0 END) as total_output,
        SUM(CASE WHEN id NOT LIKE 'placeholder-%' THEN total_cost_usd ELSE 0 END) as total_cost,
        MAX(CASE WHEN id NOT LIKE 'placeholder-%' THEN ended_at END) as last_activity,
        COUNT(CASE WHEN id LIKE 'placeholder-%' THEN 1 END) as is_placeholder
      FROM sessions 
      GROUP BY project_path
      ORDER BY 
        CASE WHEN MAX(CASE WHEN id NOT LIKE 'placeholder-%' THEN ended_at END) IS NOT NULL 
             THEN MAX(CASE WHEN id NOT LIKE 'placeholder-%' THEN ended_at END) 
             ELSE '1900-01-01' END DESC
    `).all();
  }

  // Get recent sessions
  getRecentSessions(limit = 10) {
    return this.db.prepare(`
      SELECT 
        id, project_path, started_at, ended_at,
        total_input_tokens, total_output_tokens, total_cost_usd
      FROM sessions 
      ORDER BY started_at DESC 
      LIMIT ?
    `).all(limit);
  }

  // Get daily usage stats
  getDailyStats(days = 7) {
    return this.db.prepare(`
      SELECT 
        DATE(started_at) as date,
        COUNT(*) as session_count,
        SUM(total_input_tokens) as daily_input,
        SUM(total_output_tokens) as daily_output,
        SUM(total_cost_usd) as daily_cost
      FROM sessions 
      WHERE started_at >= datetime('now', '-' || ? || ' days')
      GROUP BY DATE(started_at)
      ORDER BY date DESC
    `).all(days);
  }

  close() {
    this.db.close();
  }
}