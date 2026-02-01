import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Flame,
  Trophy,
  Target,
  GitPullRequest,
  Sparkles,
  TrendingUp,
  Award,
  Calendar,
} from "lucide-react";
import { BADGES } from "@/lib/constants/badges";
import { xpToNextLevel } from "@/lib/constants/xp-values";
import { cn } from "@/lib/utils";
import { XpHistory } from "@/components/profile/xp-history";

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [
    { data: profile },
    { data: userStats },
    { data: earnedBadges },
    { data: recentXp },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("user_stats").select("*").eq("user_id", user.id).single(),
    supabase
      .from("badges")
      .select("*")
      .eq("user_id", user.id)
      .order("earned_at", { ascending: false }),
    supabase
      .from("xp_transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  const levelProgress = xpToNextLevel(userStats?.total_xp || 0);
  const earnedBadgeTypes = new Set(earnedBadges?.map((b) => b.badge_type) || []);
  const earnedCount = earnedBadgeTypes.size;
  const totalBadges = Object.keys(BADGES).length;

  return (
    <div className="space-y-6">
      {/* Profile Header - Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 p-8">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -right-1/2 w-full h-full bg-gradient-to-bl from-white/10 to-transparent rounded-full blur-3xl" />
          <div className="absolute -bottom-1/2 -left-1/2 w-full h-full bg-gradient-to-tr from-white/10 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row items-center gap-8">
          <div className="relative">
            <div className="absolute -inset-1 bg-gradient-to-r from-white/30 to-white/10 rounded-full blur" />
            <Avatar className="relative h-28 w-28 border-4 border-white/30 shadow-2xl">
              <AvatarImage
                src={profile?.github_avatar_url || ""}
                alt={profile?.display_name || ""}
              />
              <AvatarFallback className="text-3xl bg-white/20 text-white">
                {profile?.display_name?.slice(0, 2).toUpperCase() || "??"}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-2 -right-2 flex h-10 w-10 items-center justify-center rounded-full bg-white text-lg font-bold text-violet-600 shadow-lg">
              {userStats?.current_level || 1}
            </div>
          </div>

          <div className="flex-1 text-center lg:text-left">
            <h1 className="text-3xl font-bold text-white mb-1">
              {profile?.display_name}
            </h1>
            <p className="text-white/70 mb-3">@{profile?.github_username}</p>
            <div className="flex flex-wrap justify-center lg:justify-start gap-2">
              <Badge className="bg-white/20 text-white border-white/30 hover:bg-white/30">
                {profile?.experience_level || "beginner"}
              </Badge>
              {profile?.preferred_languages?.slice(0, 3).map((lang: string) => (
                <Badge
                  key={lang}
                  variant="outline"
                  className="border-white/30 text-white/90"
                >
                  {lang}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex flex-col items-center gap-3 bg-white/10 backdrop-blur-sm rounded-2xl p-6 min-w-[180px]">
            <div className="text-5xl font-bold text-white">
              {userStats?.total_xp || 0}
            </div>
            <div className="text-white/70 text-sm font-medium">Total XP</div>
            <div className="w-full">
              <Progress
                value={levelProgress.percentage}
                className="h-2 bg-white/20"
              />
              <p className="mt-1 text-xs text-white/60 text-center">
                {levelProgress.current} / {levelProgress.required} to Level{" "}
                {(userStats?.current_level || 1) + 1}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-0 shadow-lg shadow-orange-500/5 hover:shadow-xl hover:shadow-orange-500/10 transition-all">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-red-500 text-white shadow-lg shadow-orange-500/30">
                <Flame className="h-7 w-7" />
              </div>
              <div>
                <p className="text-3xl font-bold">
                  {userStats?.current_streak || 0}
                </p>
                <p className="text-sm text-muted-foreground">Day Streak</p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              <span>Best: {userStats?.longest_streak || 0} days</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg shadow-green-500/5 hover:shadow-xl hover:shadow-green-500/10 transition-all">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-green-400 to-emerald-500 text-white shadow-lg shadow-green-500/30">
                <Target className="h-7 w-7" />
              </div>
              <div>
                <p className="text-3xl font-bold">
                  {userStats?.completed_commitments || 0}
                </p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{userStats?.total_commitments || 0} total commitments</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg shadow-purple-500/5 hover:shadow-xl hover:shadow-purple-500/10 transition-all">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-400 to-violet-500 text-white shadow-lg shadow-purple-500/30">
                <GitPullRequest className="h-7 w-7" />
              </div>
              <div>
                <p className="text-3xl font-bold">
                  {userStats?.total_prs_opened || 0}
                </p>
                <p className="text-sm text-muted-foreground">Pull Requests</p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4" />
              <span>{userStats?.total_prs_merged || 0} merged</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg shadow-amber-500/5 hover:shadow-xl hover:shadow-amber-500/10 transition-all">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-yellow-500 text-white shadow-lg shadow-amber-500/30">
                <Trophy className="h-7 w-7" />
              </div>
              <div>
                <p className="text-3xl font-bold">{earnedCount}</p>
                <p className="text-sm text-muted-foreground">Badges Earned</p>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
              <Award className="h-4 w-4" />
              <span>{totalBadges - earnedCount} more to unlock</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Badges Collection */}
      <Card className="border-0 shadow-lg shadow-violet-500/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-yellow-500 text-white shadow-lg shadow-amber-500/25">
                <Trophy className="h-5 w-5" />
              </div>
              <span className="bg-gradient-to-r from-amber-600 to-yellow-600 bg-clip-text text-transparent">
                Badge Collection
              </span>
            </CardTitle>
            <Badge variant="secondary" className="text-sm">
              {earnedCount} / {totalBadges}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Object.values(BADGES).map((badge) => {
              const isEarned = earnedBadgeTypes.has(badge.id);
              return (
                <div
                  key={badge.id}
                  className={cn(
                    "group relative flex flex-col items-center gap-3 rounded-2xl border p-4 text-center transition-all duration-300",
                    isEarned
                      ? "bg-gradient-to-b from-background to-muted/30 border-violet-500/20 hover:border-violet-500/40 hover:shadow-lg hover:shadow-violet-500/10 hover:scale-105"
                      : "bg-muted/30 opacity-40 grayscale hover:opacity-60"
                  )}
                >
                  {isEarned && (
                    <div className="absolute -top-2 -right-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-emerald-500 text-white shadow-lg">
                        <svg
                          className="h-3 w-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      </div>
                    </div>
                  )}
                  <div
                    className={cn(
                      "flex h-16 w-16 items-center justify-center rounded-2xl text-3xl transition-transform group-hover:scale-110",
                      isEarned ? badge.color : "bg-muted"
                    )}
                  >
                    {badge.icon}
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{badge.name}</p>
                    <p className="text-xs text-muted-foreground mt-1 leading-tight">
                      {badge.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* XP History */}
      <XpHistory transactions={recentXp || []} />
    </div>
  );
}
