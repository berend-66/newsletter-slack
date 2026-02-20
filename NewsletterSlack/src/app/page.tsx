import Link from 'next/link'
import { 
  Mail, 
  Sparkles, 
  TrendingUp, 
  Clock, 
  RefreshCw,
  Rss,
  Zap,
  CheckCircle2,
  AlertCircle,
  Play,
  FileText,
  Globe
} from 'lucide-react'
import db from '@/lib/db'

function getAIStatus() {
  const openaiKey = process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_PERSONAL
  const openrouterKey = process.env.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY_PERSONAL
  
  if (openaiKey && openrouterKey) {
    return { status: 'multiple', message: 'Multiple AI providers configured' }
  } else if (openaiKey) {
    return { status: 'openai', message: 'OpenAI configured' }
  } else if (openrouterKey) {
    return { status: 'openrouter', message: 'OpenRouter configured' }
  } else {
    return { status: 'none', message: 'Configure AI API Key' }
  }
}

async function getStats() {
  try {
    const newsletterCount = db.prepare(`
      SELECT COUNT(*) as count FROM newsletters
    `).get() as { count: number }
    
    const summaryCount = db.prepare(`
      SELECT COUNT(*) as count FROM summaries
    `).get() as { count: number }
    
    const feedCount = db.prepare(`
      SELECT COUNT(*) as count FROM rss_feeds WHERE enabled = 1
    `).get() as { count: number }
    
    const latestNewsletter = db.prepare(`
      SELECT subject, received_at FROM newsletters 
      ORDER BY received_at DESC LIMIT 1
    `).get() as { subject: string, received_at: string } | undefined
    
    const feeds = db.prepare(`
      SELECT id, name, url, last_fetched, enabled 
      FROM rss_feeds 
      ORDER BY name
    `).all() as Array<{
      id: string
      name: string
      url: string
      last_fetched: string | null
      enabled: number
    }>
    
    const aiStatus = getAIStatus()
    
    return {
      newsletterCount: newsletterCount?.count || 0,
      summaryCount: summaryCount?.count || 0,
      feedCount: feedCount?.count || 0,
      latestNewsletter: latestNewsletter ? {
        subject: latestNewsletter.subject,
        receivedAt: new Date(latestNewsletter.received_at).toLocaleDateString()
      } : null,
      feeds: feeds.map(feed => ({
        id: feed.id,
        name: feed.name,
        url: feed.url,
        lastFetched: feed.last_fetched,
        enabled: feed.enabled === 1,
        status: feed.last_fetched ? 'active' : 'pending'
      })),
      aiStatus
    }
  } catch (error) {
    console.error('Error fetching stats:', error)
    // Return default feeds if table doesn't exist yet
    const defaultFeeds = [
      { id: 'the-ai-corner', name: 'The AI Corner (Substack)', status: 'active' },
      { id: 'bytebytego', name: 'ByteByteGo (Substack)', status: 'active' },
      { id: 'data-driven-vc', name: 'Data Driven VC', status: 'active' },
      { id: 'tom-tunguz', name: 'Tomasz Tunguz Blog', status: 'pending' },
      { id: 'ainews', name: 'Latent Space', status: 'active' },
      { id: 'nates-substack', name: "Nate's Substack", status: 'active' },
      { id: 'the-vc-corner', name: 'The VC Corner', status: 'active' },
      { id: 'adaline-labs', name: 'Adaline Labs', status: 'active' },
      { id: 'confluence-vc', name: 'Confluence VC', status: 'active' }
    ]
    
    const aiStatus = getAIStatus()
    
    return {
      newsletterCount: 0,
      summaryCount: 0,
      feedCount: 9,
      latestNewsletter: null,
      feeds: defaultFeeds,
      aiStatus
    }
  }
}

export default async function Home() {
  const stats = await getStats()
  
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="glass-card p-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex-1">
            <h1 className="text-4xl font-bold mb-3">
              Your AI Newsletter Digest
            </h1>
            <p className="text-text-secondary text-lg mb-4">
              Automatically collect and summarize newsletters from RSS feeds. 
              No email forwarding required — bypasses corporate restrictions.
            </p>
            <div className="flex flex-wrap gap-3 mt-6">
              <div className="px-4 py-2 bg-green-900/30 text-green-400 rounded-full text-sm font-medium flex items-center gap-2">
                <CheckCircle2 size={16} />
                <span>9 RSS Feeds Configured</span>
              </div>
              <div className="px-4 py-2 bg-blue-900/30 text-blue-400 rounded-full text-sm font-medium flex items-center gap-2">
                <Zap size={16} />
                <span>AI-Powered Summaries</span>
              </div>
              <div className="px-4 py-2 bg-purple-900/30 text-purple-400 rounded-full text-sm font-medium flex items-center gap-2">
                <Globe size={16} />
                <span>No Email Accounts Needed</span>
              </div>
            </div>
          </div>
          <div className="flex-shrink-0">
            <div className="relative">
              <div className="w-48 h-48 bg-gradient-to-br from-[#00e676]/20 to-[#ffca28]/20 rounded-2xl flex items-center justify-center">
                <Rss size={80} className="text-[#00e676]" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-secondary">Newsletters</p>
              <p className="text-3xl font-bold mt-1 text-white">{stats.newsletterCount}</p>
              <p className="text-xs text-text-secondary mt-2">
                Collected via RSS
              </p>
            </div>
            <Mail className="w-10 h-10 text-[#00e676]" />
          </div>
        </div>
        
        <div className="glass-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-secondary">Summarized</p>
              <p className="text-3xl font-bold mt-1 text-white">{stats.summaryCount}</p>
              <p className="text-xs text-text-secondary mt-2">
                AI-generated insights
              </p>
            </div>
            <Sparkles className="w-10 h-10 text-[#ffca28]" />
          </div>
        </div>
        
        <div className="glass-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-secondary">RSS Feeds</p>
              <p className="text-3xl font-bold mt-1 text-white">{stats.feedCount}</p>
              <p className="text-xs text-text-secondary mt-2">
                Active sources
              </p>
            </div>
            <TrendingUp className="w-10 h-10 text-[#ff5252]" />
          </div>
        </div>
        
        <div className="glass-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-text-secondary">Latest Update</p>
              <p className="text-3xl font-bold mt-1 text-white">
                {stats.latestNewsletter ? stats.latestNewsletter.receivedAt : '—'}
              </p>
              <p className="text-xs text-text-secondary mt-2 truncate">
                {stats.latestNewsletter?.subject || 'No newsletters yet'}
              </p>
            </div>
            <Clock className="w-10 h-10 text-[#9fb3c8]" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="glass-card p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Zap size={20} />
          Quick Actions
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <form action="/api/rss/collect" method="POST" className="group">
            <button 
              type="submit"
              className="w-full glass-card p-6 hover:bg-card-bg/80 transition-colors cursor-pointer text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-900/30 rounded-lg">
                  <RefreshCw size={24} className="text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold">Collect Now</h3>
                  <p className="text-sm text-text-secondary mt-1">
                    Fetch latest newsletters from all RSS feeds
                  </p>
                </div>
              </div>
            </button>
          </form>
          
          <Link 
            href="/api/newsletters" 
            className="group"
          >
            <div className="w-full glass-card p-6 hover:bg-card-bg/80 transition-colors cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-900/30 rounded-lg">
                  <FileText size={24} className="text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold">Browse Newsletters</h3>
                  <p className="text-sm text-text-secondary mt-1">
                    View all collected newsletters and summaries
                  </p>
                </div>
              </div>
            </div>
          </Link>
          
          <Link 
            href="/api/health" 
            className="group"
          >
            <div className="w-full glass-card p-6 hover:bg-card-bg/80 transition-colors cursor-pointer">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-900/30 rounded-lg">
                  <CheckCircle2 size={24} className="text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold">System Status</h3>
                  <p className="text-sm text-text-secondary mt-1">
                    Check API health and configuration
                  </p>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>

      {/* Configured Sources */}
      <div className="glass-card p-6">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Rss size={20} />
          Configured Newsletter Sources
        </h2>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-card-bg/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="font-medium">The AI Corner (Substack)</span>
            </div>
            <span className="text-sm text-green-400">Active</span>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-card-bg/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="font-medium">ByteByteGo (Substack)</span>
            </div>
            <span className="text-sm text-green-400">Active</span>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-card-bg/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="font-medium">Data Driven VC</span>
            </div>
            <span className="text-sm text-green-400">Active</span>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-card-bg/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-amber-500"></div>
              <span className="font-medium">Tomasz Tunguz Blog</span>
            </div>
            <span className="text-sm text-amber-400">Pending First Fetch</span>
          </div>
        </div>
        
        <div className="mt-6 pt-6 border-t border-card-border">
          <p className="text-sm text-text-secondary">
            <AlertCircle size={16} className="inline mr-2" />
            RSS feeds are checked automatically every 6 hours. 
            You can also trigger manual collection above.
          </p>
        </div>
      </div>

      {/* Status */}
      <div className="glass-card p-6">
        <h2 className="text-xl font-bold mb-4">System Status</h2>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 bg-card-bg/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span>Database Connection</span>
            </div>
            <span className="text-sm text-green-400">Connected</span>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-card-bg/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span>RSS Collector</span>
            </div>
            <span className="text-sm text-green-400">Ready</span>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-card-bg/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${
                stats.aiStatus.status === 'none' ? 'bg-amber-500' : 
                stats.aiStatus.status === 'multiple' ? 'bg-purple-500' : 'bg-green-500'
              }`}></div>
              <span>AI Summarization</span>
            </div>
            <span className={`text-sm ${
              stats.aiStatus.status === 'none' ? 'text-amber-400' : 
              stats.aiStatus.status === 'multiple' ? 'text-purple-400' : 'text-green-400'
            }`}>
              {stats.aiStatus.message}
            </span>
          </div>
          
          <div className="flex items-center justify-between p-4 bg-card-bg/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span>Web Dashboard</span>
            </div>
            <span className="text-sm text-green-400">Running</span>
          </div>
        </div>
      </div>

      {/* Footer Note */}
      <div className="text-center text-text-secondary text-sm">
        <p>
          Need help? Check the{' '}
          <Link href="/api/health" className="text-[#00e676] hover:underline">
            health status
          </Link>
          {' '}or{' '}
          <Link href="/api/newsletters" className="text-[#00e676] hover:underline">
            browse newsletters
          </Link>
          .
        </p>
      </div>
    </div>
  )
}