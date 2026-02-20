// Using any for rss-parser since types aren't available
const Parser = require('rss-parser')
import db from './db'

export interface RSSFeed {
  id: string
  url: string
  name: string
  lastFetched?: string
  enabled: boolean
}

export interface RSSItem {
  title: string
  link: string
  pubDate: string
  content: string
  contentSnippet?: string
  creator?: string
  author?: string
  guid?: string
}

export class RSSCollector {
  private parser: any
  
  constructor() {
    this.parser = new Parser({
      customFields: {
        item: ['dc:creator', 'author', 'content:encoded']
      }
    })
  }

  /**
   * Fetch and parse RSS feed
   */
  async fetchFeed(feedUrl: string): Promise<RSSItem[]> {
    try {
      const feed = await this.parser.parseURL(feedUrl)
      return feed.items.map((item: any) => ({
        title: item.title || 'Untitled',
        link: item.link || '',
        pubDate: item.pubDate || item.isoDate || new Date().toISOString(),
        content: this.extractContent(item),
        contentSnippet: item.contentSnippet || '',
        creator: item.creator || item.author || '',
        guid: item.guid || item.link || ''
      }))
    } catch (error) {
      console.error(`Error fetching RSS feed ${feedUrl}:`, error)
      return []
    }
  }

  /**
   * Extract content from RSS item
   */
  private extractContent(item: any): string {
    // Prefer content:encoded, then content, then description
    return item['content:encoded'] || 
           item.content || 
           item.description || 
           item.contentSnippet || 
           ''
  }

  /**
   * Convert RSS item to email format for our parser
   */
  rssItemToEmail(item: RSSItem, feedName: string, feedEmail: string): string {
    const date = new Date(item.pubDate)
    const formattedDate = date.toUTCString()
    
    // Create email-like format that our parser can handle
    return `From: ${feedName} <${feedEmail}>
Subject: ${item.title}
Date: ${formattedDate}
Content-Type: text/html; charset=utf-8

${item.content}

---
This is an automated RSS-to-email conversion.
Original source: ${item.link}
Unsubscribe: ${feedEmail}
`
  }

  /**
   * Process all feeds and save to database
   */
  async processFeeds(feeds: RSSFeed[]): Promise<{ processed: number; total: number }> {
    let processed = 0
    const total = feeds.length
    
    for (const feed of feeds) {
      if (!feed.enabled) continue
      
      try {
        const items = await this.fetchFeed(feed.url)
        console.log(`Found ${items.length} items in ${feed.name}`)
        
        for (const item of items) {
          // Check if already exists by guid or link
          const existing = db.prepare(`
            SELECT id FROM newsletters 
            WHERE external_id = ? OR parsed_body LIKE ?
          `).get(item.guid || '', `%${item.link}%`)
          
          if (!existing) {
            // Convert to email format
            const emailContent = this.rssItemToEmail(
              item,
              feed.name,
              `${feed.name.toLowerCase().replace(/\s+/g, '.')}@rss.feed`
            )
            
            // Generate ID from content hash
            const id = this.generateId(emailContent)
            
            // Save to database (using our existing email parser)
            // We'll need to call the email parser here
            // For now, store raw
            db.prepare(`
              INSERT INTO newsletters (
                id, external_id, subject, sender_name, sender_email,
                received_at, raw_body, parsed_body, is_newsletter
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `).run(
              id,
              item.guid || item.link,
              item.title,
              feed.name,
              `${feed.name.toLowerCase().replace(/\s+/g, '.')}@rss.feed`,
              new Date(item.pubDate).toISOString(),
              emailContent,
              item.contentSnippet || item.content || '',
              1
            )
            
            processed++
            console.log(`Saved: ${item.title}`)
          }
        }
        
        // Update last fetched timestamp
        db.prepare(`
          UPDATE rss_feeds 
          SET last_fetched = ? 
          WHERE id = ?
        `).run(new Date().toISOString(), feed.id)
        
      } catch (error) {
        console.error(`Error processing feed ${feed.name}:`, error)
      }
    }
    
    return { processed, total }
  }

  /**
   * Generate deterministic ID from content
   */
  private generateId(content: string): string {
    let hash = 0
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(36).padStart(8, '0')
  }
}

// Default feeds for B's newsletters
export const DEFAULT_FEEDS: RSSFeed[] = [
  {
    id: 'ainews',
    url: 'https://www.latent.space/feed', // Assuming this is AINews
    name: 'Latent Space',
    enabled: true
  },
  {
    id: 'the-ai-corner',
    url: 'https://theaicorner.substack.com/feed',
    name: 'The AI Corner',
    enabled: true
  },
  {
    id: 'bytebytego',
    url: 'https://blog.bytebytego.com/feed',
    name: 'ByteByteGo',
    enabled: true
  },
  {
    id: 'nates-substack',
    url: 'https://natesnewsletter.substack.com/feed',
    name: "Nate's Substack",
    enabled: true
  },
  {
    id: 'the-vc-corner',
    url: 'https://thevccorner.substack.com/feed',
    name: 'The VC Corner',
    enabled: true
  },
  {
    id: 'adaline-labs',
    url: 'https://adalinelabs.substack.com/feed',
    name: 'Adaline Labs',
    enabled: true
  },
  {
    id: 'tom-tunguz',
    url: 'https://tomtunguz.com/feed/',
    name: 'Tomasz Tunguz',
    enabled: true
  },
  {
    id: 'confluence-vc',
    url: 'https://www.confluence.vc/feed',
    name: 'Confluence VC',
    enabled: true
  },
  {
    id: 'data-driven-vc',
    url: 'https://www.datadrivenvc.io/feed',
    name: 'Data Driven VC',
    enabled: true
  }
]