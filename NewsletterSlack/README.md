# Newsletter Slack

Slack-based newsletter summarizer that bypasses corporate email restrictions by using email forwarding to Slack instead of Microsoft Graph.

## Features

- **Email ingestion via webhook** - Forward emails to a webhook endpoint
- **Email parsing** - Handle raw MIME, HTML, and forwarded email formats
- **Newsletter detection** - Auto-detect newsletters based on patterns
- **AI summarization** - Summarize using Ollama or OpenAI
- **Cross-newsletter analysis** - Identify themes across multiple newsletters
- **Slack integration** - Post summaries to Slack channels
- **Web dashboard** - View and search newsletters and summaries
- **Scheduled digests** - Monday/Wednesday automated summaries

## Architecture

### Data Flow
```
Email received → 
Forwarded to webhook (/api/webhook/email) → 
Parse email (sender, subject, body) → 
Store in SQLite database → 
Queue for summarization → 
Summarize using AI (Ollama/OpenAI) → 
Store summary → 
Deliver via Slack + web dashboard
```

### Database Schema
- **newsletters** - Raw and parsed email data
- **summaries** - AI-generated summaries with key points
- **digests** - Combined insights across multiple newsletters

### API Endpoints
- `POST /api/webhook/email` - Receive forwarded emails
- `GET /api/newsletters` - List newsletters with summaries
- `POST /api/newsletters/:id/summarize` - Trigger summarization
- `GET /api/summaries` - Get combined digest
- `POST /api/slack/events` - Slack event handler

## Setup

### 1. Prerequisites
- Node.js 18+
- SQLite (file-based, no setup needed)
- Slack workspace (for app integration)
- Ollama (optional, for local summarization) or OpenAI API key

### 2. Installation
```bash
cd NewsletterSlack
npm install
```

### 3. Configuration
Create `.env.local`:
```env
# Slack
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_CLIENT_ID=your-client-id
SLACK_CLIENT_SECRET=your-client-secret

# App
APP_URL=https://your-deployment.vercel.app
NEXTAUTH_SECRET=generate-with: openssl rand -base64 32

# Database
DATABASE_URL=file:./newsletters.db

# AI (choose one or both)
OPENAI_API_KEY=sk-your-key  # Optional
OLLAMA_URL=http://localhost:11434  # Optional
OLLAMA_MODEL=llama3.2  # Optional
```

### 4. Slack App Setup
1. Create Slack app at [api.slack.com/apps](https://api.slack.com/apps)
2. Add bot token scopes: `channels:history`, `chat:write`, `files:read`
3. Install to workspace, copy bot token
4. Configure Event Subscriptions (optional, for direct Slack integration)
5. Or use email forwarding to webhook (recommended)

### 5. Email Forwarding
**Option A: Webhook proxy (recommended)**
1. Use service like Pipedream, Zapier, or ForwardEmail.net
2. Set up email → webhook workflow
3. Forward emails to service's email address
4. Configure to POST to `/api/webhook/email`

**Option B: Slack direct**
1. Get channel email: `#channel-name@workspace.slack.com`
2. Forward emails to this address
3. Slack posts to channel, app listens via Events API

### 6. Running
```bash
# Development
npm run dev

# Production build
npm run build
npm start
```

## Usage

### Adding Newsletters
1. Forward newsletter emails to configured webhook or Slack channel
2. Emails are automatically parsed and stored
3. Summaries are generated (manual trigger or scheduled)

### Viewing Summaries
- **Web dashboard**: Visit `http://localhost:3000`
- **Slack**: Summaries posted to configured channel
- **API**: `GET /api/newsletters` returns JSON data

### Generating Digests
- **Manual**: `POST /api/digests/generate`
- **Scheduled**: Monday/Wednesday 9:00 AM (configurable)
- **Slash command**: `/newsletter-digest` in Slack

## Development

### Project Structure
```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── webhook/       # Email webhook
│   │   ├── newsletters/   # Newsletter API
│   │   └── slack/         # Slack events
│   └── page.tsx           # Dashboard
├── lib/                   # Utilities
│   ├── database.ts        # Database interface
│   ├── email-parser.ts    # Email parsing
│   ├── slack-client.ts    # Slack integration
│   └── summarizer.ts      # AI summarization
└── types/                 # TypeScript types
```

### Extending
- **Add new AI providers**: Implement `Summarizer` interface
- **Add new storage**: Implement `Database` interface
- **Add new delivery**: Slack, email, webhook handlers
- **Custom parsing**: Modify `email-parser.ts`

## Deployment

### Vercel (Recommended)
```bash
# Push to GitHub
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/newsletter-slack.git
git push -u origin main

# Import to Vercel and add environment variables
```

### Railway
```bash
railway init
railway add --plugin postgresql  # or keep SQLite
railway up
```

## Troubleshooting

### Emails not parsed
- Check webhook endpoint is accessible
- Verify email format (raw MIME recommended)
- Check database connection

### No summaries generated
- Verify AI provider is configured (Ollama/OpenAI)
- Check API keys/tokens
- Review logs for errors

### Slack integration not working
- Verify bot token has correct scopes
- Check Slack app is installed to channel
- Verify Event Subscriptions URL is correct

## Contributing
1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request

## License
MIT

## Acknowledgments
- Built on Next.js 14
- Email parsing with `mailparser`
- Slack integration with `@slack/web-api`
- AI summarization with Ollama/OpenAI