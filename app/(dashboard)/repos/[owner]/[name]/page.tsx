"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
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
  ArrowLeft,
  Star,
  GitFork,
  CircleDot,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import type { GitHubIssue } from "@/lib/github/api";
import { CommitDialog } from "@/components/issues/commit-dialog";

const ITEMS_PER_PAGE = 10;

export default function RepoIssuesPage() {
  const params = useParams();
  const owner = params.owner as string;
  const name = params.name as string;
  const fullName = `${owner}/${name}`;

  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [labelFilter, setLabelFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [commitDialogOpen, setCommitDialogOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<{
    issue: GitHubIssue;
    repoFullName: string;
  } | null>(null);

  // Fetch repo info
  const { data: repo } = useQuery({
    queryKey: ["repo", owner, name],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("tracked_repos")
        .select("*")
        .eq("owner", owner)
        .eq("name", name)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // Fetch user's active commitments
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

  // Fetch issues
  const { data: issues, isLoading } = useQuery({
    queryKey: ["repo-issues", owner, name, labelFilter],
    queryFn: async () => {
      const labels =
        labelFilter === "all"
          ? "help wanted"
          : labelFilter === "good-first-issue"
            ? "good first issue"
            : labelFilter === "first-timers-only"
              ? "first timers only"
              : "help wanted";

      const res = await fetch(
        `/api/github/issues?owner=${owner}&repo=${name}&labels=${encodeURIComponent(labels)}`,
      );
      if (!res.ok) return [];
      const data: GitHubIssue[] = await res.json();
      return data;
    },
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

  // Pagination
  const totalPages = Math.ceil((filteredIssues?.length || 0) / ITEMS_PER_PAGE);
  const paginatedIssues = filteredIssues?.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Reset page when filters change
  const handleDifficultyChange = (value: string) => {
    setDifficultyFilter(value);
    setCurrentPage(1);
  };

  const handleLabelChange = (value: string) => {
    setLabelFilter(value);
    setCurrentPage(1);
  };

  const handleCommit = (issue: NonNullable<typeof filteredIssues>[number]) => {
    setSelectedIssue({
      issue,
      repoFullName: fullName,
    });
    setCommitDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Back button and header */}
      <div className="rounded-2xl bg-gradient-to-r from-violet-500/10 via-indigo-500/10 to-cyan-500/10 border border-violet-500/20 p-6">
        <Link
          href="/repos"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to repositories
        </Link>
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 text-white shadow-lg shadow-violet-500/25">
            <Target className="h-5 w-5" />
          </div>
          <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
            {fullName}
          </span>
        </h1>
        {repo && (
          <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
            {repo.language && <Badge variant="outline">{repo.language}</Badge>}
            <span className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5" />
              {repo.stars_count?.toLocaleString() || 0}
            </span>
            <span className="flex items-center gap-1">
              <GitFork className="h-3.5 w-3.5" />
              {repo.forks_count?.toLocaleString() || 0}
            </span>
            <span className="flex items-center gap-1">
              <CircleDot className="h-3.5 w-3.5" />
              {repo.open_issues_count || 0} open issues
            </span>
            <a
              href={repo.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 hover:text-foreground"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              GitHub
            </a>
          </div>
        )}
        <p className="text-muted-foreground mt-2">
          {repo?.description || "Browse beginner-friendly issues"}
        </p>
      </div>

      {/* Filters */}
      <Card className="border-0 shadow-lg shadow-violet-500/5">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-violet-500/20 to-indigo-500/20">
                <Filter className="h-3.5 w-3.5 text-violet-600" />
              </div>
              <span className="text-sm font-medium">Filters:</span>
            </div>
            <Select value={labelFilter} onValueChange={handleLabelChange}>
              <SelectTrigger className="w-40">
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
              onValueChange={handleDifficultyChange}
            >
              <SelectTrigger className="w-36">
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
        </CardContent>
      </Card>

      {/* Issues List */}
      {isLoading ? (
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
              key={issue.id}
              className="border-0 shadow-lg shadow-violet-500/5 hover:shadow-xl hover:shadow-violet-500/10 transition-all"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg leading-tight">
                      <a
                        href={issue.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                      >
                        {issue.title}
                      </a>
                    </CardTitle>
                    <CardDescription className="mt-1">
                      #{issue.number}
                    </CardDescription>
                  </div>
                  <Badge
                    className={getDifficultyColor(issue.score.difficulty)}
                    variant="secondary"
                  >
                    {issue.score.difficulty}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {issue.labels.map((label) => (
                    <Badge
                      key={label.id}
                      variant="outline"
                      style={{
                        borderColor: `#${label.color}`,
                        color: `#${label.color}`,
                      }}
                    >
                      {label.name}
                    </Badge>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  {issue.score.recommendation}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3.5 w-3.5" />
                      {issue.comments} comments
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
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
                      <Button variant="outline" size="sm">
                        <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                        View
                      </Button>
                    </a>
                    <Button
                      size="sm"
                      onClick={() => handleCommit(issue)}
                      disabled={activeCommitments?.has(issue.id)}
                      className={
                        activeCommitments?.has(issue.id)
                          ? ""
                          : "bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 text-white border-0 shadow-md shadow-violet-500/25"
                      }
                    >
                      <Target className="mr-1.5 h-3.5 w-3.5" />
                      {activeCommitments?.has(issue.id)
                        ? "Committed"
                        : "Commit"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}-
                {Math.min(currentPage * ITEMS_PER_PAGE, filteredIssues?.length || 0)} of{" "}
                {filteredIssues?.length || 0} issues
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
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
              No beginner-friendly issues found.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Try adjusting the filters or check back later.
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
    </div>
  );
}
