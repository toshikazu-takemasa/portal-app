import Database from 'better-sqlite3';
import path from 'path';

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;
  
  // Vault配下などに db ファイルを配置するか、リポジトリのルートに作成する
  const dbPath = path.join(process.cwd(), 'local-finance.db');
  db = new Database(dbPath);
  
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
  `);

  return db;
}
