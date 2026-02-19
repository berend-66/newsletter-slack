import { simpleParser, ParsedMail } from 'mailparser'

export interface ParsedEmail {
  id: string // Generate a unique ID (hash of raw email)
  externalId: string | null // Original email message ID
  subject: string
  senderName: string
  senderEmail: string
  receivedAt: string // ISO string
  rawBody: string // Original raw email content
  parsedBody: string // Extracted plain text
  isForwarded: boolean
  originalSender?: {
    name: string
    email: string
  }
}

/**
 * Parse raw email content (MIME) into structured data
 */
export async function parseRawEmail(rawEmail: string): Promise<ParsedEmail> {
  const parsed = await simpleParser(rawEmail)
  
  // Generate ID from raw email hash (simple hash for now)
  const id = generateEmailId(rawEmail)
  
  // Extract sender info
  const senderName = parsed.from?.text || ''
  const senderEmail = parsed.from?.value?.[0]?.address || ''
  
  // Extract original message ID from headers
  const externalId = parsed.messageId || null
  
  // Parse date
  const receivedAt = parsed.date ? parsed.date.toISOString() : new Date().toISOString()
  
  // Extract body text
  const rawBody = rawEmail
  const parsedBody = extractTextFromParsed(parsed)
  
  // Detect if forwarded
  const isForwarded = detectForwarded(parsed)
  
  // Extract original sender if forwarded
  let originalSender = undefined
  if (isForwarded) {
    originalSender = extractOriginalSender(parsed)
  }
  
  return {
    id,
    externalId,
    subject: parsed.subject || '',
    senderName,
    senderEmail,
    receivedAt,
    rawBody,
    parsedBody,
    isForwarded,
    originalSender,
  }
}

/**
 * Generate a simple deterministic ID from raw email content
 */
function generateEmailId(rawEmail: string): string {
  // Simple hash function
  let hash = 0
  for (let i = 0; i < rawEmail.length; i++) {
    const char = rawEmail.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36).padStart(8, '0')
}

/**
 * Extract plain text from parsed email
 */
function extractTextFromParsed(parsed: ParsedMail): string {
  // Prefer plain text
  if (parsed.text) {
    return parsed.text
  }
  
  // Fallback to HTML stripped
  if (parsed.html) {
    // Simple HTML stripping
    return parsed.html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
  }
  
  // Fallback to attachment text? (not handling for now)
  return ''
}

/**
 * Detect if email is a forwarded message
 */
function detectForwarded(parsed: ParsedMail): boolean {
  const subject = parsed.subject || ''
  const text = parsed.text || ''
  const html = parsed.html || ''
  
  const lowerSubject = subject.toLowerCase()
  const lowerText = text.toLowerCase()
  const lowerHtml = html.toLowerCase()
  
  return (
    lowerSubject.includes('fwd:') ||
    lowerSubject.includes('fw:') ||
    lowerSubject.includes('forwarded') ||
    lowerText.includes('forwarded message') ||
    lowerText.includes('---------- forwarded') ||
    lowerText.includes('begin forwarded message') ||
    lowerText.includes('forwarded this email') ||
    lowerHtml.includes('forwarded message') ||
    lowerHtml.includes('---------- forwarded') ||
    lowerHtml.includes('begin forwarded message') ||
    lowerHtml.includes('forwarded this email')
  )
}

/**
 * Extract original sender from forwarded email
 */
function extractOriginalSender(parsed: ParsedMail): { name: string; email: string } | undefined {
  const text = parsed.text || ''
  const html = parsed.html || ''
  
  // Common forwarded message patterns
  const patterns = [
    // Pattern 1: "From: Name <email@domain.com>"
    /From:\s*([^<]+?)\s*<([^>]+)>/i,
    // Pattern 2: "From: email@domain.com"
    /From:\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i,
    // Pattern 3: HTML format "From:</strong> Name &lt;email@domain.com&gt;"
    /From:<\/?\w+>\s*([^&<]+?)\s*&lt;([^&>]+)&gt;/i,
  ]
  
  const searchText = text + '\n' + html
  
  for (const pattern of patterns) {
    const match = searchText.match(pattern)
    if (match) {
      if (match.length === 3) {
        // Has both name and email
        return {
          name: match[1].trim(),
          email: match[2].trim(),
        }
      } else if (match.length === 2) {
        // Only email
        const email = match[1].trim()
        const name = extractNameFromEmail(email)
        return {
          name,
          email,
        }
      }
    }
  }
  
  return undefined
}

/**
 * Extract a display name from an email address
 * e.g., "newsletter@morningbrew.com" → "Morning Brew"
 */
function extractNameFromEmail(email: string): string {
  const [localPart, domain] = email.split('@')
  
  if (!domain) return email
  
  // Common newsletter patterns
  if (localPart === 'newsletter' || localPart === 'hello' || localPart === 'team') {
    // Use domain name
    const domainName = domain.split('.')[0]
    return capitalizeWords(domainName)
  }
  
  // Use local part
  return capitalizeWords(localPart.replace(/[._-]/g, ' '))
}

/**
 * Capitalize words in a string
 */
function capitalizeWords(str: string): string {
  return str
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Parse forwarded email in plain text format (not full MIME)
 */
export function parseForwardedEmail(text: string): ParsedEmail | null {
  try {
    // Simple parsing for forwarded emails
    const lines = text.split('\n')
    
    let subject = ''
    let senderName = ''
    let senderEmail = ''
    let receivedAt = new Date().toISOString()
    
    // Look for common header patterns
    for (let i = 0; i < Math.min(lines.length, 20); i++) {
      const line = lines[i].trim()
      
      if (line.startsWith('Subject:')) {
        subject = line.replace('Subject:', '').trim()
      } else if (line.startsWith('From:')) {
        const fromLine = line.replace('From:', '').trim()
        // Try to extract name <email>
        const match = fromLine.match(/(.*?)<(.*?)>/)
        if (match) {
          senderName = match[1].trim()
          senderEmail = match[2].trim()
        } else {
          // Just email
          senderEmail = fromLine
          senderName = extractNameFromEmail(senderEmail)
        }
      } else if (line.startsWith('Date:')) {
        try {
          const dateStr = line.replace('Date:', '').trim()
          const date = new Date(dateStr)
          if (!isNaN(date.getTime())) {
            receivedAt = date.toISOString()
          }
        } catch (e) {
          // Ignore date parsing errors
        }
      }
    }
    
    // If we didn't find standard headers, try to extract from first line
    // Format common in Slack-forwarded emails: [Subject] Sender<email> or Subject text <email>
    if (!subject || !senderEmail) {
      const firstLine = lines[0].trim()
      
      // Pattern 1: [Subject] rest <email>
      const pattern1 = /\[(.*?)\].*?<(.*?)>/
      const match1 = firstLine.match(pattern1)
      
      if (match1) {
        subject = match1[1].trim()
        senderEmail = match1[2].trim()
        senderName = extractNameFromEmail(senderEmail)
      } else {
        // Pattern 2: Subject text <email>
        const pattern2 = /(.*?)<(.*?)>/
        const match2 = firstLine.match(pattern2)
        
        if (match2) {
          subject = match2[1].trim()
          senderEmail = match2[2].trim()
          senderName = extractNameFromEmail(senderEmail)
        }
      }
    }
    
    // If we found basic info, return parsed email
    if (subject || senderEmail) {
      const id = generateEmailId(text)
      
      return {
        id,
        externalId: null,
        subject,
        senderName,
        senderEmail,
        receivedAt,
        rawBody: text,
        parsedBody: text,
        isForwarded: true,
        originalSender: senderName ? { name: senderName, email: senderEmail } : undefined
      }
    }
    
    return null
  } catch (error) {
    console.error('Error parsing forwarded email:', error)
    return null
  }
}

/**
 * Convert parsed email to newsletter database object
 */
export function parsedEmailToNewsletter(
  parsedEmail: ParsedEmail,
  rawEmail: string,
  externalId?: string
) {
  // Check if this is a newsletter
  const isNewsletter = checkIfNewsletter(parsedEmail)
  
  return {
    id: parsedEmail.id,
    external_id: externalId || parsedEmail.externalId || null,
    subject: parsedEmail.subject,
    sender_name: parsedEmail.senderName,
    sender_email: parsedEmail.senderEmail,
    received_at: parsedEmail.receivedAt,
    raw_body: rawEmail,
    parsed_body: parsedEmail.parsedBody,
    is_newsletter: isNewsletter,
    created_at: new Date().toISOString()
  }
}

/**
 * Check if an email is likely a newsletter
 */
function checkIfNewsletter(parsedEmail: ParsedEmail): boolean {
  const text = parsedEmail.parsedBody.toLowerCase()
  const subject = parsedEmail.subject.toLowerCase()
  const senderEmail = parsedEmail.senderEmail.toLowerCase()
  
  // Check for newsletter indicators
  const newsletterIndicators = [
    // Keywords in subject or body
    'newsletter',
    'digest',
    'weekly',
    'update',
    'roundup',
    'insights',
    'report',
    'briefing',
    'unsubscribe',
    'subscription',
    'subscribe',
    'preferences',
    
    // Common newsletter domains
    'substack.com',
    'beehiiv.com',
    'buttondown.email',
    'mailchimp.com',
    'convertkit.com',
    'revue.com',
    'ghost.org',
  ]
  
  // Check subject and body
  for (const indicator of newsletterIndicators) {
    if (subject.includes(indicator) || text.includes(indicator)) {
      return true
    }
  }
  
  // Check sender email domain
  for (const domain of ['substack.com', 'beehiiv.com', 'buttondown.email']) {
    if (senderEmail.includes(domain)) {
      return true
    }
  }
  
  return false
}