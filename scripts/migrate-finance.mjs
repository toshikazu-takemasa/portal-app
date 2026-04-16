import fs from 'fs'
import path from 'path'
import Database from 'better-sqlite3'

async function migrate() {
  // Vaultパスの推定 (通常は src/profiles などから解決しますが、スクリプトなので手動指定か探索)
  const appData = process.env.LOCALAPPDATA || process.env.HOME || ''
  const vaultDir = path.join(appData, 'portal-app-vault', 'finance') // 適宜環境に合わせて修正
  const dbPath = path.join(process.cwd(), 'local-finance.db');

  if (!fs.existsSync(vaultDir)) {
    console.log('Vault finance directory not found:', vaultDir)
    console.log('マイグレーションが必要な場合は、vaultDirのパスを正しく設定してください。')
    return
  }

  const db = new Database(dbPath)
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      accountId TEXT,
      categoryId TEXT,
      date TEXT NOT NULL,
      amount INTEGER NOT NULL,
      description TEXT,
      raw_data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const files = fs.readdirSync(vaultDir).filter(f => f.endsWith('.json'))

  const insertStmt = db.prepare(`
    INSERT INTO transactions (id, categoryId, date, amount, description)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(id) DO NOTHING
  `)

  let count = 0
  for (const file of files) {
    const content = fs.readFileSync(path.join(vaultDir, file), 'utf-8')
    try {
      const records = JSON.parse(content)
      for (const r of records) {
        const amount = r.type === 'expense' ? -Math.abs(r.amount) : Math.abs(r.amount)
        insertStmt.run(r.id, r.category, r.date, amount, r.note || null)
        count++
      }
    } catch (e) {
      console.error('Failed to parse', file, e)
    }
  }

  console.log(`Migration completed. ${count} records inserted.`)
}

migrate().catch(console.error)
