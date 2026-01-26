export type SkillLevel = 'beginner' | 'intermediate' | 'advanced';

export type WorkflowStep = 'onboarding' | 'scout' | 'select-repo' | 'preparation' | 'select-issue' | 'mentoring';

export interface AppState {
  currentStep: WorkflowStep;
  userProfile: UserProfile | null;
  repositories: RepositoryMatch[];
  selectedRepo: RepositoryMatch | null;
  contributionGuide: ContributionGuide | null;
  issues: Issue[];
  selectedIssue: Issue | null;
  mentoringPlan: MentoringPlan | null;
  loading: boolean;
  error: string | null;
}

export interface UserProfile {
  id?: number;
  skill_level: SkillLevel;
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
