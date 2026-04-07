// ============================================================
// GitHubStorageAdapter
// StorageAdapter の GitHub Contents API 実装
// ADR-001: GitHub Contents API をプライマリストレージとして使用
// ============================================================

import type { StorageAdapter } from './interface'
import type { JournalEntry, PortalConfig } from '@/shared/types'

const GITHUB_API = 'https://api.github.com'

interface GitHubFileResponse {
  content: string   // base64エンコード
  sha: string
  name: string
  path: string
}

export class GitHubStorageAdapter implements StorageAdapter {
  private readonly repo: string
  private readonly branch: string
  private readonly diaryPath: string
  private readonly configPath: string
  private readonly pat: string

  constructor(opts: {
    pat: string
    repo: string
    branch: string
    diaryPath: string
    configPath: string
  }) {
    this.pat = opts.pat
    this.repo = opts.repo
    this.branch = opts.branch
    this.diaryPath = opts.diaryPath
    this.configPath = opts.configPath
  }

  private get headers(): HeadersInit {
    return {
      Authorization: `Bearer ${this.pat}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    }
  }

  private encode(text: string): string {
    return btoa(unescape(encodeURIComponent(text)))
  }

  private decode(b64: string): string {
    return decodeURIComponent(escape(atob(b64.replace(/\s/g, ''))))
  }

  // --- Journal ---

  async getJournal(date: string): Promise<JournalEntry | null> {
    const filename = `${date}.md`
    const result = await this.getFile(`${this.diaryPath}/${filename}`)
    if (!result) return null
    return {
      date,
      content: result.content,
      sha: result.sha,
      profile: 'work', // caller が上書きする想定
    }
  }

  async saveJournal(entry: JournalEntry): Promise<void> {
    const filename = `${entry.date}.md`
    await this.saveFile(
      `${this.diaryPath}/${filename}`,
      entry.content,
      entry.sha
    )
  }

  async listJournalDates(limit = 30): Promise<string[]> {
    const res = await fetch(
      `${GITHUB_API}/repos/${this.repo}/contents/${this.diaryPath}?ref=${this.branch}`,
      { headers: this.headers }
    )
    if (!res.ok) return []
    const files = (await res.json()) as Array<{ name: string }>
    return files
      .map((f) => f.name.replace('.md', ''))
      .filter((n) => /^\d{4}-\d{2}-\d{2}$/.test(n))
      .sort()
      .reverse()
      .slice(0, limit)
  }

  // --- Config ---

  async getPortalConfig(): Promise<PortalConfig> {
    const result = await this.getFile(this.configPath)
    if (!result) {
      return { links: [], dailyTasks: [], pillars: [] }
    }
    try {
      return JSON.parse(result.content) as PortalConfig
    } catch {
      return { links: [], dailyTasks: [], pillars: [] }
    }
  }

  async savePortalConfig(config: PortalConfig): Promise<void> {
    const existing = await this.getFile(this.configPath)
    await this.saveFile(
      this.configPath,
      JSON.stringify(config, null, 2),
      existing?.sha
    )
  }

  // --- Files（汎用） ---

  async getFile(path: string): Promise<{ content: string; sha: string } | null> {
    const res = await fetch(
      `${GITHUB_API}/repos/${this.repo}/contents/${path}?ref=${this.branch}`,
      { headers: this.headers }
    )
    if (!res.ok) return null
    const data = (await res.json()) as GitHubFileResponse
    return { content: this.decode(data.content), sha: data.sha }
  }

  async saveFile(path: string, content: string, sha?: string): Promise<void> {
    const body: Record<string, unknown> = {
      message: `📝 Update ${path.split('/').pop()}`,
      content: this.encode(content),
      branch: this.branch,
    }
    if (sha) body.sha = sha

    const res = await fetch(
      `${GITHUB_API}/repos/${this.repo}/contents/${encodeURIComponent(path)}`,
      { method: 'PUT', headers: this.headers, body: JSON.stringify(body) }
    )
    if (!res.ok) {
      const err = await res.json()
      throw new Error(`GitHub API error: ${JSON.stringify(err)}`)
    }
  }
}
