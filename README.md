# LeaseIQ - Commercial Real Estate Lease Intelligence Platform

LeaseIQ is a professional SaaS platform for commercial real estate teams to upload, abstract, analyze, and manage their entire lease portfolio using AI-powered extraction.

## Features

- **AI Lease Extraction** - Upload any PDF lease and Claude AI extracts all 35+ critical terms automatically
- **Portfolio Dashboard** - See your entire portfolio health at a glance
- **Critical Dates Calendar** - Never miss a renewal deadline or option exercise date
- **Automated Alerts** - Get notified at 365/180/90/60/30/14/7 days before critical dates
- **Inline Editing** - Correct any extracted field directly in the UI
- **Comparison View** - Compare 2+ leases side-by-side with highlighted differences
- **Full-Text Search** - Search across all lease documents for any clause
- **Export** - Download abstracts as Excel or CSV

## Setup

### Prerequisites

- Node.js 18+
- An Anthropic API key (get one at console.anthropic.com)

### Installation

```bash
cd leaseiq
npm install
cp .env.example .env.local
# Edit .env.local and add your API key
```

### Environment Variables

```
ANTHROPIC_API_KEY=your_key_here
NEXTAUTH_SECRET=any_random_string_here
NEXTAUTH_URL=http://localhost:3000
```

### Running

```bash
npm run dev
```

Open http://localhost:3000. The SQLite database (`leaseiq.db`) and uploads folder are created automatically.

## Tech Stack

- Next.js 16 (App Router), TypeScript, Tailwind CSS v4
- SQLite via better-sqlite3
- Anthropic Claude claude-sonnet-4-6
- NextAuth.js with bcrypt
- pdf-parse for text extraction
- xlsx for Excel export
