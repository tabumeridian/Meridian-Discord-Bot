import Database from "better-sqlite3";
import { dirname } from "node:path";
import { mkdirSync } from "node:fs";
import { config } from "../config/env.js";
import { logger } from "../logger.js";

const databaseDirectory = dirname(config.databasePath);

if (databaseDirectory && databaseDirectory !== ".") {
  mkdirSync(databaseDirectory, { recursive: true });
}

export const db = new Database(config.databasePath);

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS bot_metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS application_submissions (
    user_id TEXT NOT NULL,
    application_type TEXT NOT NULL,
    submitted_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, application_type)
  );

  CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guild_id TEXT NOT NULL,
    channel_id TEXT NOT NULL UNIQUE,
    creator_id TEXT NOT NULL,
    category_key TEXT NOT NULL,
    status TEXT NOT NULL,
    claimed_by TEXT,
    summary_message_id TEXT,
    created_at INTEGER NOT NULL,
    closed_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS ticket_answers (
    ticket_id INTEGER NOT NULL,
    question_label TEXT NOT NULL,
    answer TEXT NOT NULL,
    sort_order INTEGER NOT NULL,
    FOREIGN KEY (ticket_id) REFERENCES tickets(id) ON DELETE CASCADE
  );
`);

logger.info(`SQLite database ready at ${config.databasePath}`);
