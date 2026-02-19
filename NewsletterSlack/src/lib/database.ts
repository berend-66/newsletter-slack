import Database from 'better-sqlite3'
import { join } from 'path'

export interface Newsletter {
  id: string
  external_id?: string
  subject: string
  sender_name: string
  sender_email: string
  received_at: string
  raw_body: string
  parsed_body: string
  is_newsletter: boolean
  created_at: string
}

export interface Summary {
  id: string
  newsletter_id: string
  summary_text: string
  key_points: string[]
  topics: string[]
  sentiment: 'positive' | 'neutral' | 'negative'
  read_time_minutes: number
  model_used: string
  created_at: string
}

export interface Digest {
  id: string
  date_range: string
  themes: Array<{
    theme: string
    description: string
    related_newsletters: string[]
  }>
  highlights: string[]
  action_items: string[]
  created_at: string
}

class NewsletterDatabase {
  private db: Database.Database

  constructor() {
    const dbPath = join(process.cwd(), 'newsletters.db')
    this.db = new Database(dbPath)
    this.initSchema()
  }

  /**
   * Get raw database instance for direct SQL operations
   * Used by legacy code that needs db.prepare()
   */
  getRawDb(): Database.Database {
    return this.db
  }

  private initSchema() {
    // Enable foreign keys
    this.db.pragma('foreign_keys = ON')

    // Create newsletters table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS newsletters (
        id TEXT PRIMARY KEY,
        external_id TEXT,
        subject TEXT NOT NULL,
        sender_name TEXT NOT NULL,
        sender_email TEXT NOT NULL,
        received_at DATETIME NOT NULL,
        raw_body TEXT NOT NULL,
        parsed_body TEXT NOT NULL,
        is_newsletter BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create summaries table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS summaries (
        id TEXT PRIMARY KEY,
        newsletter_id TEXT NOT NULL,
        summary_text TEXT NOT NULL,
        key_points TEXT NOT NULL, -- JSON array
        topics TEXT NOT NULL, -- JSON array
        sentiment TEXT CHECK(sentiment IN ('positive', 'neutral', 'negative')),
        read_time_minutes INTEGER DEFAULT 5,
        model_used TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (newsletter_id) REFERENCES newsletters(id) ON DELETE CASCADE
      )
    `)

    // Create digests table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS digests (
        id TEXT PRIMARY KEY,
        date_range TEXT NOT NULL,
        themes TEXT NOT NULL, -- JSON array
        highlights TEXT NOT NULL, -- JSON array
        action_items TEXT NOT NULL, -- JSON array
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `)

    // Create indexes
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_newsletters_received_at ON newsletters(received_at DESC)')
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_newsletters_sender_email ON newsletters(sender_email)')
    this.db.exec('CREATE INDEX IF NOT EXISTS idx_summaries_newsletter_id ON summaries(newsletter_id)')
  }

  // Newsletter methods
  insertNewsletter(newsletter: Omit<Newsletter, 'id' | 'created_at'>): string {
    const id = crypto.randomUUID()
    const stmt = this.db.prepare(`
      INSERT INTO newsletters (id, external_id, subject, sender_name, sender_email, received_at, raw_body, parsed_body, is_newsletter)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    stmt.run(
      id,
      newsletter.external_id || null,
      newsletter.subject,
      newsletter.sender_name,
      newsletter.sender_email,
      newsletter.received_at,
      newsletter.raw_body,
      newsletter.parsed_body,
      newsletter.is_newsletter ? 1 : 0
    )
    return id
  }

  getNewsletter(id: string): Newsletter | null {
    const stmt = this.db.prepare('SELECT * FROM newsletters WHERE id = ?')
    return stmt.get(id) as Newsletter | null
  }

  getNewsletters(limit: number = 50, offset: number = 0): Newsletter[] {
    const stmt = this.db.prepare(`
      SELECT * FROM newsletters 
      ORDER BY received_at DESC 
      LIMIT ? OFFSET ?
    `)
    return stmt.all(limit, offset) as Newsletter[]
  }

  getNewslettersBySender(email: string, limit: number = 50): Newsletter[] {
    const stmt = this.db.prepare(`
      SELECT * FROM newsletters 
      WHERE sender_email = ? 
      ORDER BY received_at DESC 
      LIMIT ?
    `)
    return stmt.all(email, limit) as Newsletter[]
  }

  // Summary methods
  insertSummary(summary: Omit<Summary, 'id' | 'created_at'>): string {
    const id = crypto.randomUUID()
    const stmt = this.db.prepare(`
      INSERT INTO summaries (id, newsletter_id, summary_text, key_points, topics, sentiment, read_time_minutes, model_used)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    stmt.run(
      id,
      summary.newsletter_id,
      summary.summary_text,
      JSON.stringify(summary.key_points),
      JSON.stringify(summary.topics),
      summary.sentiment,
      summary.read_time_minutes,
      summary.model_used
    )
    return id
  }

  getSummary(newsletterId: string): Summary | null {
    const stmt = this.db.prepare('SELECT * FROM summaries WHERE newsletter_id = ?')
    const row = stmt.get(newsletterId)
    if (!row) return null
    
    const summary = row as any
    return {
      ...summary,
      key_points: JSON.parse(summary.key_points),
      topics: JSON.parse(summary.topics)
    }
  }

  // Digest methods
  insertDigest(digest: Omit<Digest, 'id' | 'created_at'>): string {
    const id = crypto.randomUUID()
    const stmt = this.db.prepare(`
      INSERT INTO digests (id, date_range, themes, highlights, action_items)
      VALUES (?, ?, ?, ?, ?)
    `)
    stmt.run(
      id,
      digest.date_range,
      JSON.stringify(digest.themes),
      JSON.stringify(digest.highlights),
      JSON.stringify(digest.action_items)
    )
    return id
  }

  getLatestDigest(): Digest | null {
    const stmt = this.db.prepare(`
      SELECT * FROM digests 
      ORDER BY created_at DESC 
      LIMIT 1
    `)
    const row = stmt.get()
    if (!row) return null
    
    const digest = row as any
    return {
      ...digest,
      themes: JSON.parse(digest.themes),
      highlights: JSON.parse(digest.highlights),
      action_items: JSON.parse(digest.action_items)
    }
  }

  close() {
    this.db.close()
  }
}

// Singleton instance
let dbInstance: NewsletterDatabase | null = null

export function getDatabase(): NewsletterDatabase {
  if (!dbInstance) {
    dbInstance = new NewsletterDatabase()
  }
  return dbInstance
}