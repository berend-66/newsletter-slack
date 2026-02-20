import { NextRequest, NextResponse } from 'next/server'
import { RSSCollector, DEFAULT_FEEDS } from '@/lib/rss-collector'
import { getDatabase } from '@/lib/database'

export async function POST(request: NextRequest) {
  try {
    // Check for authentication if needed
    const authHeader = request.headers.get('authorization')
    if (process.env.WEBHOOK_SECRET) {
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      
      const token = authHeader.slice(7)
      if (token !== process.env.WEBHOOK_SECRET) {
        return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
      }
    }

    const collector = new RSSCollector()
    
    // Initialize RSS feeds table with default feeds
    const db = getDatabase()
    const rawDb = db.getRawDb()
    
    // Insert default feeds if they don't exist
    for (const feed of DEFAULT_FEEDS) {
      const existing = rawDb.prepare(`
        SELECT id FROM rss_feeds WHERE url = ?
      `).get(feed.url)
      
      if (!existing) {
        rawDb.prepare(`
          INSERT INTO rss_feeds (id, url, name, enabled)
          VALUES (?, ?, ?, ?)
        `).run(feed.id, feed.url, feed.name, feed.enabled ? 1 : 0)
      }
    }
    
    // Get all enabled feeds
    const feeds = rawDb.prepare(`
      SELECT * FROM rss_feeds WHERE enabled = 1
    `).all() as Array<{
      id: string
      url: string
      name: string
      last_fetched?: string
      enabled: number
    }>
    
    // Convert to RSSFeed format
    const rssFeeds = feeds.map(feed => ({
      id: feed.id,
      url: feed.url,
      name: feed.name,
      lastFetched: feed.last_fetched,
      enabled: feed.enabled === 1
    }))
    
    // Process feeds
    const result = await collector.processFeeds(rssFeeds)
    
    return NextResponse.json({
      success: true,
      message: `Processed ${result.processed} new newsletter items from ${result.total} feeds`,
      result
    })
    
  } catch (error) {
    console.error('Error in RSS collection:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to collect RSS feeds',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  const db = getDatabase()
  const rawDb = db.getRawDb()
  
  try {
    const feeds = rawDb.prepare(`
      SELECT * FROM rss_feeds 
      ORDER BY name
    `).all() as Array<{
      id: string
      url: string
      name: string
      last_fetched: string | null
      enabled: number
      created_at: string
    }>
    
    const newsletterResult = rawDb.prepare(`
      SELECT COUNT(*) as count FROM newsletters
    `).get() as { count: number } | undefined
    
    return NextResponse.json({
      message: 'RSS collection endpoint',
      feeds,
      newsletterCount: newsletterResult?.count || 0,
      usage: 'POST to trigger RSS collection'
    })
    
  } catch (error) {
    return NextResponse.json(
      { error: 'Database error' },
      { status: 500 }
    )
  }
}