import Link from 'next/link'
import { 
  Mail, 
  Clock, 
  ExternalLink, 
  Sparkles,
  Calendar,
  Tag,
  BookOpen,
  ChevronRight
} from 'lucide-react'
import db from '@/lib/db'

interface Newsletter {
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
  summary?: {
    id: string
    newsletter_id: string
    summary_text: string
    key_points: string[]
    topics: string[]
    sentiment: 'positive' | 'neutral' | 'negative'
    read_time_minutes: number
    model_used: string
    created_at: string
  } | null
}

async function getNewsletters(limit: number = 50, offset: number = 0): Promise<{
  newsletters: Newsletter[]
  total: number
}> {
  try {
    const newsletters = db.prepare(`
      SELECT 
        n.*,
        s.id as summary_id,
        s.summary_text,
        s.key_points,
        s.topics,
        s.sentiment,
        s.read_time_minutes,
        s.model_used,
        s.created_at as summary_created_at
      FROM newsletters n
      LEFT JOIN summaries s ON n.id = s.newsletter_id
      ORDER BY n.received_at DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset) as any[]

    const totalResult = db.prepare(`
      SELECT COUNT(*) as total FROM newsletters
    `).get() as { total: number }

    return {
      newsletters: newsletters.map(row => ({
        id: row.id,
        external_id: row.external_id,
        subject: row.subject,
        sender_name: row.sender_name,
        sender_email: row.sender_email,
        received_at: row.received_at,
        raw_body: row.raw_body,
        parsed_body: row.parsed_body,
        is_newsletter: row.is_newsletter === 1,
        created_at: row.created_at,
        summary: row.summary_id ? {
          id: row.summary_id,
          newsletter_id: row.newsletter_id,
          summary_text: row.summary_text,
          key_points: typeof row.key_points === 'string' ? JSON.parse(row.key_points) : row.key_points,
          topics: typeof row.topics === 'string' ? JSON.parse(row.topics) : row.topics,
          sentiment: row.sentiment,
          read_time_minutes: row.read_time_minutes,
          model_used: row.model_used,
          created_at: row.summary_created_at
        } : null
      })),
      total: totalResult?.total || 0
    }
  } catch (error) {
    console.error('Error fetching newsletters:', error)
    return { newsletters: [], total: 0 }
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

function truncateText(text: string, length: number = 200): string {
  if (!text) return ''
  if (text.length <= length) return text
  return text.substring(0, length) + '...'
}

function getSentimentColor(sentiment: string): string {
  switch (sentiment) {
    case 'positive': return 'bg-green-500/20 text-green-400'
    case 'negative': return 'bg-red-500/20 text-red-400'
    default: return 'bg-gray-500/20 text-gray-400'
  }
}

export default async function NewslettersPage() {
  const { newsletters, total } = await getNewsletters(50, 0)
  
  return (
    <div className="min-h-screen bg-background text-text-primary">
      {/* Header */}
      <div className="glass-card p-8 mb-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex-1">
            <h1 className="text-4xl font-bold mb-3">Newsletter Digest</h1>
            <p className="text-text-secondary text-lg mb-4">
              {total} newsletters collected from RSS feeds
            </p>
            <div className="flex flex-wrap gap-3 mt-6">
              <div className="px-4 py-2 bg-blue-900/30 text-blue-400 rounded-full text-sm font-medium flex items-center gap-2">
                <Mail size={16} />
                <span>{total} Newsletters</span>
              </div>
              <div className="px-4 py-2 bg-purple-900/30 text-purple-400 rounded-full text-sm font-medium flex items-center gap-2">
                <Sparkles size={16} />
                <span>{newsletters.filter(n => n.summary).length} Summarized</span>
              </div>
              <div className="px-4 py-2 bg-green-900/30 text-green-400 rounded-full text-sm font-medium flex items-center gap-2">
                <Calendar size={16} />
                <span>{formatDate(new Date().toISOString())}</span>
              </div>
            </div>
          </div>
          <div className="flex-shrink-0">
            <div className="relative">
              <div className="w-24 h-24 bg-gradient-to-br from-[#00e676]/20 to-[#ffca28]/20 rounded-2xl flex items-center justify-center">
                <BookOpen size={48} className="text-[#00e676]" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Newsletter List */}
      <div className="space-y-6">
        {newsletters.length === 0 ? (
          <div className="glass-card p-12 text-center">
            <Mail size={48} className="mx-auto text-text-secondary mb-4" />
            <h2 className="text-2xl font-bold mb-2">No newsletters yet</h2>
            <p className="text-text-secondary mb-6">
              Click "Collect Now" on the dashboard to fetch newsletters from RSS feeds.
            </p>
            <Link 
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/80 transition-colors"
            >
              <Sparkles size={20} />
              Go to Dashboard
            </Link>
          </div>
        ) : (
          <>
            {/* Stats Bar */}
            <div className="flex items-center justify-between mb-6">
              <div className="text-text-secondary">
                Showing {newsletters.length} of {total} newsletters
              </div>
              <div className="flex items-center gap-4">
                <Link 
                  href="/api/newsletters?format=json"
                  className="text-sm text-text-secondary hover:text-primary transition-colors"
                  target="_blank"
                >
                  View as JSON
                </Link>
                <Link 
                  href="/"
                  className="text-sm text-text-secondary hover:text-primary transition-colors flex items-center gap-1"
                >
                  <ChevronRight size={16} className="rotate-180" />
                  Back to Dashboard
                </Link>
              </div>
            </div>

            {/* Newsletter Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {newsletters.map((newsletter) => (
                <div 
                  key={newsletter.id}
                  className="glass-card p-6 hover:bg-card-bg/80 transition-colors cursor-pointer group"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                        {newsletter.subject}
                      </h3>
                      <p className="text-sm text-text-secondary mb-1">
                        {newsletter.sender_name}
                      </p>
                      <p className="text-xs text-text-tertiary">
                        {formatDate(newsletter.received_at)}
                      </p>
                    </div>
                    {newsletter.external_id && (
                      <a 
                        href={newsletter.external_id}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 p-2 hover:bg-card-border/20 rounded-lg transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink size={16} className="text-text-secondary" />
                      </a>
                    )}
                  </div>

                  {/* Summary Preview */}
                  {newsletter.summary ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles size={16} className="text-[#ffca28]" />
                        <span className="text-sm font-medium">AI Summary</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${getSentimentColor(newsletter.summary.sentiment)}`}>
                          {newsletter.summary.sentiment}
                        </span>
                        <span className="text-xs text-text-tertiary ml-auto">
                          {newsletter.summary.read_time_minutes} min read
                        </span>
                      </div>
                      <p className="text-sm text-text-secondary line-clamp-3">
                        {truncateText(newsletter.summary.summary_text, 150)}
                      </p>
                      
                      {/* Key Points */}
                      {newsletter.summary.key_points && newsletter.summary.key_points.length > 0 && (
                        <div className="mt-3">
                          <div className="text-xs font-medium text-text-tertiary mb-1">Key Points</div>
                          <ul className="space-y-1">
                            {newsletter.summary.key_points.slice(0, 2).map((point: string, index: number) => (
                              <li key={index} className="text-sm text-text-secondary flex items-start gap-2">
                                <span className="text-primary mt-1">•</span>
                                <span>{truncateText(point, 80)}</span>
                              </li>
                            ))}
                          </ul>
                          {newsletter.summary.key_points.length > 2 && (
                            <div className="text-xs text-text-tertiary mt-1">
                              +{newsletter.summary.key_points.length - 2} more
                            </div>
                          )}
                        </div>
                      )}

                      {/* Topics */}
                      {newsletter.summary.topics && newsletter.summary.topics.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {newsletter.summary.topics.slice(0, 3).map((topic: string, index: number) => (
                            <span 
                              key={index}
                              className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full"
                            >
                              {topic}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-amber-500">
                        <Sparkles size={16} />
                        <span className="text-sm font-medium">No AI Summary Yet</span>
                      </div>
                      <p className="text-sm text-text-secondary line-clamp-3">
                        {truncateText(newsletter.parsed_body || newsletter.raw_body.substring(0, 200), 200)}
                      </p>
                      <div className="text-xs text-text-tertiary italic">
                        Add OpenRouter API key to enable AI summarization
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="mt-6 pt-4 border-t border-card-border flex items-center justify-between">
                    <div className="text-xs text-text-tertiary">
                      {newsletter.is_newsletter ? 'Newsletter' : 'Regular Email'}
                    </div>
                    <div className="text-xs text-text-tertiary">
                      via {newsletter.sender_email.includes('@rss.feed') ? 'RSS' : 'Email'}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {newsletters.length < total && (
              <div className="glass-card p-6 text-center mt-8">
                <p className="text-text-secondary mb-4">
                  Showing {newsletters.length} of {total} newsletters
                </p>
                <button
                  className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/80 transition-colors"
                  onClick={() => {
                    // TODO: Implement pagination
                    alert('Pagination coming soon!')
                  }}
                >
                  Load More
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="mt-12 pt-8 border-t border-card-border text-center text-text-secondary text-sm">
        <p>
          Newsletters collected via RSS feeds. Summaries powered by AI.
          {' '}
          <Link href="/" className="text-primary hover:underline">
            Return to dashboard
          </Link>
        </p>
      </div>
    </div>
  )
}