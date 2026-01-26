# Nilla

**Your Personal Open Source Mentor** - An AI-powered multi-agent system that helps developers discover suitable open source projects and successfully make their first (or next) contributions.

Built for the AI Agents Hackathon focused on Personal Growth & Learning.

## 🎯 Project Overview

Nilla uses a sophisticated multi-agent architecture powered by LangGraph, Google Gemini 2.0 Flash, and Opik to guide developers through their open source contribution journey. The system autonomously discovers repositories, analyzes issues, prepares onboarding materials, and provides step-by-step mentoring.

### Key Features

- **Intelligent Repository Scouting**: Analyzes GitHub repos based on your skills, interests, and experience level
- **Community Analysis**: Evaluates maintainer responsiveness and community friendliness
- **Smart Issue Matching**: Finds issues perfectly suited to your skill level
- **Personalized Onboarding**: Auto-generates getting-started guides for each repository
- **Step-by-Step Mentoring**: Provides detailed contribution plans with reasoning chains
- **Progress Tracking**: Monitors outcomes and adapts future recommendations
- **Comprehensive Observability**: Full Opik integration with LLM-as-judge evaluations

## 🏗️ Architecture

### Multi-Agent System

1. **Repository Scout Agent**
   - Searches GitHub for suitable repositories
   - Analyzes community friendliness and maintainer activity
   - Ranks repositories by match quality
   - **Tools**: GitHub API, sentiment analysis, activity metrics

2. **Issue Matcher Agent**
   - Fetches and analyzes open issues
   - Estimates complexity and difficulty
   - Provides approach suggestions
   - **Tools**: NLP analysis, difficulty calibration

3. **Preparation Agent**
   - Generates personalized onboarding guides
   - Extracts setup instructions and conventions
   - Provides project structure overview
   - **Tools**: Documentation parser, code analyzer

4. **Mentoring Agent**
   - Creates step-by-step contribution plans
   - Uses chain-of-thought reasoning
   - Provides Git commands and testing strategies
   - **Tools**: Code search, reasoning chains

5. **Progress Tracker Agent**
   - Monitors contribution outcomes
   - Generates insights and adjusts difficulty
   - Tracks success metrics
   - **Tools**: Analytics, feedback collector

### Tech Stack

**Backend:**

- Python 3.9+
- FastAPI for REST API
- LangGraph for agent orchestration
- Anthropic Google Gemini 2.0 Flash for AI reasoning
- Opik for experiment tracking and evaluation
- PyGithub for GitHub API access
- SQLAlchemy + SQLite for data persistence

**Frontend:**

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS

## 🚀 Getting Started



### Installation

1. **Clone the repository**

```bash
git clone https://github.com/Giftea/nilla.git
cd nilla
```

2. **Set up the backend**

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env and add your API keys:
# - GOOGLE_API_KEY
# - GITHUB_TOKEN
# - OPIK_API_KEY (optional)
```

3. **Set up the frontend**

```bash
cd ..  # Back to root

# Install dependencies
pnpm install

# Configure environment
cp .env.local.example .env.local
# Edit if needed (default: http://localhost:8000/api/v1)
```

### Running the Application

**Terminal 1 - Backend:**

```bash
cd backend
source venv/bin/activate
python run.py
```

The API will be available at `http://localhost:8000`
API docs at `http://localhost:8000/docs`

**Terminal 2 - Frontend:**

```bash
pnpm dev
```

The app will be available at `http://localhost:3000`

## 🎮 Usage

### Web Interface

1. Visit `http://localhost:3000`
2. Fill out your profile (skill level, languages, interests)
3. Review recommended repositories
4. Select a repository to see personalized onboarding
5. Choose an issue that matches your skill level
6. Get your step-by-step mentoring plan

### API Endpoints

All endpoints are prefixed with `/api/v1`:

- `POST /profile` - Create user profile
- `POST /scout` - Scout for repositories
- `POST /issues/match` - Find matching issues
- `POST /preparation/guide` - Get onboarding guide
- `POST /mentoring/plan` - Get mentoring plan
- `POST /progress/track` - Track contribution outcome
- `POST /workflow/full` - Run complete agent workflow
- `GET /health` - Health check

See full API documentation at `http://localhost:8000/docs`


## 📁 Project Structure

```
nilla/
├── backend/
│   ├── agents/              # Agent implementations
│   │   ├── scout/          # Repository Scout Agent
│   │   ├── issue_matcher/  # Issue Matcher Agent
│   │   ├── mentoring/      # Mentoring Agent
│   │   ├── preparation/    # Preparation Agent
│   │   └── tracker/        # Progress Tracker Agent
│   ├── api/                # FastAPI routes
│   ├── db/                 # Database models
│   ├── evaluators/         # Opik evaluation metrics
│   ├── examples/           # Demo and evaluation scripts
│   ├── models/             # Pydantic schemas
│   ├── tools/              # GitHub and other tools
│   ├── workflows/          # LangGraph workflows
│   └── main.py             # FastAPI app entry point
├── app/                    # Next.js frontend
│   ├── components/         # React components
│   ├── lib/               # API client
│   └── types/             # TypeScript types
└── README.md
```

## 🎓 Hackathon Highlights

### Innovation

- **Autonomous Agent System**: Agents make decisions independently using Gemini's reasoning
- **LangGraph Orchestration**: Complex multi-step workflows with state management
- **Community Analysis**: Novel sentiment analysis of PR comments to gauge friendliness
- **Adaptive Difficulty**: Learns from user outcomes to improve recommendations

### Opik Integration Excellence

- ✅ Tracks every agent action and decision
- ✅ Custom LLM-as-judge evaluators for quality assessment
- ✅ Experiment versioning for prompt engineering
- ✅ Performance metrics and trajectory analysis
- ✅ A/B testing capabilities for different strategies

### Personal Growth Impact

- Reduces intimidation barrier for first-time contributors
- Provides personalized guidance at appropriate skill levels
- Builds confidence through structured mentoring
- Tracks progress and celebrates successes

## 🔧 Configuration

### Environment Variables

**Backend (.env):**

```env
GOOGLE_API_KEY=your_key_here
GITHUB_TOKEN=your_github_token
OPIK_API_KEY=your_opik_key
OPIK_WORKSPACE=default
OPIK_PROJECT_NAME=nilla
DATABASE_URL=sqlite+aiosqlite:///./nilla.db
HOST=0.0.0.0
PORT=8000
```

**Frontend (.env.local):**

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

### GitHub Token

Create a GitHub Personal Access Token with these permissions:

- `public_repo` - Access public repositories
- `read:org` - Read organization data

## 🚧 Future Enhancements

- [ ] Real-time PR tracking and notifications
- [ ] Code review simulation with feedback
- [ ] Integration with Discord/Slack for community support
- [ ] Multi-language support
- [ ] Mobile app
- [ ] Chrome extension for GitHub integration
- [ ] Gamification with achievement badges
- [ ] Mentor matching with experienced contributors

## 📝 License

MIT License - See LICENSE file for details

---

**Built for AI Agents Hackathon** | Track: Personal Growth & Learning

For questions or support, please open an issue on GitHub.
