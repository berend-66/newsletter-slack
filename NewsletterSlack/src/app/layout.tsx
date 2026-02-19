import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Newsletter Slack Summarizer',
  description: 'Summarize newsletters forwarded to Slack',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-gray-50">
          <header className="bg-white shadow-sm border-b">
            <div className="max-w-7xl mx-auto px-4 py-4">
              <h1 className="text-2xl font-bold text-gray-900">
                Newsletter Slack Summarizer
              </h1>
              <p className="text-gray-600 mt-1">
                Bypass corporate email restrictions by forwarding newsletters to Slack
              </p>
            </div>
          </header>
          <main className="max-w-7xl mx-auto px-4 py-8">
            {children}
          </main>
          <footer className="mt-auto border-t bg-white py-4">
            <div className="max-w-7xl mx-auto px-4 text-center text-gray-500 text-sm">
              <p>Forward newsletters to Slack webhook for automatic summarization.</p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}