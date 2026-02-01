-- Nilla MVP Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- PROFILES (extends Supabase auth.users)
-- ============================================
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    github_username TEXT UNIQUE NOT NULL,
    github_avatar_url TEXT,
    display_name TEXT,
    experience_level TEXT CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')),
    preferred_languages TEXT[] DEFAULT '{}',
    preferred_topics TEXT[] DEFAULT '{}',
    weekly_goal_hours INTEGER DEFAULT 5,
    onboarding_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- GOALS
-- ============================================
CREATE TYPE goal_type AS ENUM (
    'first_contribution',
    'weekly_contribution',
    'thirty_day_streak'
);

CREATE TYPE goal_status AS ENUM (
    'active',
    'completed',
    'abandoned'
);

CREATE TABLE public.goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    goal_type goal_type NOT NULL,
    status goal_status DEFAULT 'active',
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    target_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TRACKED REPOSITORIES
-- ============================================
CREATE TABLE public.tracked_repos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    github_repo_id BIGINT NOT NULL,
    owner TEXT NOT NULL,
    name TEXT NOT NULL,
    full_name TEXT NOT NULL,
    description TEXT,
    html_url TEXT NOT NULL,
    language TEXT,
    stars_count INTEGER DEFAULT 0,
    forks_count INTEGER DEFAULT 0,
    open_issues_count INTEGER DEFAULT 0,
    topics TEXT[] DEFAULT '{}',
    is_archived BOOLEAN DEFAULT FALSE,
    added_via TEXT CHECK (added_via IN ('url', 'starred', 'search')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, github_repo_id)
);

-- ============================================
-- CACHED ISSUES
-- ============================================
CREATE TYPE issue_difficulty AS ENUM (
    'beginner',
    'moderate',
    'advanced'
);

CREATE TABLE public.cached_issues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    github_issue_id BIGINT NOT NULL,
    repo_id UUID REFERENCES public.tracked_repos(id) ON DELETE CASCADE,
    github_repo_full_name TEXT NOT NULL,
    issue_number INTEGER NOT NULL,
    title TEXT NOT NULL,
    body TEXT,
    html_url TEXT NOT NULL,
    labels TEXT[] DEFAULT '{}',
    state TEXT DEFAULT 'open',
    comments_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    difficulty issue_difficulty,
    is_good_first_issue BOOLEAN DEFAULT FALSE,
    is_help_wanted BOOLEAN DEFAULT FALSE,
    activity_score DECIMAL(5,2),
    last_fetched_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(github_issue_id)
);

-- ============================================
-- COMMITMENTS (Core Feature)
-- ============================================
CREATE TYPE commitment_status AS ENUM (
    'active',
    'completed',
    'expired',
    'abandoned'
);

CREATE TYPE progress_state AS ENUM (
    'read_issue',
    'asked_question',
    'working_on_solution',
    'pr_opened',
    'pr_merged'
);

CREATE TABLE public.commitments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    issue_id UUID REFERENCES public.cached_issues(id) ON DELETE SET NULL,
    github_issue_id BIGINT NOT NULL,
    github_repo_full_name TEXT NOT NULL,
    issue_number INTEGER NOT NULL,
    issue_title TEXT NOT NULL,
    issue_url TEXT NOT NULL,
    status commitment_status DEFAULT 'active',
    committed_at TIMESTAMPTZ DEFAULT NOW(),
    deadline_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    current_progress progress_state DEFAULT 'read_issue',
    progress_read_issue BOOLEAN DEFAULT FALSE,
    progress_asked_question BOOLEAN DEFAULT FALSE,
    progress_working_on_solution BOOLEAN DEFAULT FALSE,
    progress_pr_opened BOOLEAN DEFAULT FALSE,
    progress_pr_merged BOOLEAN DEFAULT FALSE,
    reminder_day3_sent BOOLEAN DEFAULT FALSE,
    reminder_day6_sent BOOLEAN DEFAULT FALSE,
    reminder_day3_acknowledged BOOLEAN DEFAULT FALSE,
    reminder_day6_acknowledged BOOLEAN DEFAULT FALSE,
    pr_url TEXT,
    pr_number INTEGER,
    user_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- USER STATS (Gamification)
-- ============================================
CREATE TABLE public.user_stats (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    total_xp INTEGER DEFAULT 0,
    current_level INTEGER DEFAULT 1,
    current_streak INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    total_commitments INTEGER DEFAULT 0,
    completed_commitments INTEGER DEFAULT 0,
    total_prs_opened INTEGER DEFAULT 0,
    total_prs_merged INTEGER DEFAULT 0,
    last_contribution_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- BADGES
-- ============================================
CREATE TYPE badge_type AS ENUM (
    'first_commit',
    'first_pr',
    'first_merged_pr',
    'streak_3',
    'streak_7',
    'streak_14',
    'streak_30',
    'commitment_keeper',
    'quick_starter',
    'helping_hand',
    'explorer',
    'polyglot'
);

CREATE TABLE public.badges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    badge_type badge_type NOT NULL,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    commitment_id UUID REFERENCES public.commitments(id),
    UNIQUE(user_id, badge_type)
);

-- ============================================
-- XP TRANSACTIONS (Audit Trail)
-- ============================================
CREATE TYPE xp_action AS ENUM (
    'commitment_created',
    'progress_read_issue',
    'progress_asked_question',
    'progress_working',
    'progress_pr_opened',
    'progress_pr_merged',
    'commitment_completed',
    'streak_bonus',
    'badge_earned',
    'goal_completed'
);

CREATE TABLE public.xp_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    action xp_action NOT NULL,
    xp_amount INTEGER NOT NULL,
    commitment_id UUID REFERENCES public.commitments(id),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ACTIVITY LOG
-- ============================================
CREATE TABLE public.activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL,
    entity_type TEXT,
    entity_id UUID,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_profiles_github_username ON public.profiles(github_username);
CREATE INDEX idx_goals_user_id ON public.goals(user_id);
CREATE INDEX idx_goals_status ON public.goals(status);
CREATE INDEX idx_tracked_repos_user_id ON public.tracked_repos(user_id);
CREATE INDEX idx_cached_issues_repo_id ON public.cached_issues(repo_id);
CREATE INDEX idx_cached_issues_difficulty ON public.cached_issues(difficulty);
CREATE INDEX idx_cached_issues_good_first ON public.cached_issues(is_good_first_issue) WHERE is_good_first_issue = TRUE;
CREATE INDEX idx_commitments_user_id ON public.commitments(user_id);
CREATE INDEX idx_commitments_status ON public.commitments(status);
CREATE INDEX idx_commitments_deadline ON public.commitments(deadline_at) WHERE status = 'active';
CREATE INDEX idx_user_stats_user_id ON public.user_stats(user_id);
CREATE INDEX idx_badges_user_id ON public.badges(user_id);
CREATE INDEX idx_xp_transactions_user_id ON public.xp_transactions(user_id);
CREATE INDEX idx_activity_log_user_id ON public.activity_log(user_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracked_repos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cached_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.xp_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Goals policies
CREATE POLICY "Users can manage own goals" ON public.goals
    FOR ALL USING (auth.uid() = user_id);

-- Tracked Repos policies
CREATE POLICY "Users can manage own repos" ON public.tracked_repos
    FOR ALL USING (auth.uid() = user_id);

-- Cached Issues policies (shared cache, read by all authenticated)
CREATE POLICY "Authenticated users can read issues" ON public.cached_issues
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can insert issues" ON public.cached_issues
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Authenticated users can update issues" ON public.cached_issues
    FOR UPDATE USING (auth.role() = 'authenticated');

-- Commitments policies
CREATE POLICY "Users can manage own commitments" ON public.commitments
    FOR ALL USING (auth.uid() = user_id);

-- User Stats policies
CREATE POLICY "Users can view own stats" ON public.user_stats
    FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own stats" ON public.user_stats
    FOR UPDATE USING (auth.uid() = user_id);

-- Badges policies
CREATE POLICY "Users can view own badges" ON public.badges
    FOR SELECT USING (auth.uid() = user_id);

-- XP Transactions policies
CREATE POLICY "Users can view own xp" ON public.xp_transactions
    FOR SELECT USING (auth.uid() = user_id);

-- Activity Log policies
CREATE POLICY "Users can view own activity" ON public.activity_log
    FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tracked_repos_updated_at
    BEFORE UPDATE ON public.tracked_repos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_commitments_updated_at
    BEFORE UPDATE ON public.commitments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_stats_updated_at
    BEFORE UPDATE ON public.user_stats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create profile and stats on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, github_username, github_avatar_url, display_name)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'user_name', NEW.raw_user_meta_data->>'preferred_username', 'user'),
        NEW.raw_user_meta_data->>'avatar_url',
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'user_name')
    );

    INSERT INTO public.user_stats (user_id)
    VALUES (NEW.id);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Function to award XP
CREATE OR REPLACE FUNCTION award_xp(
    p_user_id UUID,
    p_action xp_action,
    p_xp_amount INTEGER,
    p_commitment_id UUID DEFAULT NULL,
    p_description TEXT DEFAULT NULL
)
RETURNS void AS $$
BEGIN
    INSERT INTO public.xp_transactions (user_id, action, xp_amount, commitment_id, description)
    VALUES (p_user_id, p_action, p_xp_amount, p_commitment_id, p_description);

    UPDATE public.user_stats
    SET total_xp = total_xp + p_xp_amount,
        current_level = GREATEST(1, FLOOR(SQRT((total_xp + p_xp_amount) / 100.0)) + 1)::INTEGER
    WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check and award badges
CREATE OR REPLACE FUNCTION check_and_award_badge(
    p_user_id UUID,
    p_badge_type badge_type,
    p_commitment_id UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    badge_exists BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM public.badges
        WHERE user_id = p_user_id AND badge_type = p_badge_type
    ) INTO badge_exists;

    IF NOT badge_exists THEN
        INSERT INTO public.badges (user_id, badge_type, commitment_id)
        VALUES (p_user_id, p_badge_type, p_commitment_id);

        PERFORM award_xp(p_user_id, 'badge_earned'::xp_action, 50, p_commitment_id,
            'Earned badge: ' || p_badge_type::TEXT);

        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
