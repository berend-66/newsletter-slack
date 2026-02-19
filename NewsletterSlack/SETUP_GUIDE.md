# Newsletter Slack Setup Guide

## **Overview**
This guide walks you through setting up the Newsletter Slack summarizer app. Once configured, forwarding newsletters to your Slack channel will trigger automatic AI-powered summaries.

## **Prerequisites**
- Slack workspace with email integration enabled for a channel
- OpenAI API key (recommended) or Ollama running locally
- [Vercel](https://vercel.com) account (free tier) for deployment

---

## **Step 1: Slack App Configuration**

### **1.1 Add Required Bot Token Scopes**
Go to [api.slack.com/apps](https://api.slack.com/apps) → Your app → **"OAuth & Permissions"**:

1. Under **"Scopes"** → **"Bot Token Scopes"**, add:
   - `channels:history` (read messages)
   - `chat:write` (send messages)
   - `groups:history` (if using private channel)
   - `files:read` (read .eml attachments)
   - `channels:read` (channel info)

### **1.2 Install App & Get Bot Token**
1. Scroll to **"OAuth Tokens for Your Workspace"**
2. Click **"Install to Workspace"** (or "Reinstall App")
3. Authorize the app with requested permissions
4. Copy the **"Bot User OAuth Token"** (starts with `xoxb-...`)

### **1.3 Get Channel ID**
1. Open your Slack channel where emails appear
2. Click channel name → **"Copy link"**
3. Extract ID after `/channels/` (e.g., `C1234567890`)
   - For private channels: ID after `/group/` or `/mpdm/`

### **1.4 Note Your Signing Secret**
- Already have: `f110ada983669d1120dfbf2b3e5b1e69`

---

## **Step 2: Environment Configuration**

### **2.1 Create `.env.local` File**
Copy `.env.local.example` to `.env.local` and update:

```bash
# Slack Configuration
SLACK_BOT_TOKEN=xoxb-your-actual-bot-token
SLACK_SIGNING_SECRET=f110ada983669d1120dfbf2b3e5b1e69
SLACK_CHANNEL_ID=your-channel-id-here

# OpenAI Configuration (recommended)
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_MODEL=gpt-4o-mini  # Low cost, effective

# Ollama Configuration (optional fallback)
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2

# App URL (update after deployment)
APP_URL=https://your-deployment.vercel.app

# Newsletter Detection
NEWSLETTER_SENDERS=substack.com,beehiiv.com,datadrivenvc.io
```

### **2.2 Get OpenAI API Key** (optional but recommended)
1. Go to [platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Create new key
3. Use `gpt-4o-mini` model (low cost: ~$0.15/1M tokens)

---

## **Step 3: Deployment (Vercel)**

### **3.1 Deploy to Vercel**
1. Push code to GitHub repository
2. Go to [vercel.com/new](https://vercel.com/new)
3. Import your GitHub repository
4. Configure environment variables (from Step 2)
5. Deploy

### **3.2 Vercel Environment Variables**
Add these in Vercel project settings → **"Environment Variables"**:
- `SLACK_BOT_TOKEN`
- `SLACK_SIGNING_SECRET` 
- `SLACK_CHANNEL_ID`
- `OPENAI_API_KEY` (optional)
- `OPENAI_MODEL` (optional, default: `gpt-4o-mini`)
- `APP_URL` (auto-set by Vercel)

### **3.3 Get Deployment URL**
After deployment, note your app URL:
- Format: `https://your-app-name.vercel.app`

---

## **Step 4: Slack Event Subscriptions**

### **4.1 Configure Request URL**
Go to [api.slack.com/apps](https://api.slack.com/apps) → Your app:

1. **"Event Subscriptions"** in sidebar
2. Enable **"Enable Events"**
3. Set **"Request URL"** to:
   ```
   https://your-app.vercel.app/api/slack/events
   ```
4. Slack will verify the URL (must return challenge)

### **4.2 Subscribe to Events**
Under **"Subscribe to bot events"**, add:
- `message.channels` (for public channels)
- `message.groups` (for private channels)

### **4.3 Save Changes**
Click **"Save Changes"** and reinstall app if prompted.

---

## **Step 5: Testing**

### **5.1 Test Webhook Endpoint**
Visit in browser:
```
https://your-app.vercel.app/api/health
```
Should return: `{"status":"healthy"}`

### **5.2 Test with Sample Email**
Send a test newsletter to your Slack channel email:
```
newsletters-aaaatcmndfl3mhdhzg7d6kyymy@clawdbot-lba3492.slack.com
```

### **5.3 Check Results**
Within 1-2 minutes, you should see:
1. Email appears in Slack channel
2. App processes email
3. AI summary posted as reply in channel

### **5.4 View Dashboard**
Visit your app URL to see newsletter dashboard:
```
https://your-app.vercel.app
```

---

## **Step 6: Production Considerations**

### **6.1 Database Persistence**
Vercel uses ephemeral storage (`/tmp/`). For production:
- Use **Railway** (persistent SQLite)
- Or **Supabase** (PostgreSQL)
- Update `DATABASE_URL` accordingly

### **6.2 Error Monitoring**
- Check Vercel logs
- Monitor Slack event deliveries
- Check database for parsed newsletters

### **6.3 Scaling**
- Limit: ~10 newsletters/hour (Vercel free tier)
- Consider rate limiting
- Cache summaries to reduce AI costs

---

## **Troubleshooting**

### **No summaries appearing?**
1. Check Vercel logs for errors
2. Verify Slack event subscription is enabled
3. Confirm bot has correct channel permissions
4. Test webhook manually with sample email

### **"Invalid signature" error?**
1. Verify `SLACK_SIGNING_SECRET` matches your app
2. Check request timestamp (must be within 5 minutes)

### **AI summarization failing?**
1. Check OpenAI API key is valid
2. Try Ollama fallback
3. Check token limits (newsletters too long)

### **Email not detected as newsletter?**
1. Check `NEWSLETTER_SENDERS` includes your domains
2. Verify email contains "unsubscribe" or newsletter keywords
3. Check parsed email format

---

## **Support**
- Check app logs in Vercel dashboard
- Test individual endpoints:
  - `/api/health` - Health check
  - `/api/newsletters` - List newsletters (GET)
  - `/api/webhook/email` - Manual email submission (POST)

---

## **Next Features** (planned)
- Scheduled digests (Monday/Wednesday summaries)
- Newsletter categorization
- User preferences (which newsletters to summarize)
- Team sharing features
- Email filtering rules

**Deployment Time:** ~15-20 minutes after getting bot token
**Cost:** Free (Vercel + OpenAI minimal usage)