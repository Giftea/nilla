export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          github_username: string;
          github_avatar_url: string | null;
          display_name: string | null;
          experience_level: "beginner" | "intermediate" | "advanced" | null;
          preferred_languages: string[];
          preferred_topics: string[];
          weekly_goal_hours: number;
          onboarding_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          github_username: string;
          github_avatar_url?: string | null;
          display_name?: string | null;
          experience_level?: "beginner" | "intermediate" | "advanced" | null;
          preferred_languages?: string[];
          preferred_topics?: string[];
          weekly_goal_hours?: number;
          onboarding_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          github_username?: string;
          github_avatar_url?: string | null;
          display_name?: string | null;
          experience_level?: "beginner" | "intermediate" | "advanced" | null;
          preferred_languages?: string[];
          preferred_topics?: string[];
          weekly_goal_hours?: number;
          onboarding_completed?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      goals: {
        Row: {
          id: string;
          user_id: string;
          goal_type: "first_contribution" | "weekly_contribution" | "thirty_day_streak";
          status: "active" | "completed" | "abandoned";
          started_at: string;
          completed_at: string | null;
          target_date: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          goal_type: "first_contribution" | "weekly_contribution" | "thirty_day_streak";
          status?: "active" | "completed" | "abandoned";
          started_at?: string;
          completed_at?: string | null;
          target_date?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          goal_type?: "first_contribution" | "weekly_contribution" | "thirty_day_streak";
          status?: "active" | "completed" | "abandoned";
          started_at?: string;
          completed_at?: string | null;
          target_date?: string | null;
          created_at?: string;
        };
      };
      tracked_repos: {
        Row: {
          id: string;
          user_id: string;
          github_repo_id: number;
          owner: string;
          name: string;
          full_name: string;
          description: string | null;
          html_url: string;
          language: string | null;
          stars_count: number;
          forks_count: number;
          open_issues_count: number;
          topics: string[];
          is_archived: boolean;
          added_via: "url" | "starred" | "search";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          github_repo_id: number;
          owner: string;
          name: string;
          full_name: string;
          description?: string | null;
          html_url: string;
          language?: string | null;
          stars_count?: number;
          forks_count?: number;
          open_issues_count?: number;
          topics?: string[];
          is_archived?: boolean;
          added_via: "url" | "starred" | "search";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          github_repo_id?: number;
          owner?: string;
          name?: string;
          full_name?: string;
          description?: string | null;
          html_url?: string;
          language?: string | null;
          stars_count?: number;
          forks_count?: number;
          open_issues_count?: number;
          topics?: string[];
          is_archived?: boolean;
          added_via?: "url" | "starred" | "search";
          created_at?: string;
          updated_at?: string;
        };
      };
      cached_issues: {
        Row: {
          id: string;
          github_issue_id: number;
          repo_id: string | null;
          github_repo_full_name: string;
          issue_number: number;
          title: string;
          body: string | null;
          html_url: string;
          labels: string[];
          state: string;
          comments_count: number;
          created_at: string;
          updated_at: string;
          difficulty: "beginner" | "moderate" | "advanced" | null;
          is_good_first_issue: boolean;
          is_help_wanted: boolean;
          activity_score: number | null;
          last_fetched_at: string;
        };
        Insert: {
          id?: string;
          github_issue_id: number;
          repo_id?: string | null;
          github_repo_full_name: string;
          issue_number: number;
          title: string;
          body?: string | null;
          html_url: string;
          labels?: string[];
          state?: string;
          comments_count?: number;
          created_at?: string;
          updated_at?: string;
          difficulty?: "beginner" | "moderate" | "advanced" | null;
          is_good_first_issue?: boolean;
          is_help_wanted?: boolean;
          activity_score?: number | null;
          last_fetched_at?: string;
        };
        Update: {
          id?: string;
          github_issue_id?: number;
          repo_id?: string | null;
          github_repo_full_name?: string;
          issue_number?: number;
          title?: string;
          body?: string | null;
          html_url?: string;
          labels?: string[];
          state?: string;
          comments_count?: number;
          created_at?: string;
          updated_at?: string;
          difficulty?: "beginner" | "moderate" | "advanced" | null;
          is_good_first_issue?: boolean;
          is_help_wanted?: boolean;
          activity_score?: number | null;
          last_fetched_at?: string;
        };
      };
      commitments: {
        Row: {
          id: string;
          user_id: string;
          issue_id: string | null;
          github_issue_id: number;
          github_repo_full_name: string;
          issue_number: number;
          issue_title: string;
          issue_url: string;
          status: "active" | "completed" | "expired" | "abandoned";
          committed_at: string;
          deadline_at: string;
          completed_at: string | null;
          current_progress: "read_issue" | "asked_question" | "working_on_solution" | "pr_opened" | "pr_merged";
          progress_read_issue: boolean;
          progress_asked_question: boolean;
          progress_working_on_solution: boolean;
          progress_pr_opened: boolean;
          progress_pr_merged: boolean;
          reminder_day3_sent: boolean;
          reminder_day6_sent: boolean;
          pr_url: string | null;
          pr_number: number | null;
          user_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          issue_id?: string | null;
          github_issue_id: number;
          github_repo_full_name: string;
          issue_number: number;
          issue_title: string;
          issue_url: string;
          status?: "active" | "completed" | "expired" | "abandoned";
          committed_at?: string;
          deadline_at: string;
          completed_at?: string | null;
          current_progress?: "read_issue" | "asked_question" | "working_on_solution" | "pr_opened" | "pr_merged";
          progress_read_issue?: boolean;
          progress_asked_question?: boolean;
          progress_working_on_solution?: boolean;
          progress_pr_opened?: boolean;
          progress_pr_merged?: boolean;
          reminder_day3_sent?: boolean;
          reminder_day6_sent?: boolean;
          pr_url?: string | null;
          pr_number?: number | null;
          user_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          issue_id?: string | null;
          github_issue_id?: number;
          github_repo_full_name?: string;
          issue_number?: number;
          issue_title?: string;
          issue_url?: string;
          status?: "active" | "completed" | "expired" | "abandoned";
          committed_at?: string;
          deadline_at?: string;
          completed_at?: string | null;
          current_progress?: "read_issue" | "asked_question" | "working_on_solution" | "pr_opened" | "pr_merged";
          progress_read_issue?: boolean;
          progress_asked_question?: boolean;
          progress_working_on_solution?: boolean;
          progress_pr_opened?: boolean;
          progress_pr_merged?: boolean;
          reminder_day3_sent?: boolean;
          reminder_day6_sent?: boolean;
          pr_url?: string | null;
          pr_number?: number | null;
          user_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      user_stats: {
        Row: {
          id: string;
          user_id: string;
          total_xp: number;
          current_level: number;
          current_streak: number;
          longest_streak: number;
          total_commitments: number;
          completed_commitments: number;
          total_prs_opened: number;
          total_prs_merged: number;
          last_contribution_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          total_xp?: number;
          current_level?: number;
          current_streak?: number;
          longest_streak?: number;
          total_commitments?: number;
          completed_commitments?: number;
          total_prs_opened?: number;
          total_prs_merged?: number;
          last_contribution_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          total_xp?: number;
          current_level?: number;
          current_streak?: number;
          longest_streak?: number;
          total_commitments?: number;
          completed_commitments?: number;
          total_prs_opened?: number;
          total_prs_merged?: number;
          last_contribution_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      badges: {
        Row: {
          id: string;
          user_id: string;
          badge_type: string;
          earned_at: string;
          commitment_id: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          badge_type: string;
          earned_at?: string;
          commitment_id?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          badge_type?: string;
          earned_at?: string;
          commitment_id?: string | null;
        };
      };
      xp_transactions: {
        Row: {
          id: string;
          user_id: string;
          action: string;
          xp_amount: number;
          commitment_id: string | null;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          action: string;
          xp_amount: number;
          commitment_id?: string | null;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          action?: string;
          xp_amount?: number;
          commitment_id?: string | null;
          description?: string | null;
          created_at?: string;
        };
      };
      activity_log: {
        Row: {
          id: string;
          user_id: string;
          action_type: string;
          entity_type: string | null;
          entity_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          action_type: string;
          entity_type?: string | null;
          entity_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          action_type?: string;
          entity_type?: string | null;
          entity_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      award_xp: {
        Args: {
          p_user_id: string;
          p_action: string;
          p_xp_amount: number;
          p_commitment_id?: string;
          p_description?: string;
        };
        Returns: void;
      };
      check_and_award_badge: {
        Args: {
          p_user_id: string;
          p_badge_type: string;
          p_commitment_id?: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      badge_type: string;
      commitment_status: "active" | "completed" | "expired" | "abandoned";
      goal_status: "active" | "completed" | "abandoned";
      goal_type: "first_contribution" | "weekly_contribution" | "thirty_day_streak";
      issue_difficulty: "beginner" | "moderate" | "advanced";
      progress_state: "read_issue" | "asked_question" | "working_on_solution" | "pr_opened" | "pr_merged";
      xp_action: string;
    };
  };
};
