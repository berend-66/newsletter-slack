import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Newsletter Digest',
  description: 'AI-powered newsletter summaries from RSS feeds',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} mesh-bg min-h-screen`}>
        <div className="min-h-screen flex flex-col">
          <header className="glass-card mx-4 mt-4 mb-8">
            <div className="max-w-7xl mx-auto px-6 py-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                  <h1 className="text-3xl font-bold bg-gradient-to-r from-[#00e676] to-[#ffca28] bg-clip-text text-transparent">
                    Newsletter Digest
                  </h1>
                  <p className="text-text-secondary mt-2">
                    AI-powered summaries from your favorite newsletters
                  </p>
                </div>
                <div className="mt-4 md:mt-0 flex items-center space-x-4">
                  <div className="px-3 py-1 bg-green-900/30 text-green-400 rounded-full text-sm font-medium">
                    RSS Powered
                  </div>
                  <div className="px-3 py-1 bg-blue-900/30 text-blue-400 rounded-full text-sm font-medium">
                    No Email Needed
                  </div>
                </div>
              </div>
            </div>
          </header>
          
          <main className="flex-1 max-w-7xl mx-auto px-4 pb-12 w-full">
            {children}
          </main>
          
          <footer className="mt-auto border-t border-card-border py-6">
            <div className="max-w-7xl mx-auto px-4 text-center text-text-secondary text-sm">
              <p>Automatically collects and summarizes newsletters via RSS feeds.</p>
              <p className="mt-1">No email forwarding required. Bypasses corporate restrictions.</p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}