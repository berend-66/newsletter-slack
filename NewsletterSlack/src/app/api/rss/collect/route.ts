import { NextRequest, NextResponse } from 'next/server'
import { RSSCollector, DEFAULT_FEEDS } from '@/lib/rss-collector'
import db from '@/lib/db'

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
    // (already done in db.ts schema creation, but we ensure they exist)
    
    // Get all enabled feeds
    const feeds = db.prepare(`
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
  try {
    const feeds = db.prepare(`
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
    
    const newsletterResult = db.prepare(`
      SELECT COUNT(*) as count FROM newsletters
    `).get() as { count: number } | undefined
    
    return NextResponse.json({
      message: 'RSS collection endpoint',
      feeds,
      newsletterCount: newsletterResult?.count || 0,
      usage: 'POST to trigger RSS collection'
    })
    
  } catch (error) {
    console.error('Database error in RSS GET:', error)
    return NextResponse.json(
      { 
        error: 'Database error',
        message: error instanceof Error ? error.message : String(error),
        stack: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.stack : undefined : undefined
      },
      { status: 500 }
    )
  }
}