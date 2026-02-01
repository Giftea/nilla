"use client";

import { useState } from "react";
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
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import type { GitHubIssue } from "@/lib/github/api";
import { CommitDialog } from "@/components/issues/commit-dialog";

export default function IssuesPage() {
  const [selectedRepo, setSelectedRepo] = useState<string>("all");
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all");
  const [labelFilter, setLabelFilter] = useState<string>("all");
  const [commitDialogOpen, setCommitDialogOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<{
    issue: GitHubIssue;
    repoFullName: string;
  } | null>(null);

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
            ? "good first issue,help wanted"
            : labelFilter === "good-first-issue"
              ? "good first issue"
              : "help wanted";

        const res = await fetch(
          `/api/github/issues?owner=${repo.owner}&repo=${repo.name}&labels=${encodeURIComponent(labels)}`
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

  const handleCommit = (issue: NonNullable<typeof filteredIssues>[number]) => {
    setSelectedIssue({
      issue,
      repoFullName: issue.repoFullName,
    });
    setCommitDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-violet-500/10 via-indigo-500/10 to-cyan-500/10 border border-violet-500/20 p-6">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-500 text-white shadow-lg shadow-indigo-500/25">
            <Target className="h-5 w-5" />
          </div>
          <span className="bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent">
            Discover Issues
          </span>
        </h1>
        <p className="text-muted-foreground mt-2">
          Find beginner-friendly issues to work on
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
            <Select value={selectedRepo} onValueChange={setSelectedRepo}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Select repository" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All repositories</SelectItem>
                {trackedRepos?.map((repo) => (
                  <SelectItem key={repo.id} value={repo.id}>
                    {repo.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={labelFilter} onValueChange={setLabelFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Label" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All labels</SelectItem>
                <SelectItem value="good-first-issue">Good first issue</SelectItem>
                <SelectItem value="help-wanted">Help wanted</SelectItem>
              </SelectContent>
            </Select>
            <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
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
      {!trackedRepos || trackedRepos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">
              No repositories tracked yet.
            </p>
            <Link href="/repos">
              <Button className="mt-4 bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 text-white border-0 shadow-md shadow-violet-500/25">Add repositories</Button>
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
      ) : filteredIssues && filteredIssues.length > 0 ? (
        <div className="space-y-4">
          {filteredIssues.map((issue) => (
            <Card key={`${issue.repoFullName}-${issue.id}`} className="border-0 shadow-lg shadow-violet-500/5 hover:shadow-xl hover:shadow-violet-500/10 transition-all">
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
                      {issue.repoFullName} #{issue.number}
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
                      className={activeCommitments?.has(issue.id) ? "" : "bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 text-white border-0 shadow-md shadow-violet-500/25"}
                    >
                      <Target className="mr-1.5 h-3.5 w-3.5" />
                      {activeCommitments?.has(issue.id) ? "Committed" : "Commit"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
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
    </div>
  );
}
