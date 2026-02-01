import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Zap, Flame, Trophy, Target, GitPullRequest, Star } from "lucide-react";
import { BADGES } from "@/lib/constants/badges";
import { xpToNextLevel } from "@/lib/constants/xp-values";
import { cn } from "@/lib/utils";

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
      .limit(10),
  ]);

  const levelProgress = xpToNextLevel(userStats?.total_xp || 0);
  const earnedBadgeTypes = new Set(earnedBadges?.map((b) => b.badge_type) || []);

  return (
    <div className="space-y-6">
      {/* Profile Header */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <Avatar className="h-24 w-24">
              <AvatarImage
                src={profile?.github_avatar_url || ""}
                alt={profile?.display_name || ""}
              />
              <AvatarFallback className="text-2xl">
                {profile?.display_name?.slice(0, 2).toUpperCase() || "??"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl font-bold">{profile?.display_name}</h1>
              <p className="text-muted-foreground">@{profile?.github_username}</p>
              <div className="mt-2 flex flex-wrap justify-center sm:justify-start gap-2">
                <Badge variant="secondary">
                  {profile?.experience_level || "beginner"}
                </Badge>
                {profile?.preferred_languages?.slice(0, 3).map((lang: string) => (
                  <Badge key={lang} variant="outline">
                    {lang}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-primary">
                Level {userStats?.current_level || 1}
              </div>
              <div className="text-sm text-muted-foreground">
                {userStats?.total_xp || 0} XP total
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total XP</CardTitle>
            <Zap className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{userStats?.total_xp || 0}</div>
            <div className="mt-2">
              <Progress value={levelProgress.percentage} className="h-2" />
              <p className="mt-1 text-xs text-muted-foreground">
                {levelProgress.current} / {levelProgress.required} to next level
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Current Streak</CardTitle>
            <Flame className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {userStats?.current_streak || 0} days
            </div>
            <p className="text-xs text-muted-foreground">
              Longest: {userStats?.longest_streak || 0} days
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Target className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {userStats?.completed_commitments || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              of {userStats?.total_commitments || 0} commitments
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">PRs</CardTitle>
            <GitPullRequest className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {userStats?.total_prs_opened || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {userStats?.total_prs_merged || 0} merged
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Badges Collection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Badge Collection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Object.values(BADGES).map((badge) => {
              const isEarned = earnedBadgeTypes.has(badge.id);
              return (
                <div
                  key={badge.id}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-all",
                    isEarned
                      ? "bg-card"
                      : "bg-muted/50 opacity-50 grayscale"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-12 w-12 items-center justify-center rounded-full text-2xl",
                      isEarned ? badge.color : "bg-muted"
                    )}
                  >
                    {badge.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{badge.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {badge.description}
                    </p>
                  </div>
                  {isEarned && (
                    <Badge variant="secondary" className="text-xs">
                      Earned
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* XP History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Recent XP Earned
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentXp && recentXp.length > 0 ? (
            <div className="space-y-3">
              {recentXp.map((xp) => (
                <div
                  key={xp.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="text-sm font-medium">
                      {xp.description || xp.action.replace(/_/g, " ")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(xp.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Badge variant="secondary">+{xp.xp_amount} XP</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-6">
              No XP earned yet. Start by committing to an issue!
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
