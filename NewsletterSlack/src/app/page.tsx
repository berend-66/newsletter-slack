import Link from 'next/link'
import { Mail, Sparkles, TrendingUp, Clock, RefreshCw } from 'lucide-react'

export default function Home() {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="bg-white rounded-xl shadow-sm p-6 border">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Newsletter Slack Summarizer
            </h1>
            <p className="text-gray-600">
              Forward newsletters to Slack for automatic AI-powered summaries.
            </p>
          </div>
          <div className="hidden md:flex items-center space-x-2 text-sm text-gray-500">
            <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full font-medium">
              Ready for Setup
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Newsletters</p>
              <p className="text-2xl font-bold mt-1">0</p>
            </div>
            <Mail className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Summarized</p>
              <p className="text-2xl font-bold mt-1">0</p>
            </div>
            <Sparkles className="w-8 h-8 text-amber-500" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Themes</p>
              <p className="text-2xl font-bold mt-1">0</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Avg. Read Time</p>
              <p className="text-2xl font-bold mt-1">5m</p>
            </div>
            <Clock className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Setup Instructions */}
      <div className="bg-white rounded-xl shadow-sm p-6 border">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Setup Instructions</h2>
        
        <div className="space-y-4">
          <div className="flex items-start space-x-4 p-4 bg-blue-50 rounded-lg">
            <div className="bg-blue-100 p-2 rounded">
              <span className="font-bold text-blue-800">1</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Forward Emails to Slack</h3>
              <p className="text-gray-600 mt-1">
                Forward newsletter emails to: 
                <code className="ml-2 px-2 py-1 bg-gray-100 rounded text-sm font-mono">
                  newsletters-aaaatcmndfl3mhdhzg7d6kyymy@clawdbot-lba3492.slack.com
                </code>
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-4 p-4 bg-green-50 rounded-lg">
            <div className="bg-green-100 p-2 rounded">
              <span className="font-bold text-green-800">2</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Automatic Summarization</h3>
              <p className="text-gray-600 mt-1">
                Newsletters are automatically parsed and summarized using AI (OpenAI or Ollama).
              </p>
            </div>
          </div>
          
          <div className="flex items-start space-x-4 p-4 bg-amber-50 rounded-lg">
            <div className="bg-amber-100 p-2 rounded">
              <span className="font-bold text-amber-800">3</span>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Get Insights</h3>
              <p className="text-gray-600 mt-1">
                View summaries in Slack or on this dashboard. Identify themes across multiple newsletters.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Configuration Status */}
      <div className="bg-white rounded-xl shadow-sm p-6 border">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Configuration Status</h2>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span>Database Connection</span>
            </div>
            <span className="text-sm text-green-600 font-medium">Ready</span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 rounded-full bg-amber-500"></div>
              <span>Slack Integration</span>
            </div>
            <span className="text-sm text-amber-600 font-medium">Pending Bot Token</span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span>Email Parser</span>
            </div>
            <span className="text-sm text-green-600 font-medium">Ready</span>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className="w-2 h-2 rounded-full bg-amber-500"></div>
              <span>AI Summarization</span>
            </div>
            <span className="text-sm text-amber-600 font-medium">Configure API Key</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white rounded-xl shadow-sm p-6 border">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Ready to Start?</h3>
            <p className="text-gray-600 mt-1">
              Complete the setup by providing Slack bot token and configuring AI.
            </p>
          </div>
          <div className="flex space-x-3">
            <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors">
              <RefreshCw className="w-4 h-4 inline mr-2" />
              Check Status
            </button>
            <Link 
              href="/api/newsletters" 
              className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              View API
            </Link>
          </div>
        </div>
      </div>

      {/* Footer Note */}
      <div className="text-center text-gray-500 text-sm">
        <p>
          Need help? Check the{" "}
          <Link href="https://github.com/yourusername/newsletter-slack" className="text-blue-600 hover:underline">
            documentation
          </Link>
          {" "}or{" "}
          <Link href="/api/health" className="text-blue-600 hover:underline">
            health status
          </Link>
          .
        </p>
      </div>
    </div>
  )
}