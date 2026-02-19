import { NextRequest, NextResponse } from 'next/server'
import db from '@/lib/db'
import { processNewsletters } from '@/lib/summarizer'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const includeSummaries = searchParams.get('summaries') === 'true'
    
    // Fetch newsletters
    const newsletters = db.prepare(`
      SELECT * FROM newsletters 
      ORDER BY received_at DESC 
      LIMIT ? OFFSET ?
    `).all(limit, offset) as any[]
    
    // Fetch summaries if requested
    let summaries = []
    if (includeSummaries && newsletters.length > 0) {
      const newsletterIds = newsletters.map(n => n.id)
      const placeholders = newsletterIds.map(() => '?').join(',')
      summaries = db.prepare(`
        SELECT * FROM summaries 
        WHERE newsletter_id IN (${placeholders})
      `).all(...newsletterIds) as any[]
    }
    
    const summaryMap = new Map(summaries.map(s => [s.newsletter_id, s]))
    
    const result = newsletters.map(newsletter => ({
      id: newsletter.id,
      externalId: newsletter.external_id,
      subject: newsletter.subject,
      senderName: newsletter.sender_name,
      senderEmail: newsletter.sender_email,
      receivedAt: newsletter.received_at,
      isNewsletter: newsletter.is_newsletter === 1,
      createdAt: newsletter.created_at,
      summary: summaryMap.get(newsletter.id) ? {
        id: summaryMap.get(newsletter.id).id,
        summaryText: summaryMap.get(newsletter.id).summary_text,
        keyPoints: JSON.parse(summaryMap.get(newsletter.id).key_points || '[]'),
        topics: JSON.parse(summaryMap.get(newsletter.id).topics || '[]'),
        sentiment: summaryMap.get(newsletter.id).sentiment,
        readTimeMinutes: summaryMap.get(newsletter.id).read_time_minutes,
        modelUsed: summaryMap.get(newsletter.id).model_used,
      } : null,
    }))
    
    return NextResponse.json({
      newsletters: result,
      total: newsletters.length,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error fetching newsletters:', error)
    return NextResponse.json(
      { error: 'Failed to fetch newsletters' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { newsletterIds } = body
    
    if (!newsletterIds || !Array.isArray(newsletterIds) || newsletterIds.length === 0) {
      return NextResponse.json(
        { error: 'Missing or invalid newsletterIds array' },
        { status: 400 }
      )
    }
    
    const { summaries, digest } = await processNewsletters(newsletterIds)
    
    return NextResponse.json({
      message: 'Summarization completed',
      summaries,
      digest,
    })
  } catch (error) {
    console.error('Error processing newsletters:', error)
    return NextResponse.json(
      { error: 'Failed to process newsletters' },
      { status: 500 }
    )
  }
}