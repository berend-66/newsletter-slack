import { WebClient } from '@slack/web-api'

// Initialize Slack client
const slackToken = process.env.SLACK_BOT_TOKEN
const slackChannel = process.env.SLACK_CHANNEL_ID

let client: WebClient | null = null

if (slackToken) {
  client = new WebClient(slackToken)
}

export interface SlackMessage {
  text: string
  blocks?: any[]
  attachments?: any[]
}

/**
 * Send a message to Slack channel
 */
export async function sendSlackMessage(message: SlackMessage): Promise<boolean> {
  if (!client || !slackChannel) {
    console.warn('Slack bot token or channel not configured')
    return false
  }
  
  try {
    const result = await client.chat.postMessage({
      channel: slackChannel,
      text: message.text,
      blocks: message.blocks,
      attachments: message.attachments,
    })
    
    return result.ok === true
  } catch (error) {
    console.error('Error sending Slack message:', error)
    return false
  }
}

/**
 * Format a newsletter summary for Slack
 */
export function formatNewsletterSummary(summary: {
  id: string
  subject: string
  sender: string
  summary: string
  keyPoints: string[]
  topics: string[]
  sentiment: string
  readTime: number
}): SlackMessage {
  const sentimentEmoji = {
    positive: '✅',
    neutral: '➖',
    negative: '⚠️'
  }[summary.sentiment] || '➖'
  
  const keyPointsText = summary.keyPoints
    .map((point, i) => `${i + 1}. ${point}`)
    .join('\n')
  
  const topicsText = summary.topics.join(', ')
  
  return {
    text: `📬 *${summary.subject}*\nFrom: ${summary.sender}\n\n${summary.summary}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `📬 ${summary.subject}`,
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*From:*\n${summary.sender}`
          },
          {
            type: 'mrkdwn',
            text: `*Sentiment:*\n${sentimentEmoji} ${summary.sentiment}`
          },
          {
            type: 'mrkdwn',
            text: `*Read time:*\n${summary.readTime} min`
          },
          {
            type: 'mrkdwn',
            text: `*Topics:*\n${topicsText}`
          }
        ]
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Summary:*\n${summary.summary}`
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*Key Points:*\n${keyPointsText}`
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `ID: ${summary.id}`
          }
        ]
      }
    ]
  }
}

/**
 * Send a simple notification to Slack
 */
export async function notifySlack(text: string): Promise<boolean> {
  return sendSlackMessage({ text })
}