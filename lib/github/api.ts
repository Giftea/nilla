import { createClient } from "@/lib/supabase/server";

const GITHUB_API_BASE = "https://api.github.com";

export class GitHubAPIError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "GitHubAPIError";
  }
}

export async function getGitHubToken() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session?.provider_token;
}

export async function githubFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  requireAuth = false
): Promise<T> {
  const token = await getGitHubToken();

  if (!token && requireAuth) {
    throw new GitHubAPIError(401, "No GitHub token available");
  }

  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    ...options.headers as Record<string, string>,
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${GITHUB_API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new GitHubAPIError(response.status, errorText);
  }

  return response.json();
}

// Repository types
export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    avatar_url: string;
  };
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  topics: string[];
  archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  html_url: string;
  state: string;
  labels: Array<{
    id: number;
    name: string;
    color: string;
  }>;
  comments: number;
  created_at: string;
  updated_at: string;
  user: {
    login: string;
    avatar_url: string;
  };
}

export interface GitHubSearchResult<T> {
  total_count: number;
  incomplete_results: boolean;
  items: T[];
}

// API Functions
export async function getRepo(owner: string, repo: string): Promise<GitHubRepo> {
  return githubFetch<GitHubRepo>(`/repos/${owner}/${repo}`);
}

export async function getUserStarredRepos(
  page = 1,
  perPage = 30
): Promise<GitHubRepo[]> {
  return githubFetch<GitHubRepo[]>(
    `/user/starred?page=${page}&per_page=${perPage}&sort=updated`,
    {},
    true // requires auth - accessing user data
  );
}

export async function searchRepos(
  query: string,
  page = 1,
  perPage = 20
): Promise<GitHubSearchResult<GitHubRepo>> {
  return githubFetch<GitHubSearchResult<GitHubRepo>>(
    `/search/repositories?q=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}&sort=stars`
  );
}

export async function getRepoIssues(
  owner: string,
  repo: string,
  options: {
    labels?: string;
    state?: string;
    sort?: string;
    direction?: string;
    page?: number;
    perPage?: number;
  } = {}
): Promise<GitHubIssue[]> {
  const params = new URLSearchParams({
    state: options.state || "open",
    sort: options.sort || "updated",
    direction: options.direction || "desc",
    per_page: String(options.perPage || 30),
    page: String(options.page || 1),
  });

  if (options.labels) {
    params.set("labels", options.labels);
  }

  return githubFetch<GitHubIssue[]>(
    `/repos/${owner}/${repo}/issues?${params.toString()}`
  );
}

export async function getIssue(
  owner: string,
  repo: string,
  issueNumber: number
): Promise<GitHubIssue> {
  return githubFetch<GitHubIssue>(`/repos/${owner}/${repo}/issues/${issueNumber}`);
}

// Parse GitHub URL to extract owner and repo
export function parseGitHubUrl(url: string): { owner: string; repo: string } | null {
  const patterns = [
    /github\.com\/([^\/]+)\/([^\/]+)/,
    /^([^\/]+)\/([^\/]+)$/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) {
      const [, owner, repo] = match;
      return {
        owner: owner.trim(),
        repo: repo.replace(/\.git$/, "").trim(),
      };
    }
  }

  return null;
}
