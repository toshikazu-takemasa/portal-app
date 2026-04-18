import Database from 'better-sqlite3'
import fs from 'fs'
import os from 'os'
import path from 'path'

let db: Database.Database | null = null

function resolveDbPath(): string {
  const baseDir = process.env.VERCEL
    ? path.join(os.tmpdir(), 'portal-app-data')
    : process.cwd()

  fs.mkdirSync(baseDir, { recursive: true })
  return path.join(baseDir, 'local-finance.db')
}

export function getDb(): Database.Database {
  if (db) return db

  // Vercel では process.cwd() 配下が read-only のため、/tmp を利用する
  const dbPath = resolveDbPath()
  db = new Database(dbPath)
  db.pragma('foreign_keys = ON')

  // テーブルの初期化
  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      accountId TEXT,
      categoryId TEXT,
      date TEXT NOT NULL,
      amount INTEGER NOT NULL,
      description TEXT,
      raw_data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(accountId) REFERENCES accounts(id),
      FOREIGN KEY(categoryId) REFERENCES categories(id)
    );
  `)

  return db
}
