import { useQuery, useMutation } from "@tanstack/react-query";
import type {
  RecommendIssueInput,
  RecommendIssueOutput,
  CommitmentCoachInput,
  CommitmentCoachOutput,
  IssueExplainerOutput,
} from "@/lib/ai";

// API FUNCTIONS

async function fetchIssueRecommendation(
  input: RecommendIssueInput
): Promise<RecommendIssueOutput> {
  const response = await fetch("/api/ai/recommend-issue", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to get AI recommendation");
  }

  return response.json();
}

async function fetchCommitmentCoaching(
  input: CommitmentCoachInput
): Promise<CommitmentCoachOutput> {
  const response = await fetch("/api/ai/commitment-coach", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to get coaching advice");
  }

  return response.json();
}

export function useIssueRecommendation(
  input: RecommendIssueInput | null,
  options?: {
    enabled?: boolean;
    staleTime?: number;
    refetchOnWindowFocus?: boolean;
  }
) {
  return useQuery({
    queryKey: ["ai", "recommend-issue", input?.user?.id, input?.issues?.length],
    queryFn: () => {
      if (!input) throw new Error("No input provided");
      return fetchIssueRecommendation(input);
    },
    enabled: options?.enabled ?? (input !== null && (input?.issues?.length ?? 0) > 0),
    staleTime: options?.staleTime ?? 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: options?.refetchOnWindowFocus ?? false,
    retry: 1, // Only retry once on failure
    retryDelay: 1000,
  });
}

export function useCommitmentCoach(
  input: CommitmentCoachInput | null,
  options?: {
    enabled?: boolean;
    staleTime?: number;
    refetchOnWindowFocus?: boolean;
  }
) {
  // Include milestone in query key so we only refetch when status changes
  const commitment = input?.commitment;
  const cacheKey = commitment
    ? [
        "ai",
        "commitment-coach",
        commitment.id,
        commitment.currentMilestone,
        commitment.milestonesCompleted?.length ?? 0,
      ]
    : ["ai", "commitment-coach", null];

  return useQuery({
    queryKey: cacheKey,
    queryFn: () => {
      if (!input) throw new Error("No input provided");
      return fetchCommitmentCoaching(input);
    },
    enabled: options?.enabled ?? input !== null,
    // Cache for 30 minutes - coaching only needs refresh when milestone changes
    staleTime: options?.staleTime ?? 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: 1,
    retryDelay: 1000,
  });
}

export function useIssueRecommendationMutation() {
  return useMutation({
    mutationFn: fetchIssueRecommendation,
    retry: 1,
  });
}

export function useCommitmentCoachMutation() {
  return useMutation({
    mutationFn: fetchCommitmentCoaching,
    retry: 1,
  });
}


// ISSUE EXPLAINER

export interface IssueExplainerInput {
  issue: {
    title: string;
    body?: string;
    labels: string[];
    repository: string;
    url: string;
  };
  user: {
    experienceLevel: "beginner" | "intermediate" | "advanced";
  };
  repoId?: string;
}

async function fetchIssueExplanation(
  input: IssueExplainerInput
): Promise<IssueExplainerOutput> {
  const response = await fetch("/api/ai/explain-issue", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to explain issue");
  }

  return response.json();
}

export function useIssueExplainerMutation() {
  return useMutation({
    mutationFn: fetchIssueExplanation,
    retry: 1,
  });
}

// AI FEEDBACK

export type FeedbackType = "thumbs_up" | "thumbs_down";
export type AgentType = "issue-recommender" | "commitment-coach" | "issue-explainer";

export interface FeedbackInput {
  traceId: string;
  feedbackType: FeedbackType;
  agentType: AgentType;
  metadata?: {
    userId?: string;
    recommendedIssueId?: string;
    recommendedIssueTitle?: string;
  };
}

interface FeedbackResponse {
  success: boolean;
  message: string;
  data: {
    traceId: string;
    feedbackType: FeedbackType;
    score: number;
  };
}

async function submitFeedback(input: FeedbackInput): Promise<FeedbackResponse> {
  const response = await fetch("/api/ai/feedback", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Failed to submit feedback");
  }

  return response.json();
}

export function useAIFeedback() {
  return useMutation({
    mutationFn: submitFeedback,
    retry: 1,
  });
}
