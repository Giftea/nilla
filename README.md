# Nilla

**From wanting to contribute to actually shipping PRs.**

![Dashboard](./app/Dashboard.png)

Nilla is an open-source contributor consistency coach that helps developers build sustainable open-source contribution habits. It addresses the common problem of abandoned PRs and inconsistent contributions by providing a gamified commitment system with AI-powered guidance.

## Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router and Turbopack
- **React 19** - UI library
- **Tailwind CSS** - Styling
- **Radix UI** - Accessible component primitives
- **Zustand** - State management
- **TanStack Query** - Data fetching and caching

### Backend
- **Next.js API Routes** - Server-side API endpoints
- **Supabase** - PostgreSQL database, authentication (GitHub OAuth), and vector storage

### AI/ML
- **OpenAI GPT-4o** - LLM for issue explanations and coaching
- **OpenAI Embeddings** - text-embedding-3-small for RAG
- **Opik** - LLM observability and tracing
- **Custom RAG Pipeline** - Repository documentation retrieval

### External Services
- **GitHub API** - Repository and issue data
- **Resend** - Email reminders

## Features

### Core Functionality

- **GitHub Authentication** - Secure OAuth login with read-only access
- **Repository Tracking** - Add repos by URL, search, or from your starred list
- **Smart Issue Discovery** - Filter issues by difficulty level and labels with intelligent scoring

### Commitment System

- **7-Day Commitments** - Create time-bound commitments to specific issues
- **Milestone Tracking** - Progress through steps: read issue, ask questions, start working, open PR
- **Deadline Awareness** - Visual countdown and risk assessment

### Gamification

- **XP & Levels** - Earn experience points for completing milestones
- **Streaks** - Track consecutive days of activity
- **Badges** - Unlock 11 achievement badges (First Steps, Streak Master, Polyglot, etc.)
- **No Leaderboards** - Designed for personal growth, not competition

### AI-Powered Features (Agents)

- **Issue Explainer** - AI breaks down complex issues based on your experience level with:
  - Plain-English summaries
  - Expected outcomes
  - Repository-specific contribution guidelines
  - Common pitfalls and suggested approaches
  - Key terms with definitions

- **Commitment Coach** - Personalized guidance including:
  - Next action recommendations
  - Deadline risk assessment
  - Encouraging nudges with appropriate tone

- **Issue Recommender** - AI-powered issue suggestions based on:
  - Your experience level and preferred languages
  - Issue complexity and beginner-friendliness
  - Repository activity and maintainer responsiveness

- **RAG Context** - AI uses actual repository documentation for accurate, context-aware explanations

### Additional Features

- **Email Reminders** - Day 3 and Day 6 commitment reminders
- **Goals System** - Track first contribution, weekly goals, and 30-day streaks
- **User Dashboard** - Overview of stats, active commitments, and recent activity

## Running Locally

### Prerequisites

- Node.js 18+
- pnpm
- Supabase account
- OpenAI API key
- GitHub OAuth app credentials
- Resend account (optional, for emails)

### Step 1: Clone and Install Dependencies

```bash
git clone https://github.com/giftea/nilla.git
cd nilla
pnpm install
```

### Step 2: Set Up Environment Variables

Create a `.env.local` file in the root directory:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App URL
NEXT_PUBLIC_APP_URL=http://localhost:3001

# OpenAI (required for AI features)
OPENAI_API_KEY=your-openai-api-key

# Resend (for email reminders)
RESEND_API_KEY=your-resend-api-key

# Cron Secret
CRON_SECRET=your-cron-secret

# OPIK Credentials
OPIK_URL_OVERRIDE=
OPIK_PROJECT_NAME=
OPIK_API_KEY=
OPIK_WORKSPACE=
```

### Step 3: Set Up Supabase Database

1. Create a new Supabase project
2. Run the migrations in order via the Supabase SQL editor:
   - `supabase/migrations/001_initial_schema.sql` - Main database schema
   - `supabase/migrations/002_add_stats_functions.sql` - RPC functions for stats
   - `supabase/migrations/003_add_repo_embeddings.sql` - RAG embeddings table

### Step 4: Configure GitHub OAuth

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create a new OAuth App with:
   - **Homepage URL**: `http://localhost:3001`
   - **Authorization callback URL**: `http://localhost:3001/auth/callback`
3. Copy the Client ID and Client Secret
4. In Supabase Dashboard, go to **Authentication > Providers > GitHub**
5. Enable GitHub provider and add your Client ID and Client Secret

### Step 5: Run the Development Server

```bash
pnpm dev
```

The app will be available at `http://localhost:3001`.

### Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server with Turbopack |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |

## Project Structure

```
nilla/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Auth routes (login, onboarding, callback)
│   ├── (dashboard)/        # Protected routes (dashboard, repos, issues, etc.)
│   └── api/                # API routes (GitHub, AI, RAG, cron)
├── components/             # React components
│   ├── ui/                 # Base UI components (Radix-based)
│   ├── layout/             # Navbar, sidebar, mobile nav
│   ├── ai/                 # AI feature components
│   └── issues/             # Issue-related components
├── lib/                    # Core business logic
│   ├── ai/                 # AI agents and OpenAI setup
│   ├── rag/                # RAG system (ingest, retrieve)
│   ├── github/             # GitHub API wrapper
│   ├── supabase/           # Supabase clients
│   └── hooks/              # React hooks
├── supabase/
│   └── migrations/         # Database migrations
└── types/                  # Shared TypeScript types
```

## License

MIT
