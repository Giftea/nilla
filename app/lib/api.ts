const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export interface UserProfile {
  id?: number;
  skill_level: 'beginner' | 'intermediate' | 'advanced';
  programming_languages: string[];
  interests: string[];
  time_commitment: string;
  github_username?: string;
}

export interface RepositoryMatch {
  repo_name: string;
  repo_url: string;
  description: string;
  stars: number;
  language: string;
  match_score: number;
  match_reasoning: string;
  difficulty_level: string;
  community_friendliness_score: number;
  good_first_issues_count: number;
  recent_activity: boolean;
}

export interface Issue {
  issue_number: number;
  title: string;
  url: string;
  labels: string[];
  description: string;
  difficulty_rating: string;
  estimated_complexity: string;
  approach_suggestions: string;
  created_at: string;
  comments_count: number;
}

export interface ContributionGuide {
  repo_name: string;
  setup_instructions: string;
  project_structure: string;
  coding_conventions: string;
  testing_guide: string;
  contribution_workflow: string;
  helpful_resources: string[];
}

export interface MentoringPlan {
  issue_number: number;
  repo_name: string;
  step_by_step_plan: string[];
  key_files_to_examine: string[];
  suggested_approach: string;
  git_commands: string[];
  testing_strategy: string;
  potential_challenges: string[];
}

export const api = {
  async createUserProfile(profile: UserProfile): Promise<UserProfile> {
    const response = await fetch(`${API_BASE_URL}/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile),
    });

    if (!response.ok) {
      throw new Error('Failed to create user profile');
    }

    return response.json();
  },

  async scoutRepositories(userProfile: UserProfile): Promise<{ repositories: RepositoryMatch[]; reasoning: string }> {
    const response = await fetch(`${API_BASE_URL}/scout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_profile: userProfile }),
    });

    if (!response.ok) {
      throw new Error('Failed to scout repositories');
    }

    return response.json();
  },

  async matchIssues(userProfile: UserProfile, repoName: string, repoUrl: string): Promise<{ issues: Issue[]; reasoning: string }> {
    const response = await fetch(`${API_BASE_URL}/issues/match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_profile: userProfile, repo_name: repoName, repo_url: repoUrl }),
    });

    if (!response.ok) {
      throw new Error('Failed to match issues');
    }

    return response.json();
  },

  async getPreparationGuide(userProfile: UserProfile, repoName: string, repoUrl: string): Promise<ContributionGuide> {
    const response = await fetch(`${API_BASE_URL}/preparation/guide`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_profile: userProfile, repo_name: repoName, repo_url: repoUrl }),
    });

    if (!response.ok) {
      throw new Error('Failed to get preparation guide');
    }

    return response.json();
  },

  async getMentoringPlan(userProfile: UserProfile, repoName: string, repoUrl: string, issueNumber: number): Promise<MentoringPlan> {
    const response = await fetch(`${API_BASE_URL}/mentoring/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_profile: userProfile, repo_name: repoName, repo_url: repoUrl, issue_number: issueNumber }),
    });

    if (!response.ok) {
      throw new Error('Failed to get mentoring plan');
    }

    return response.json();
  },

  async runFullWorkflow(userProfile: UserProfile): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/workflow/full`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userProfile),
    });

    if (!response.ok) {
      throw new Error('Failed to run workflow');
    }

    return response.json();
  },
};
