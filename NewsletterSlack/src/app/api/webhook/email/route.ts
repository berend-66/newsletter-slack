import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { parseRawEmail, parseForwardedEmail, parsedEmailToNewsletter } from '@/lib/email-parser'
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

    // Parse request body
    let rawEmail: string
    let externalId: string | undefined
    
    const contentType = request.headers.get('content-type') || ''
    
    if (contentType.includes('application/json')) {
      // JSON payload with email data
      const body = await request.json()
      rawEmail = body.email || body.raw || body.text || body.content
      externalId = body.id || body.messageId || body.externalId
      
      if (!rawEmail) {
        return NextResponse.json(
          { error: 'Missing email content in JSON payload' },
          { status: 400 }
        )
      }
    } else if (contentType.includes('multipart/form-data')) {
      // Form data (file upload)
      const formData = await request.formData()
      rawEmail = formData.get('email') as string || 
                 formData.get('content') as string ||
                 formData.get('file') as string
      
      if (!rawEmail) {
        const file = formData.get('file') as File
        if (file) {
          rawEmail = await file.text()
        }
      }
      
      if (!rawEmail) {
        return NextResponse.json(
          { error: 'No email content found in form data' },
          { status: 400 }
        )
      }
    } else {
      // Raw text/email
      rawEmail = await request.text()
      
      if (!rawEmail.trim()) {
        return NextResponse.json(
          { error: 'Empty request body' },
          { status: 400 }
        )
      }
    }

    // Parse email
    let parsedEmail
    
    try {
      // First try to parse as raw MIME email
      parsedEmail = await parseRawEmail(rawEmail)
    } catch (error) {
      console.log('Failed to parse as raw MIME, trying forwarded format:', error instanceof Error ? error.message : String(error))
      
      // Try to parse as forwarded email (plain text with headers)
      parsedEmail = parseForwardedEmail(rawEmail)
      
      if (!parsedEmail) {
        // Last resort: create a minimal ParsedEmail
        // Generate ID from raw content
        let hash = 0
        for (let i = 0; i < rawEmail.length; i++) {
          const char = rawEmail.charCodeAt(i)
          hash = ((hash << 5) - hash) + char
          hash = hash & hash
        }
        const id = Math.abs(hash).toString(36).padStart(8, '0')
        
        parsedEmail = {
          id,
          externalId: null,
          subject: 'Email (unparsed)',
          senderName: 'Unknown',
          senderEmail: 'unknown@example.com',
          receivedAt: new Date().toISOString(),
          rawBody: rawEmail,
          parsedBody: rawEmail,
          isForwarded: false
        }
      }
    }

    // Convert to newsletter object
    const newsletterData = parsedEmailToNewsletter(parsedEmail, rawEmail, externalId)
    
    // Save to database
    const newsletterId = crypto.randomUUID()
    db.prepare(`
      INSERT INTO newsletters (id, external_id, subject, sender_name, sender_email, received_at, raw_body, parsed_body, is_newsletter)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newsletterId,
      newsletterData.external_id || null,
      newsletterData.subject,
      newsletterData.sender_name,
      newsletterData.sender_email,
      newsletterData.received_at,
      newsletterData.raw_body,
      newsletterData.parsed_body,
      newsletterData.is_newsletter ? 1 : 0
    )
    
    console.log(`✅ Newsletter saved: ${newsletterData.subject} (ID: ${newsletterId})`)
    
    // TODO: Queue for summarization (async)
    
    return NextResponse.json({
      success: true,
      id: newsletterId,
      newsletter: {
        subject: newsletterData.subject,
        sender: newsletterData.sender_name,
        isNewsletter: newsletterData.is_newsletter,
        receivedAt: newsletterData.received_at
      }
    })
    
  } catch (error) {
    console.error('Error in webhook endpoint:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to process email',
        message: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Email webhook endpoint is running',
    usage: 'POST raw email content to this endpoint',
    formats: ['raw MIME', 'JSON with email field', 'multipart/form-data'],
    authentication: process.env.WEBHOOK_SECRET ? 'Bearer token required' : 'None'
  })
}