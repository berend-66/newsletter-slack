import db, { NewsletterRow, SummaryRow } from './db'
import { sendSlackMessage, formatNewsletterSummary } from './slack'

export interface NewsletterSummary {
  id: string
  subject: string
  sender: string
  senderEmail: string
  receivedAt: string
  summary: string
  keyPoints: string[]
  topics: string[]
  sentiment: 'positive' | 'neutral' | 'negative'
  readTime: number
}

export interface CombinedDigest {
  generatedAt: string
  totalNewsletters: number
  themes: {
    theme: string
    description: string
    relatedNewsletters: string[]
  }[]
  highlights: string[]
  actionItems: string[]
}

import OpenAI from 'openai'

// Initialize OpenAI client
const openai = process.env.OPENAI_API_KEY 
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null

// Ollama API client with timeout
async function callOllama(prompt: string, systemPrompt: string): Promise<string> {
  const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434'
  const model = process.env.OLLAMA_MODEL || 'llama3.2'
  const timeoutMs = 180000 // 3 minutes timeout

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)

  try {
    const response = await fetch(`${ollamaUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        prompt: `${systemPrompt}\n\n${prompt}`,
        stream: false,
        format: 'json',
        options: {
          temperature: 0.3,
        },
      }),
      signal: controller.signal,
    })

    clearTimeout(timeout)

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.response
  } catch (error) {
    clearTimeout(timeout)
    if (error.name === 'AbortError') {
      throw new Error('Ollama request timed out after 3 minutes')
    }
    throw error
  }
}

// OpenAI API call
async function callOpenAI(prompt: string, systemPrompt: string): Promise<string> {
  if (!openai) {
    throw new Error('OpenAI API key not configured')
  }

  try {
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    })

    return response.choices[0]?.message?.content || '{}'
  } catch (error) {
    console.error('OpenAI API error:', error)
    throw error
  }
}

// Choose AI provider based on configuration
async function callAI(prompt: string, systemPrompt: string): Promise<string> {
  // Try OpenAI first if configured
  if (openai) {
    try {
      return await callOpenAI(prompt, systemPrompt)
    } catch (error) {
      console.log('OpenAI failed, falling back to Ollama:', error.message)
      // Fall through to Ollama
    }
  }
  
  // Use Ollama as fallback or if OpenAI not configured
  return callOllama(prompt, systemPrompt)
}

/**
 * Summarize a single newsletter using Ollama
 */
export async function summarizeNewsletter(newsletter: NewsletterRow): Promise<NewsletterSummary> {
  // Check if summary already exists
  const existingSummary = db.prepare(`
    SELECT * FROM summaries WHERE newsletter_id = ?
  `).get(newsletter.id) as SummaryRow | undefined
  
  if (existingSummary) {
    console.log(`✅ Cache hit for newsletter: ${newsletter.subject}`)
    return {
      id: existingSummary.id,
      subject: newsletter.subject,
      sender: newsletter.sender_name,
      senderEmail: newsletter.sender_email,
      receivedAt: newsletter.received_at,
      summary: existingSummary.summary_text,
      keyPoints: existingSummary.key_points,
      topics: existingSummary.topics,
      sentiment: existingSummary.sentiment,
      readTime: existingSummary.read_time_minutes,
    }
  }

  console.log(`🔄 Generating summary for: ${newsletter.subject}`)
  
  const systemPrompt = 'You are an expert at analyzing newsletters and extracting key insights. Always respond with valid JSON.'
  
  const prompt = `Analyze this newsletter and provide a structured summary.

Newsletter Subject: ${newsletter.subject}
From: ${newsletter.sender_name} <${newsletter.sender_email}>

Content:
${newsletter.parsed_body || newsletter.raw_body.substring(0, 8000)}

Respond in JSON format with the following structure:
{
  "summary": "A concise 2-3 sentence summary of the newsletter's main content",
  "keyPoints": ["Key point 1", "Key point 2", "Key point 3", "Key point 4", "Key point 5"],
  "topics": ["topic1", "topic2", "topic3"],
  "sentiment": "positive" | "neutral" | "negative",
  "readTimeMinutes": estimated_reading_time_as_number
}

Focus on extracting actionable insights and the most important information. Keep key points concise but informative.`

  try {
    const responseText = await callAI(prompt, systemPrompt)
    const result = JSON.parse(responseText)

    const summary: NewsletterSummary = {
      id: newsletter.id,
      subject: newsletter.subject,
      sender: newsletter.sender_name,
      senderEmail: newsletter.sender_email,
      receivedAt: newsletter.received_at,
      summary: result.summary || 'Unable to generate summary',
      keyPoints: result.keyPoints || [],
      topics: result.topics || [],
      sentiment: result.sentiment || 'neutral',
      readTime: result.readTimeMinutes || 5,
    }

    // Determine which model was used
    let modelUsed = 'unknown'
    if (openai) {
      modelUsed = process.env.OPENAI_MODEL || 'gpt-4o-mini'
    } else {
      modelUsed = process.env.OLLAMA_MODEL || 'ollama'
    }

    // Save to database
    const stmt = db.prepare(`
      INSERT INTO summaries (
        id, newsletter_id, summary_text, key_points, topics, 
        sentiment, read_time_minutes, model_used
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `)
    
    stmt.run(
      `summary_${newsletter.id}`,
      newsletter.id,
      summary.summary,
      JSON.stringify(summary.keyPoints),
      JSON.stringify(summary.topics),
      summary.sentiment,
      summary.readTime,
      modelUsed
    )
    
    console.log(`💾 Saved summary for: ${newsletter.subject}`)

    // Send to Slack if configured
    await sendSlackMessage(formatNewsletterSummary(summary))

    return summary
  } catch (error) {
    console.error('Error summarizing newsletter:', error)
    throw error
  }
}

/**
 * Generate combined digest from multiple summaries
 */
export async function generateCombinedDigest(
  summaries: NewsletterSummary[]
): Promise<CombinedDigest> {
  if (summaries.length === 0) {
    return {
      generatedAt: new Date().toISOString(),
      totalNewsletters: 0,
      themes: [],
      highlights: [],
      actionItems: [],
    }
  }

  const summariesText = summaries
    .map(
      (s) =>
        `Newsletter: ${s.subject}\nFrom: ${s.sender}\nSummary: ${s.summary}\nKey Points: ${s.keyPoints.join('; ')}\nTopics: ${s.topics.join(', ')}`
    )
    .join('\n\n---\n\n')

  const systemPrompt = 'You are an expert at synthesizing information from multiple sources and identifying patterns. Always respond with valid JSON.'
  
  const prompt = `Analyze these newsletter summaries and create a combined digest that identifies themes across all newsletters.

${summariesText}

Respond in JSON format with the following structure:
{
  "themes": [
    {
      "theme": "Theme name",
      "description": "Description of how this theme appears across newsletters",
      "relatedNewsletters": ["Newsletter subject 1", "Newsletter subject 2"]
    }
  ],
  "highlights": ["Most important highlight 1", "Most important highlight 2", "Most important highlight 3"],
  "actionItems": ["Action item or recommendation 1", "Action item or recommendation 2"]
}

Identify 2-4 major themes that appear across multiple newsletters. Extract the top 3-5 most important highlights and any actionable recommendations.`

  try {
    const responseText = await callAI(prompt, systemPrompt)
    const result = JSON.parse(responseText)

    return {
      generatedAt: new Date().toISOString(),
      totalNewsletters: summaries.length,
      themes: result.themes || [],
      highlights: result.highlights || [],
      actionItems: result.actionItems || [],
    }
  } catch (error) {
    console.error('Error generating combined digest:', error)
    throw error
  }
}

/**
 * Process newsletters and generate summaries
 */
export async function processNewsletters(
  newsletterIds: string[]
): Promise<{
  summaries: NewsletterSummary[]
  digest: CombinedDigest
}> {
  const summaries: NewsletterSummary[] = []
  
  for (const newsletterId of newsletterIds) {
    const newsletter = db.prepare(`
      SELECT * FROM newsletters WHERE id = ?
    `).get(newsletterId) as NewsletterRow | undefined
    
    if (!newsletter) {
      console.warn(`Newsletter ${newsletterId} not found`)
      continue
    }
    
    const summary = await summarizeNewsletter(newsletter)
    summaries.push(summary)
  }
  
  // Generate combined digest
  const digest = await generateCombinedDigest(summaries)
  
  return { summaries, digest }
}