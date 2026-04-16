import type { NextApiRequest, NextApiResponse } from 'next'
import { getDb } from '@/domains/finance/db'
import type { FinanceRecord } from '@/shared/types'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const db = getDb()

  try {
    if (req.method === 'GET') {
      const { yearMonth } = req.query
      if (!yearMonth || typeof yearMonth !== 'string') {
        return res.status(400).json({ error: 'yearMonth is required' })
      }
      // yearMonth (YYYY-MM) から始まる date を持つ取引を取得する
      const stmt = db.prepare(`
        SELECT * FROM transactions 
        WHERE date LIKE ? 
        ORDER BY date DESC, created_at DESC
      `)
      const rows = stmt.all(`${yearMonth}-%`) as any[]
      
      const records: FinanceRecord[] = rows.map(r => ({
        id: r.id,
        date: r.date,
        // categories.type等を持たせるのが理想だが、ここでは transactions.raw_data やシンプルに扱う
        type: r.amount >= 0 ? 'income' : 'expense', 
        category: r.categoryId || '未分類', 
        amount: Math.abs(r.amount),
        note: r.description || undefined
      }))

      // 現在の実装では transactions テーブルだけでも動くようにマイグレーションする
      // TODO: JSONの FinanceRecord そのままを返すためのプロキシ互換性を維持する
      return res.status(200).json(records)
      
    } else if (req.method === 'POST') {
      const { record, yearMonth } = req.body
      if (!record) {
        return res.status(400).json({ error: 'record is required' })
      }
      
      const type = record.type as string
      const amount = type === 'expense' ? -Math.abs(record.amount) : Math.abs(record.amount)

      const stmt = db.prepare(`
        INSERT INTO transactions (id, categoryId, date, amount, description)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          categoryId = excluded.categoryId,
          date = excluded.date,
          amount = excluded.amount,
          description = excluded.description
      `);

      stmt.run(
        record.id,
        record.category,
        record.date,
        amount,
        record.note || null
      )

      return res.status(200).json({ success: true })

    } else if (req.method === 'DELETE') {
      const { id } = req.query
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'id is required' })
      }
      const stmt = db.prepare('DELETE FROM transactions WHERE id = ?')
      stmt.run(id)
      return res.status(200).json({ success: true })
    }

    res.status(405).json({ error: 'Method not allowed' })
  } catch (err: any) {
    console.error('Finance API error:', err)
    res.status(500).json({ error: String(err) })
  }
}
