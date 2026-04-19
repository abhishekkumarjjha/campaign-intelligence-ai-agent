# RAIN AI Campaign Intelligence Platform

AI-powered mobile campaign analytics for banks and credit unions. Upload any campaign CSV — Claude automatically understands the data structure and generates dashboards, analysis, and client-ready reports.

## What it does

- **Smart CSV parsing** — upload any campaign data format; Claude figures out the columns automatically
- **Visual dashboard** — impressions by location, spend by demographic, weekly performance trend
- **AI executive summary** — Claude generates analyst-quality campaign narrative and recommendations
- **One-click email report** — sends formatted HTML report directly to client inbox

## Local development

```bash
npm install
cp .env.example .env.local
# Add your Anthropic API key to .env.local
npm run dev
```

## Deploy to Vercel

1. Push this repo to GitHub
2. Go to vercel.com → New Project → Import your repo
3. Add environment variables in Vercel dashboard:
   - `VITE_ANTHROPIC_API_KEY` — required
   - `VITE_EMAILJS_SERVICE_ID` — optional, for real email sending
   - `VITE_EMAILJS_TEMPLATE_ID` — optional
   - `VITE_EMAILJS_PUBLIC_KEY` — optional
4. Deploy — Vercel auto-detects Vite

## EmailJS setup (for real email sending)

1. Create free account at emailjs.com
2. Add an email service (Gmail works)
3. Create a template with variables: `{{to_email}}`, `{{subject}}`, `{{html_content}}`
4. Copy Service ID, Template ID, Public Key to your env vars

## CSV format

Any CSV with campaign data works. Claude will automatically detect:
- Location/geographic columns
- Impression, click, conversion, spend columns
- Demographic/segment columns
- Date/time columns for trend analysis

Example columns it understands: `location`, `impressions`, `clicks`, `conversions`, `spend`, `ctr`, `age_group`, `date`, `week`, `campaign_name`, etc.

## Stack

- React 18 + Vite
- Recharts for visualizations
- Claude Haiku API for AI analysis and CSV parsing
- EmailJS for email delivery
