import Database from 'better-sqlite3'
import path from 'path'

const dbPath = process.env.SQLITE_PATH || path.join(process.cwd(), 'newsletters.db')
const db = new Database(dbPath)

// Create tables if they don't exist
db.exec(`
  -- newsletters table
  CREATE TABLE IF NOT EXISTS newsletters (
    id TEXT PRIMARY KEY,
    external_id TEXT, -- email message ID
    subject TEXT,
    sender_name TEXT,
    sender_email TEXT,
    received_at DATETIME,
    raw_body TEXT,
    parsed_body TEXT,
    is_newsletter BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- summaries table  
  CREATE TABLE IF NOT EXISTS summaries (
    id TEXT PRIMARY KEY,
    newsletter_id TEXT REFERENCES newsletters(id),
    summary_text TEXT,
    key_points JSON, -- array of strings
    topics JSON, -- array of strings
    sentiment TEXT, -- positive/neutral/negative
    read_time_minutes INTEGER,
    model_used TEXT, -- ollama/gpt-4/etc
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- digests table
  CREATE TABLE IF NOT EXISTS digests (
    id TEXT PRIMARY KEY,
    date_range TEXT, -- e.g., "2024-02-19_to_2024-02-26"
    themes JSON,
    highlights JSON,
    action_items JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- RSS feeds table
  CREATE TABLE IF NOT EXISTS rss_feeds (
    id TEXT PRIMARY KEY,
    url TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    last_fetched DATETIME,
    enabled BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  -- Insert default RSS feeds if table is empty
  INSERT OR IGNORE INTO rss_feeds (id, url, name, enabled) VALUES
    ('the-ai-corner', 'https://newsletter.theaicorner.io/feed', 'The AI Corner (Substack)', 1),
    ('bytebytego', 'https://blog.bytebytego.com/feed', 'ByteByteGo (Substack)', 1),
    ('data-driven-vc', 'https://www.datadrivenvc.io/feed', 'Data Driven VC', 1),
    ('tom-tunguz', 'https://tomtunguz.com/feed/', 'Tomasz Tunguz Blog', 1),
    ('ainews', 'https://www.latent.space/feed', 'Latent Space', 1),
    ('nates-substack', 'https://nate.substack.com/feed', 'Nate''s Substack', 1),
    ('the-vc-corner', 'https://www.thevccorner.com/feed', 'The VC Corner', 1),
    ('adaline-labs', 'https://www.adalinelabs.com/feed', 'Adaline Labs', 1),
    ('confluence-vc', 'https://www.confluence.vc/feed', 'Confluence VC', 1);
`)

export interface NewsletterRow {
  id: string
  external_id: string | null
  subject: string
  sender_name: string
  sender_email: string
  received_at: string
  raw_body: string
  parsed_body: string | null
  is_newsletter: boolean
  created_at: string
}

export interface SummaryRow {
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

export interface DigestRow {
  id: string
  date_range: string
  themes: Array<{ theme: string; description: string; relatedNewsletters: string[] }>
  highlights: string[]
  action_items: string[]
  created_at: string
}

export default db