"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/lib/hooks/use-toast";
import {
  Star,
  GitFork,
  CircleDot,
  Plus,
  Search,
  ExternalLink,
  Loader2,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import type { GitHubRepo } from "@/lib/github/api";

export default function ReposPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [urlInput, setUrlInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");

  // Fetch tracked repos
  const { data: trackedRepos, isLoading: isLoadingTracked } = useQuery({
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

  // Fetch starred repos
  const { data: starredRepos, isLoading: isLoadingStarred } = useQuery({
    queryKey: ["starred-repos"],
    queryFn: async () => {
      const res = await fetch("/api/github/starred");
      if (!res.ok) throw new Error("Failed to fetch starred repos");
      return res.json() as Promise<GitHubRepo[]>;
    },
  });

  // Search repos
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: ["search-repos", searchQuery],
    queryFn: async () => {
      if (!searchQuery) return null;
      const res = await fetch(
        `/api/github/search?q=${encodeURIComponent(searchQuery)}`,
      );
      if (!res.ok) throw new Error("Failed to search repos");
      return res.json();
    },
    enabled: !!searchQuery,
  });

  // Add repo mutation
  const addRepoMutation = useMutation({
    mutationFn: async ({
      url,
      addedVia,
    }: {
      url: string;
      addedVia: string;
    }) => {
      const res = await fetch("/api/github/repos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, addedVia }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to add repository");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tracked-repos"] });
      setUrlInput("");
      toast({
        title: "Repository added",
        description: "You can now browse issues from this repository.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add repository",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Remove repo mutation
  const removeRepoMutation = useMutation({
    mutationFn: async (repoId: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("tracked_repos")
        .delete()
        .eq("id", repoId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tracked-repos"] });
      toast({
        title: "Repository removed",
        description: "The repository has been removed from your list.",
      });
    },
  });

  const handleAddByUrl = () => {
    if (!urlInput.trim()) return;
    addRepoMutation.mutate({ url: urlInput, addedVia: "url" });
  };

  const handleSearch = () => {
    setSearchQuery(searchInput);
  };

  const isRepoTracked = (repoId: number) => {
    return trackedRepos?.some((r) => r.github_repo_id === repoId);
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-violet-500/10 via-indigo-500/10 to-cyan-500/10 border border-violet-500/20 p-6">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 text-white shadow-lg shadow-violet-500/25">
            <GitFork className="h-5 w-5" />
          </div>
          <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
            Repositories
          </span>
        </h1>
        <p className="text-muted-foreground mt-2">
          Track repositories to discover issues to work on
        </p>
      </div>

      <Tabs defaultValue="tracked" className="space-y-6">
        <TabsList className="bg-violet-500/10 border border-violet-500/20">
          <TabsTrigger value="tracked" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white">
            Tracked ({trackedRepos?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="add" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-cyan-500 data-[state=active]:text-white">
            Add Repository
          </TabsTrigger>
        </TabsList>

        {/* Tracked Repos */}
        <TabsContent value="tracked" className="space-y-4">
          {isLoadingTracked ? (
            <div className="grid gap-4 md:grid-cols-2">
              {[1, 2, 3, 4].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-5 w-48" />
                    <Skeleton className="h-4 w-64" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-32" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : trackedRepos && trackedRepos.length > 0 ? (
            <>
              <Card className="border-0 shadow-lg shadow-violet-500/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Search className="h-5 w-5 text-violet-600" />
                    Search Repositories
                  </CardTitle>
                  <CardDescription>
                    Find any public repository on GitHub
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Search repositories..."
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    />
                    <Button
                      onClick={handleSearch}
                      disabled={isSearching || !searchInput.trim()}
                    >
                      {isSearching ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                      Search
                    </Button>
                  </div>

                  {searchResults?.items && (
                    <div className="space-y-2 max-h-96 overflow-auto">
                      {searchResults.items.map((repo: GitHubRepo) => (
                        <div
                          key={repo.id}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">
                              {repo.full_name}
                            </p>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Star className="h-3 w-3" />
                                {repo.stargazers_count.toLocaleString()}
                              </span>
                              {repo.language && <span>{repo.language}</span>}
                            </div>
                          </div>
                          {isRepoTracked(repo.id) ? (
                            <Badge variant="secondary">Added</Badge>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                addRepoMutation.mutate({
                                  url: repo.full_name,
                                  addedVia: "search",
                                })
                              }
                              disabled={addRepoMutation.isPending}
                            >
                              <Plus className="mr-1 h-3.5 w-3.5" />
                              Add
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
              <div className="grid gap-4 md:grid-cols-2">
                {trackedRepos.map((repo) => (
                  <Card key={repo.id} className="border-0 shadow-lg shadow-violet-500/5 hover:shadow-xl hover:shadow-violet-500/10 transition-all">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg truncate">
                            <Link
                              href={`/repos/${repo.owner}/${repo.name}`}
                              className="hover:underline"
                            >
                              {repo.full_name}
                            </Link>
                          </CardTitle>
                          <CardDescription className="line-clamp-2">
                            {repo.description || "No description"}
                          </CardDescription>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0"
                          onClick={() => removeRepoMutation.mutate(repo.id)}
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {repo.language && (
                          <Badge variant="outline">{repo.language}</Badge>
                        )}
                        <span className="flex items-center gap-1">
                          <Star className="h-3.5 w-3.5" />
                          {repo.stars_count.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <GitFork className="h-3.5 w-3.5" />
                          {repo.forks_count.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <CircleDot className="h-3.5 w-3.5" />
                          {repo.open_issues_count}
                        </span>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Link href={`/repos/${repo.owner}/${repo.name}`}>
                          <Button size="sm" className="bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 text-white border-0 shadow-md shadow-violet-500/25">View Issues</Button>
                        </Link>
                        <a
                          href={repo.html_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <Button variant="outline" size="sm">
                            <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                            GitHub
                          </Button>
                        </a>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  No repositories tracked yet.
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add a repository to start discovering issues.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Add Repository */}
        <TabsContent value="add" className="space-y-6">
          {/* Add by URL */}
          <Card className="border-0 shadow-lg shadow-violet-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-violet-600" />
                Add by URL
              </CardTitle>
              <CardDescription>
                Paste a GitHub repository URL to start tracking
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="https://github.com/owner/repo"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddByUrl()}
                />
                <Button
                  onClick={handleAddByUrl}
                  disabled={addRepoMutation.isPending || !urlInput.trim()}
                >
                  {addRepoMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Starred Repos */}
          <Card className="border-0 shadow-lg shadow-indigo-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                Your Starred Repositories
              </CardTitle>
              <CardDescription>
                Add repositories you&apos;ve already starred on GitHub
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingStarred ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-9 w-16" />
                    </div>
                  ))}
                </div>
              ) : starredRepos && starredRepos.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-auto">
                  {starredRepos.map((repo) => (
                    <div
                      key={repo.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{repo.full_name}</p>
                        <p className="text-sm text-muted-foreground truncate">
                          {repo.description || "No description"}
                        </p>
                      </div>
                      {isRepoTracked(repo.id) ? (
                        <Badge variant="secondary">Added</Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            addRepoMutation.mutate({
                              url: repo.full_name,
                              addedVia: "starred",
                            })
                          }
                          disabled={addRepoMutation.isPending}
                        >
                          <Plus className="mr-1 h-3.5 w-3.5" />
                          Add
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-6">
                  No starred repositories found
                </p>
              )}
            </CardContent>
          </Card>

          {/* Search */}
          <Card className="border-0 shadow-lg shadow-cyan-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5 text-cyan-600" />
                Search Repositories
              </CardTitle>
              <CardDescription>
                Find any public repository on GitHub
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Search repositories..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
                <Button
                  onClick={handleSearch}
                  disabled={isSearching || !searchInput.trim()}
                >
                  {isSearching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                  Search
                </Button>
              </div>

              {searchResults?.items && (
                <div className="space-y-2 max-h-96 overflow-auto">
                  {searchResults.items.map((repo: GitHubRepo) => (
                    <div
                      key={repo.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{repo.full_name}</p>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Star className="h-3 w-3" />
                            {repo.stargazers_count.toLocaleString()}
                          </span>
                          {repo.language && <span>{repo.language}</span>}
                        </div>
                      </div>
                      {isRepoTracked(repo.id) ? (
                        <Badge variant="secondary">Added</Badge>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            addRepoMutation.mutate({
                              url: repo.full_name,
                              addedVia: "search",
                            })
                          }
                          disabled={addRepoMutation.isPending}
                        >
                          <Plus className="mr-1 h-3.5 w-3.5" />
                          Add
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
