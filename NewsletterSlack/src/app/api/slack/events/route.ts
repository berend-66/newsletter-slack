import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { parseRawEmail, parsedEmailToNewsletter } from '@/lib/email-parser'
import { getDatabase } from '@/lib/database'
import { summarizeNewsletter } from '@/lib/summarizer'

/**
 * Verify Slack request signature
 */
function verifySlackSignature(
  request: NextRequest,
  body: string
): boolean {
  const signingSecret = process.env.SLACK_SIGNING_SECRET
  if (!signingSecret) {
    console.warn('SLACK_SIGNING_SECRET not configured')
    return true // Skip verification in development
  }

  const timestamp = request.headers.get('x-slack-request-timestamp') || ''
  const slackSignature = request.headers.get('x-slack-signature') || ''

  // Prevent replay attacks (older than 5 minutes)
  const now = Math.floor(Date.now() / 1000)
  if (Math.abs(now - parseInt(timestamp)) > 300) {
    console.warn('Slack request timestamp too old')
    return false
  }

  const sigBasestring = `v0:${timestamp}:${body}`
  const mySignature = `v0=${crypto
    .createHmac('sha256', signingSecret)
    .update(sigBasestring, 'utf8')
    .digest('hex')}`

  return crypto.timingSafeEqual(
    Buffer.from(mySignature, 'utf8'),
    Buffer.from(slackSignature, 'utf8')
  )
}

/**
 * Check if a Slack message is from the email integration
 */
function isEmailIntegrationMessage(message: any): boolean {
  // Email integration messages have specific characteristics
  const isFromEmail = message.subtype === 'file_share' || 
                     message.subtype === 'bot_message' ||
                     (message.bot_id && message.bot_id.includes('email'))
  
  // Check for email indicators in text
  const text = message.text || ''
  const hasEmailIndicators = text.includes('From:') && 
                            (text.includes('Subject:') || text.includes('To:'))
  
  return isFromEmail || hasEmailIndicators
}

/**
 * Extract email content from Slack message
 */
function extractEmailFromSlackMessage(message: any): string | null {
  // Try to get email from file attachment (Slack email integration often attaches .eml files)
  if (message.files && message.files.length > 0) {
    const emailFile = message.files.find((file: any) => 
      file.filetype === 'email' || 
      file.name?.endsWith('.eml') ||
      file.mimetype?.includes('message/rfc822')
    )
    
    if (emailFile && emailFile.url_private_download) {
      // In production, we'd need to download the file with bot token
      // For now, return the message text as fallback
      console.log('Found email file attachment:', emailFile.name)
    }
  }
  
  // Fallback: use message text
  return message.text || null
}

export async function POST(request: NextRequest) {
  try {
    // Read raw body for signature verification
    const body = await request.text()
    
    // Verify Slack signature
    if (!verifySlackSignature(request, body)) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }
    
    const payload = JSON.parse(body)
    
    // Handle URL verification challenge
    if (payload.type === 'url_verification') {
      return NextResponse.json({ challenge: payload.challenge })
    }
    
    // Handle event callbacks
    if (payload.type === 'event_callback') {
      const event = payload.event
      
      // Only process message events in our configured channel
      const targetChannel = process.env.SLACK_CHANNEL_ID
      if (event.type === 'message' && event.channel === targetChannel) {
        // Skip messages from our own bot to avoid loops
        if (event.bot_id && event.bot_id.includes('newsletter')) {
          return NextResponse.json({ ok: true })
        }
        
        // Check if this is an email integration message
        if (isEmailIntegrationMessage(event)) {
          console.log(`Processing email message from Slack: ${event.ts}`)
          
          // Extract email content
          const emailContent = extractEmailFromSlackMessage(event)
          
          if (emailContent) {
            try {
              // Parse email
              const parsedEmail = await parseRawEmail(emailContent)
              
              // Save to database
              const newsletterData = parsedEmailToNewsletter(
                parsedEmail, 
                emailContent,
                `slack_${event.ts}`
              )
              
              const db = getDatabase()
              const newsletterId = db.insertNewsletter(newsletterData)
              
              console.log(`✅ Newsletter saved from Slack: ${newsletterData.subject}`)
              
              // Summarize (async - don't wait)
              setTimeout(async () => {
                try {
                  const newsletter = {
                    id: newsletterId,
                    subject: newsletterData.subject,
                    sender_name: newsletterData.sender_name,
                    sender_email: newsletterData.sender_email,
                    received_at: newsletterData.received_at,
                    raw_body: newsletterData.raw_body,
                    parsed_body: newsletterData.parsed_body,
                    is_newsletter: newsletterData.is_newsletter,
                    created_at: new Date().toISOString()
                  }
                  
                  await summarizeNewsletter(newsletter)
                } catch (error) {
                  console.error('Error summarizing newsletter:', error)
                }
              }, 0)
              
            } catch (error) {
              console.error('Error processing email from Slack:', error)
            }
          }
        }
      }
      
      return NextResponse.json({ ok: true })
    }
    
    return NextResponse.json({ ok: true })
    
  } catch (error) {
    console.error('Error in Slack events endpoint:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Slack events endpoint',
    status: 'running',
    usage: 'Configure in Slack API Event Subscriptions'
  })
}