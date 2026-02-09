"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { scoreIssue, getDifficultyColor } from "@/lib/utils/issue-scorer";
import {
  MessageSquare,
  Clock,
  ExternalLink,
  Filter,
  Target,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import type { GitHubIssue } from "@/lib/github/api";
import { CommitDialog } from "@/components/issues/commit-dialog";
import { IssueRecommendationCard, IssueExplainerDialog } from "@/components/ai";
import type { Issue as AIIssue, UserProfile } from "@/lib/ai";

export default function IssuesPage() {
  const [selectedRepo, setSelectedRepo] = useState<string>("all");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [labelFilter, setLabelFilter] = useState<string>("all");
  const [commitDialogOpen, setCommitDialogOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIssue, setSelectedIssue] = useState<{
    issue: GitHubIssue;
    repoFullName: string;
  } | null>(null);
  const [explainerDialogOpen, setExplainerDialogOpen] = useState(false);
  const [explainerIssue, setExplainerIssue] = useState<{
    title: string;
    body?: string;
    labels: string[];
    repository: string;
    url: string;
    repoId?: string;
  } | null>(null);

  const ITEMS_PER_PAGE = 10;

  // Fetch current user
  const { data: user } = useQuery({
    queryKey: ["current-user"],
    queryFn: async () => {
      const supabase = createClient();
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;
      return user;
    },
  });

  // Fetch user stats for AI context
  const { data: userStats } = useQuery({
    queryKey: ["user-stats"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("user_stats")
        .select("*")
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
  });

  // Fetch tracked repos
  const { data: trackedRepos } = useQuery({
    queryKey: ["tracked-repos"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("tracked_repos")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch user's active commitments to check for duplicates
  const { data: activeCommitments } = useQuery({
    queryKey: ["active-commitments"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("commitments")
        .select("github_issue_id")
        .eq("status", "active");
      if (error) throw error;
      return new Set(data?.map((c) => c.github_issue_id) || []);
    },
  });

  // Fetch issues for selected repo(s)
  const { data: issues, isLoading } = useQuery({
    queryKey: ["issues", selectedRepo, labelFilter],
    queryFn: async () => {
      const reposToFetch =
        selectedRepo === "all"
          ? trackedRepos || []
          : trackedRepos?.filter((r) => r.id === selectedRepo) || [];

      const issuePromises = reposToFetch.map(async (repo) => {
        const labels =
          labelFilter === "all"
            ? "help wanted"
            : labelFilter === "good-first-issue"
              ? "good first issue"
              : labelFilter === "first-timers-only"
                ? "first timers only"
                : "help wanted";

        const res = await fetch(
          `/api/github/issues?owner=${repo.owner}&repo=${repo.name}&labels=${encodeURIComponent(labels)}`,
        );
        if (!res.ok) return [];
        const data: GitHubIssue[] = await res.json();
        return data.map((issue) => ({
          ...issue,
          repoFullName: repo.full_name,
          repoId: repo.id,
        }));
      });

      const allIssues = (await Promise.all(issuePromises)).flat();
      return allIssues;
    },
    enabled: !!trackedRepos && trackedRepos.length > 0,
  });

  // Filter and sort issues
  const filteredIssues = issues
    ?.map((issue) => ({
      ...issue,
      score: scoreIssue(issue),
    }))
    .filter((issue) => {
      if (difficultyFilter === "all") return true;
      return issue.score.difficulty === difficultyFilter;
    })
    .sort((a, b) => b.score.activityScore - a.score.activityScore);

  // Prepare AI recommendation input
  const aiRecommendationInput = useMemo(() => {
    if (!user || !filteredIssues || filteredIssues.length === 0) return null;

    const userProfile: UserProfile = {
      id: user.id,
      username: user.user_metadata?.user_name || "contributor",
      skillLevel: user.user_metadata?.skill_level || "beginner",
      preferredLanguages: user.user_metadata?.languages || ["javascript", "typescript"],
      interests: user.user_metadata?.interests,
      pastContributions: userStats?.completed_commitments || 0,
    };

    const aiIssues: AIIssue[] = filteredIssues.slice(0, 10).map((issue) => ({
      id: String(issue.id),
      title: issue.title,
      body: issue.body || undefined,
      labels: issue.labels?.map((l: { name: string }) => l.name) || [],
      repository: issue.repoFullName,
      language: undefined,
      commentCount: issue.comments,
      url: issue.html_url,
    }));

    return { user: userProfile, issues: aiIssues };
  }, [user, filteredIssues, userStats]);

  // Pagination
  const totalIssues = filteredIssues?.length || 0;
  const totalPages = Math.ceil(totalIssues / ITEMS_PER_PAGE);
  const paginatedIssues = filteredIssues?.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  // Reset page when filters change
  const handleFilterChange =
    (setter: (value: string) => void) => (value: string) => {
      setter(value);
      setCurrentPage(1);
    };

  const handleCommit = (issue: NonNullable<typeof filteredIssues>[number]) => {
    setSelectedIssue({
      issue,
      repoFullName: issue.repoFullName,
    });
    setCommitDialogOpen(true);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-violet-500/10 via-indigo-500/10 to-cyan-500/10 border border-violet-500/20 p-4 sm:p-6">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 sm:gap-3">
          <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-white shadow-lg shadow-indigo-500/25">
            <Target className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <span className="bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent">
            Discover Issues
          </span>
        </h1>
        <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">
          Find beginner-friendly issues to work on
        </p>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-lg shadow-violet-500/5">
        <CardContent className="p-4 sm:pt-6">
          <div className="flex flex-col sm:flex-row sm:flex-wrap gap-3 sm:gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-violet-500/20 to-indigo-500/20">
                <Filter className="h-3.5 w-3.5 text-violet-600" />
              </div>
              <span className="text-sm font-medium">Filters:</span>
            </div>
            <div className="grid grid-cols-2 sm:flex gap-2 sm:gap-4">
              <Select
                value={selectedRepo}
                onValueChange={handleFilterChange(setSelectedRepo)}
              >
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Repository" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All repos</SelectItem>
                  {trackedRepos?.map((repo) => (
                    <SelectItem key={repo.id} value={repo.id}>
                      {repo.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={labelFilter}
                onValueChange={handleFilterChange(setLabelFilter)}
              >
                <SelectTrigger className="w-full sm:w-40">
                  <SelectValue placeholder="Label" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All labels</SelectItem>
                  <SelectItem value="good-first-issue">
                    Good first issue
                  </SelectItem>
                  <SelectItem value="first-timers-only">
                    First timers only
                  </SelectItem>
                  <SelectItem value="help-wanted">Help wanted</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={difficultyFilter}
                onValueChange={handleFilterChange(setDifficultyFilter)}
              >
                <SelectTrigger className="w-full sm:w-36 col-span-2 sm:col-span-1">
                  <SelectValue placeholder="Difficulty" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All levels</SelectItem>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="advanced">Advanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Recommendation */}
      {filteredIssues && filteredIssues.length > 0 && (
        <IssueRecommendationCard
          input={aiRecommendationInput}
          enabled={!isLoading && !!aiRecommendationInput}
          onIssueClick={(issueId) => {
            const issue = filteredIssues?.find((i) => String(i.id) === issueId);
            if (issue) {
              setSelectedIssue({ issue, repoFullName: issue.repoFullName });
              setCommitDialogOpen(true);
            }
          }}
        />
      )}

      {/* Issues List */}
      {!trackedRepos || trackedRepos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No repositories tracked yet.
            </p>
            <Link href="/repos">
              <Button className="mt-4 bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 text-white border-0 shadow-md shadow-violet-500/25">
                Add repositories
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : paginatedIssues && paginatedIssues.length > 0 ? (
        <div className="space-y-4">
          {paginatedIssues.map((issue) => (
            <Card
              key={`${issue.repoFullName}-${issue.id}`}
              className="border-0 shadow-lg shadow-violet-500/5 hover:shadow-xl hover:shadow-violet-500/10 transition-all"
            >
              <CardHeader className="pb-2 sm:pb-3 p-4 sm:p-6">
                <div className="flex items-start justify-between gap-2 sm:gap-4">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-sm sm:text-lg leading-tight">
                      <a
                        href={issue.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline line-clamp-2"
                      >
                        {issue.title}
                      </a>
                    </CardTitle>
                    <CardDescription className="mt-1 text-xs sm:text-sm">
                      {issue.repoFullName} #{issue.number}
                    </CardDescription>
                  </div>
                  <Badge
                    className={`${getDifficultyColor(issue.score.difficulty)} text-xs shrink-0`}
                    variant="secondary"
                  >
                    {issue.score.difficulty}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0 sm:pt-0">
                <div className="flex flex-wrap gap-1.5 sm:gap-2">
                  {issue.labels.slice(0, 3).map((label) => (
                    <Badge
                      key={label.id}
                      variant="outline"
                      className="text-xs"
                      style={{
                        borderColor: `#${label.color}`,
                        color: `#${label.color}`,
                      }}
                    >
                      {label.name}
                    </Badge>
                  ))}
                  {issue.labels.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{issue.labels.length - 3}
                    </Badge>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
                  {issue.score.recommendation}
                </p>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      {issue.comments}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      {formatDistanceToNow(new Date(issue.updated_at), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <a
                      href={issue.html_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="outline" size="sm" className="h-8 text-xs sm:text-sm">
                        <ExternalLink className="mr-1 h-3 w-3 sm:mr-1.5 sm:h-3.5 sm:w-3.5" />
                        View
                      </Button>
                    </a>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs sm:text-sm border-violet-500/30 text-violet-600 hover:bg-violet-500/10"
                      onClick={() => {
                        setExplainerIssue({
                          title: issue.title,
                          body: issue.body || undefined,
                          labels: issue.labels.map((l: { name: string }) => l.name),
                          repository: issue.repoFullName,
                          url: issue.html_url,
                          repoId: issue.repoId,
                        });
                        setExplainerDialogOpen(true);
                      }}
                    >
                      <Sparkles className="mr-1 h-3 w-3 sm:mr-1.5 sm:h-3.5 sm:w-3.5" />
                      Explain
                    </Button>
                    <Button
                      size="sm"
                      className={`h-8 text-xs sm:text-sm ${
                        activeCommitments?.has(issue.id)
                          ? ""
                          : "bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 text-white border-0 shadow-md shadow-violet-500/25"
                      }`}
                      onClick={() => handleCommit(issue)}
                      disabled={activeCommitments?.has(issue.id)}
                    >
                      <Target className="mr-1 h-3 w-3 sm:mr-1.5 sm:h-3.5 sm:w-3.5" />
                      {activeCommitments?.has(issue.id)
                        ? "Committed"
                        : "Commit"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center sm:justify-between gap-2 pt-4 w-full">
              <p className="hidden sm:block text-xs sm:text-sm text-muted-foreground">
                {(currentPage - 1) * ITEMS_PER_PAGE + 1}-
                {Math.min(currentPage * ITEMS_PER_PAGE, totalIssues)} of{" "}
                {totalIssues}
              </p>
              <div className="flex items-center gap-1 sm:gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 sm:w-auto p-0 sm:px-3"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline ml-1">Prev</span>
                </Button>
                <div className="hidden sm:flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((page) => {
                      if (totalPages <= 5) return true;
                      if (page === 1 || page === totalPages) return true;
                      if (Math.abs(page - currentPage) <= 1) return true;
                      return false;
                    })
                    .map((page, index, array) => (
                      <span key={page} className="flex items-center">
                        {index > 0 && array[index - 1] !== page - 1 && (
                          <span className="px-1 text-muted-foreground">
                            ...
                          </span>
                        )}
                        <Button
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          className={`h-8 w-8 p-0 ${
                            currentPage === page
                              ? "bg-gradient-to-r from-violet-500 to-indigo-500 text-white border-0"
                              : ""
                          }`}
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </Button>
                      </span>
                    ))}
                </div>
                <span className="sm:hidden text-xs text-muted-foreground px-2 whitespace-nowrap">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 sm:w-auto p-0 sm:px-3"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  <span className="hidden sm:inline mr-1">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No issues found matching your filters.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Try adjusting the filters or adding more repositories.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Commit Dialog */}
      {selectedIssue && (
        <CommitDialog
          open={commitDialogOpen}
          onOpenChange={setCommitDialogOpen}
          issue={selectedIssue.issue}
          repoFullName={selectedIssue.repoFullName}
        />
      )}

      {/* Issue Explainer Dialog */}
      <IssueExplainerDialog
        open={explainerDialogOpen}
        onOpenChange={setExplainerDialogOpen}
        issue={explainerIssue}
        repoId={explainerIssue?.repoId}
        userExperienceLevel={
          (user?.user_metadata?.skill_level as "beginner" | "intermediate" | "advanced") || "beginner"
        }
      />
    </div>
  );
}
