import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Target,
  FolderGit2,
  CircleDot,
  Flame,
  Zap,
  Trophy,
  Clock,
  ArrowRight,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { GOALS } from "@/lib/constants/goals";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch dashboard data in parallel
  const [
    { data: profile },
    { data: userStats },
    { data: activeGoal },
    { data: activeCommitments },
    { data: recentActivity },
    { data: trackedRepos },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("user_stats").select("*").eq("user_id", user.id).single(),
    supabase
      .from("goals")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .single(),
    supabase
      .from("commitments")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("deadline_at", { ascending: true })
      .limit(3),
    supabase
      .from("xp_transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("tracked_repos")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(3),
  ]);

  const goalInfo = activeGoal ? GOALS[activeGoal.goal_type as keyof typeof GOALS] : null;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Welcome Section */}
      <div className="rounded-2xl bg-gradient-to-r from-violet-500/10 via-indigo-500/10 to-cyan-500/10 border border-violet-500/20 p-4 sm:p-6">
        <h1 className="text-xl sm:text-2xl font-bold">
          Welcome back,{" "}
          <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
            {profile?.display_name || profile?.github_username}
          </span>
          !
        </h1>
        <p className="text-muted-foreground mt-1">
          {activeGoal
            ? `You're working towards: ${goalInfo?.title}`
            : "Set a goal to get started on your open-source journey"}
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Card className="border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-indigo-500/5 hover:shadow-lg hover:shadow-violet-500/5 transition-all">
          <CardHeader className="flex flex-row items-center justify-between p-3 sm:p-6 pb-2 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total XP</CardTitle>
            <div className="flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-500 text-white">
              <Zap className="h-3 w-3 sm:h-4 sm:w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
            <div className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">{userStats?.total_xp || 0}</div>
            <p className="text-xs text-muted-foreground">
              Level {userStats?.current_level || 1}
            </p>
          </CardContent>
        </Card>
        <Card className="border-orange-500/20 bg-gradient-to-br from-orange-500/5 to-red-500/5 hover:shadow-lg hover:shadow-orange-500/5 transition-all">
          <CardHeader className="flex flex-row items-center justify-between p-3 sm:p-6 pb-2 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Streak</CardTitle>
            <div className="flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-gradient-to-br from-orange-500 to-red-500 text-white">
              <Flame className="h-3 w-3 sm:h-4 sm:w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
            <div className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
              {userStats?.current_streak || 0}<span className="text-sm sm:text-base ml-1">days</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Best: {userStats?.longest_streak || 0}
            </p>
          </CardContent>
        </Card>
        <Card className="border-yellow-500/20 bg-gradient-to-br from-yellow-500/5 to-amber-500/5 hover:shadow-lg hover:shadow-yellow-500/5 transition-all">
          <CardHeader className="flex flex-row items-center justify-between p-3 sm:p-6 pb-2 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Completed</CardTitle>
            <div className="flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-gradient-to-br from-yellow-500 to-amber-500 text-white">
              <Trophy className="h-3 w-3 sm:h-4 sm:w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
            <div className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-yellow-500 to-amber-500 bg-clip-text text-transparent">
              {userStats?.completed_commitments || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              of {userStats?.total_commitments || 0}
            </p>
          </CardContent>
        </Card>
        <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 hover:shadow-lg hover:shadow-emerald-500/5 transition-all">
          <CardHeader className="flex flex-row items-center justify-between p-3 sm:p-6 pb-2 sm:pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">PRs</CardTitle>
            <div className="flex h-6 w-6 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 text-white">
              <CircleDot className="h-3 w-3 sm:h-4 sm:w-4" />
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
            <div className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
              {userStats?.total_prs_opened || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {userStats?.total_prs_merged || 0} merged
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Active Commitments */}
        <Card className="border-0 shadow-lg shadow-violet-500/5 overflow-hidden">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/20 to-indigo-500/20">
                <Target className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-violet-600" />
              </div>
              Active Commitments
            </CardTitle>
            <Link href="/commitments">
              <Button variant="ghost" size="sm" className="h-8 px-2 sm:px-3">
                View all
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            {activeCommitments && activeCommitments.length > 0 ? (
              <div className="space-y-3">
                {activeCommitments.map((commitment) => {
                  const deadline = new Date(commitment.deadline_at);
                  const isOverdue = deadline < new Date();
                  const daysLeft = Math.ceil(
                    (deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                  );

                  return (
                    <div
                      key={commitment.id}
                      className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4 rounded-lg border p-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm sm:text-base truncate">
                          {commitment.issue_title}
                        </p>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate">
                          {commitment.github_repo_full_name} #
                          {commitment.issue_number}
                        </p>
                      </div>
                      <Badge
                        variant={
                          isOverdue
                            ? "destructive"
                            : daysLeft <= 2
                              ? "warning"
                              : "secondary"
                        }
                        className="shrink-0 self-start text-xs"
                      >
                        <Clock className="mr-1 h-3 w-3" />
                        {isOverdue
                          ? "Overdue"
                          : `${daysLeft}d`}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-6">
                <Target className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">
                  No active commitments
                </p>
                <Link href="/issues">
                  <Button variant="outline" size="sm" className="mt-4">
                    Find an issue
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tracked Repositories */}
        <Card className="border-0 shadow-lg shadow-indigo-500/5 overflow-hidden">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-4 sm:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500/20 to-cyan-500/20">
                <FolderGit2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-indigo-600" />
              </div>
              Tracked Repos
            </CardTitle>
            <Link href="/repos">
              <Button variant="ghost" size="sm" className="h-8 px-2 sm:px-3">
                Manage
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
            {trackedRepos && trackedRepos.length > 0 ? (
              <div className="space-y-3">
                {trackedRepos.map((repo) => (
                  <div
                    key={repo.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4 rounded-lg border p-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm sm:text-base truncate">{repo.full_name}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">
                        {repo.description || "No description"}
                      </p>
                    </div>
                    {repo.language && (
                      <Badge variant="outline" className="shrink-0 self-start text-xs">
                        {repo.language}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <FolderGit2 className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-2 text-sm text-muted-foreground">
                  No repositories tracked yet
                </p>
                <Link href="/repos">
                  <Button variant="outline" size="sm" className="mt-4">
                    Add repository
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="border-0 shadow-lg shadow-violet-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/20 to-indigo-500/20">
              <Zap className="h-4 w-4 text-violet-600" />
            </div>
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity && recentActivity.length > 0 ? (
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-white shadow-md shadow-violet-500/25">
                      <Zap className="h-3 w-3 sm:h-4 sm:w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-medium truncate">
                        {activity.description ||
                          activity.action.replace(/_/g, " ")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-gradient-to-r from-violet-500 to-indigo-500 text-white border-0 shrink-0 text-xs">+{activity.xp_amount} XP</Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <Zap className="mx-auto h-12 w-12 text-muted-foreground/50" />
              <p className="mt-2 text-sm text-muted-foreground">
                No activity yet. Start by committing to an issue!
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
