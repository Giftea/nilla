"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/lib/hooks/use-toast";
import {
  Clock,
  ExternalLink,
  Target,
  Check,
  X,
  MessageSquare,
  Wrench,
  GitPullRequest,
  Eye,
} from "lucide-react";
import { formatDistanceToNow, differenceInDays, format } from "date-fns";
import Link from "next/link";
import { BADGES, type BadgeType } from "@/lib/constants/badges";
import { CommitmentCoachCard } from "@/components/ai";
import type { Commitment as AICommitment, UserContext, Milestone } from "@/lib/ai";

type ProgressStep =
  | "read_issue"
  | "asked_question"
  | "working_on_solution"
  | "pr_opened";

const PROGRESS_STEPS: {
  key: ProgressStep;
  label: string;
  icon: React.ReactNode;
  xp: number;
}[] = [
  { key: "read_issue", label: "Read issue thoroughly", icon: <Eye className="h-4 w-4" />, xp: 5 },
  {
    key: "asked_question",
    label: "Asked a question / clarified",
    icon: <MessageSquare className="h-4 w-4" />,
    xp: 10,
  },
  {
    key: "working_on_solution",
    label: "Working on solution",
    icon: <Wrench className="h-4 w-4" />,
    xp: 15,
  },
  {
    key: "pr_opened",
    label: "PR opened",
    icon: <GitPullRequest className="h-4 w-4" />,
    xp: 25,
  },
];

// Helper to convert progress to milestone
function getCommitmentMilestone(commitment: {
  progress_read_issue?: boolean;
  progress_asked_question?: boolean;
  progress_working_on_solution?: boolean;
  progress_pr_opened?: boolean;
}): Milestone {
  if (commitment.progress_pr_opened) return "open_pr";
  if (commitment.progress_working_on_solution) return "work_on_solution";
  if (commitment.progress_asked_question) return "ask_question";
  if (commitment.progress_read_issue) return "read_issue";
  return "not_started";
}

function getCompletedMilestones(commitment: {
  progress_read_issue?: boolean;
  progress_asked_question?: boolean;
  progress_working_on_solution?: boolean;
  progress_pr_opened?: boolean;
}): Milestone[] {
  const completed: Milestone[] = [];
  if (commitment.progress_read_issue) {
    completed.push("not_started", "read_issue");
  }
  if (commitment.progress_asked_question) {
    completed.push("ask_question");
  }
  if (commitment.progress_working_on_solution) {
    completed.push("work_on_solution");
  }
  if (commitment.progress_pr_opened) {
    completed.push("open_pr");
  }
  return completed;
}

export default function CommitmentsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  // Fetch user stats
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

  // Fetch commitments
  const { data: commitments, isLoading } = useQuery({
    queryKey: ["commitments"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("commitments")
        .select("*")
        .order("deadline_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Update progress mutation
  const updateProgressMutation = useMutation({
    mutationFn: async ({
      commitmentId,
      step,
      checked,
    }: {
      commitmentId: string;
      step: ProgressStep;
      checked: boolean;
    }) => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Not authenticated");

      const updateField = `progress_${step}`;
      const { error } = await supabase
        .from("commitments")
        .update({ [updateField]: checked })
        .eq("id", commitmentId);

      if (error) throw error;

      let badgeAwarded: BadgeType | null = null;
      let leveledUp = false;
      let newLevel = 1;

      // Award XP if checking (not unchecking)
      if (checked) {
        // Get level before
        const { data: statsBefore } = await supabase
          .from("user_stats")
          .select("current_level")
          .eq("user_id", user.id)
          .single();
        const levelBefore = statsBefore?.current_level || 1;

        const stepInfo = PROGRESS_STEPS.find((s) => s.key === step);
        await supabase.rpc("award_xp", {
          p_user_id: user.id,
          p_action: `progress_${step.replace("_", "")}`,
          p_xp_amount: stepInfo?.xp || 5,
          p_commitment_id: commitmentId,
          p_description: `Progress: ${stepInfo?.label}`,
        });

        // Award first_pr badge when PR is opened
        if (step === "pr_opened") {
          await supabase.rpc("increment_stat", {
            p_user_id: user.id,
            p_stat_name: "total_prs_opened",
          });
          const { data: awarded } = await supabase.rpc("check_and_award_badge", {
            p_user_id: user.id,
            p_badge_type: "first_pr",
            p_commitment_id: commitmentId,
          });
          if (awarded) badgeAwarded = "first_pr";
        }

        // Get level after
        const { data: statsAfter } = await supabase
          .from("user_stats")
          .select("current_level")
          .eq("user_id", user.id)
          .single();
        newLevel = statsAfter?.current_level || 1;
        leveledUp = newLevel > levelBefore;
      }

      return { badgeAwarded, leveledUp, newLevel };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["commitments"] });
      queryClient.invalidateQueries({ queryKey: ["user-stats"] });

      if (data?.badgeAwarded) {
        const badge = BADGES[data.badgeAwarded];
        toast({
          title: `${badge.icon} Badge Earned: ${badge.name}`,
          description: badge.description,
          variant: "success",
        });
      }

      if (data?.leveledUp) {
        setTimeout(() => {
          toast({
            title: `Level Up!`,
            description: `Congratulations! You've reached Level ${data.newLevel}`,
            variant: "success",
          });
        }, data?.badgeAwarded ? 500 : 0);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update progress",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Complete commitment mutation
  const completeMutation = useMutation({
    mutationFn: async (commitmentId: string) => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Not authenticated");

      // Get badges and level before
      const { data: badgesBefore } = await supabase
        .from("badges")
        .select("badge_type")
        .eq("user_id", user.id);
      const badgeSetBefore = new Set(badgesBefore?.map((b) => b.badge_type) || []);

      const { data: statsBefore } = await supabase
        .from("user_stats")
        .select("current_level")
        .eq("user_id", user.id)
        .single();
      const levelBefore = statsBefore?.current_level || 1;

      const { error } = await supabase
        .from("commitments")
        .update({
          status: "completed",
          completed_at: new Date().toISOString(),
        })
        .eq("id", commitmentId);

      if (error) throw error;

      // Award completion XP
      await supabase.rpc("award_xp", {
        p_user_id: user.id,
        p_action: "commitment_completed",
        p_xp_amount: 30,
        p_commitment_id: commitmentId,
        p_description: "Completed a commitment!",
      });

      // Increment completed_commitments count
      await supabase.rpc("increment_stat", {
        p_user_id: user.id,
        p_stat_name: "completed_commitments",
      });

      // Update streak (may award streak badges in database)
      await supabase.rpc("update_streak", {
        p_user_id: user.id,
      });

      // Check for commitment_keeper badge (5 completed commitments)
      const { data: stats } = await supabase
        .from("user_stats")
        .select("completed_commitments, current_level")
        .eq("user_id", user.id)
        .single();

      if (stats?.completed_commitments >= 5) {
        await supabase.rpc("check_and_award_badge", {
          p_user_id: user.id,
          p_badge_type: "commitment_keeper",
          p_commitment_id: commitmentId,
        });
      }

      // Get badges after to detect new badges (including streak badges from update_streak)
      const { data: badgesAfter } = await supabase
        .from("badges")
        .select("badge_type")
        .eq("user_id", user.id);

      const newBadges = (badgesAfter || [])
        .filter((b) => !badgeSetBefore.has(b.badge_type))
        .map((b) => b.badge_type as BadgeType);

      const newLevel = stats?.current_level || 1;
      const leveledUp = newLevel > levelBefore;

      return { newBadges, leveledUp, newLevel };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["commitments"] });
      queryClient.invalidateQueries({ queryKey: ["user-stats"] });
      queryClient.invalidateQueries({ queryKey: ["badges"] });

      toast({
        title: "Commitment completed!",
        description: "Great job! You've earned 30 XP.",
        variant: "success",
      });

      // Show badge notifications
      data.newBadges.forEach((badgeType, index) => {
        const badge = BADGES[badgeType];
        setTimeout(() => {
          toast({
            title: `${badge.icon} Badge Earned: ${badge.name}`,
            description: badge.description,
            variant: "success",
          });
        }, 500 * (index + 1));
      });

      // Show level up notification
      if (data.leveledUp) {
        setTimeout(() => {
          toast({
            title: `Level Up!`,
            description: `Congratulations! You've reached Level ${data.newLevel}`,
            variant: "success",
          });
        }, 500 * (data.newBadges.length + 1));
      }
    },
  });

  // Abandon commitment mutation
  const abandonMutation = useMutation({
    mutationFn: async (commitmentId: string) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("commitments")
        .update({ status: "abandoned" })
        .eq("id", commitmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["commitments"] });
      toast({
        title: "Commitment abandoned",
        description: "No worries! You can find another issue to work on.",
      });
    },
  });

  const activeCommitments = commitments?.filter((c) => c.status === "active");
  const completedCommitments = commitments?.filter(
    (c) => c.status === "completed"
  );
  const abandonedCommitments = commitments?.filter(
    (c) => c.status === "abandoned" || c.status === "expired"
  );

  const getDeadlineInfo = (deadline: string) => {
    const deadlineDate = new Date(deadline);
    const daysLeft = differenceInDays(deadlineDate, new Date());
    const isOverdue = daysLeft < 0;

    const variant: "destructive" | "warning" | "secondary" = isOverdue
      ? "destructive"
      : daysLeft <= 2
        ? "warning"
        : "secondary";

    return {
      daysLeft: Math.abs(daysLeft),
      isOverdue,
      formattedDate: format(deadlineDate, "MMM d, yyyy"),
      variant,
    };
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-violet-500/10 via-indigo-500/10 to-cyan-500/10 border border-violet-500/20 p-4 sm:p-6">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 sm:gap-3">
          <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 text-white shadow-lg shadow-violet-500/25">
            <Target className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>
          <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
            My Commitments
          </span>
        </h1>
        <p className="text-muted-foreground mt-1 sm:mt-2 text-sm sm:text-base">
          Track your progress on issues you&apos;ve committed to
        </p>
      </div>

      <Tabs defaultValue="active">
        <TabsList className="bg-violet-500/10 border border-violet-500/20 w-full sm:w-auto grid grid-cols-3 sm:inline-flex">
          <TabsTrigger value="active" className="text-xs sm:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white">
            Active ({activeCommitments?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="completed" className="text-xs sm:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-500 data-[state=active]:to-teal-500 data-[state=active]:text-white">
            Done ({completedCommitments?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="archived" className="text-xs sm:text-sm data-[state=active]:bg-gradient-to-r data-[state=active]:from-gray-500 data-[state=active]:to-gray-600 data-[state=active]:text-white">
            Archived ({abandonedCommitments?.length || 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="mt-4 sm:mt-6 space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : activeCommitments && activeCommitments.length > 0 ? (
            activeCommitments.map((commitment) => {
              const deadlineInfo = getDeadlineInfo(commitment.deadline_at);
              const progressCount = PROGRESS_STEPS.filter(
                (step) => commitment[`progress_${step.key}`]
              ).length;

              return (
                <Card key={commitment.id} className="border-0 shadow-lg shadow-violet-500/5 hover:shadow-xl hover:shadow-violet-500/10 transition-all">
                  <CardHeader className="pb-2 sm:pb-3 p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm sm:text-lg leading-tight">
                          <a
                            href={commitment.issue_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline line-clamp-2"
                          >
                            {commitment.issue_title}
                          </a>
                        </CardTitle>
                        <CardDescription className="mt-1 text-xs sm:text-sm">
                          {commitment.github_repo_full_name} #
                          {commitment.issue_number}
                        </CardDescription>
                      </div>
                      <Badge variant={deadlineInfo.variant} className="self-start text-xs shrink-0">
                        <Clock className="mr-1 h-3 w-3" />
                        {deadlineInfo.isOverdue
                          ? `${deadlineInfo.daysLeft}d overdue`
                          : `${deadlineInfo.daysLeft}d`}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6 pt-0 sm:pt-0">
                    {/* Progress Checklist */}
                    <div className="space-y-2 sm:space-y-3">
                      <div className="flex items-center justify-between text-xs sm:text-sm">
                        <span className="font-medium">Progress</span>
                        <span className="text-muted-foreground">
                          {progressCount} / {PROGRESS_STEPS.length}
                        </span>
                      </div>
                      <div className="grid gap-2 sm:gap-3">
                        {PROGRESS_STEPS.map((step) => (
                          <div
                            key={step.key}
                            className="flex items-center gap-2 sm:gap-3"
                          >
                            <Checkbox
                              id={`${commitment.id}-${step.key}`}
                              checked={commitment[`progress_${step.key}`]}
                              onCheckedChange={(checked) =>
                                updateProgressMutation.mutate({
                                  commitmentId: commitment.id,
                                  step: step.key,
                                  checked: !!checked,
                                })
                              }
                            />
                            <Label
                              htmlFor={`${commitment.id}-${step.key}`}
                              className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-normal cursor-pointer flex-1 min-w-0"
                            >
                              <span className="shrink-0">{step.icon}</span>
                              <span className="truncate">{step.label}</span>
                              <Badge
                                variant="outline"
                                className="ml-auto text-xs shrink-0"
                              >
                                +{step.xp}
                              </Badge>
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* AI Coach */}
                    {/* <CommitmentCoachCard
                      input={{
                        commitment: {
                          id: commitment.id,
                          issueTitle: commitment.issue_title,
                          issueUrl: commitment.issue_url,
                          repository: commitment.github_repo_full_name,
                          createdAt: commitment.created_at,
                          deadlineAt: commitment.deadline_at,
                          currentMilestone: getCommitmentMilestone(commitment),
                          milestonesCompleted: getCompletedMilestones(commitment),
                          lastActivityAt: commitment.updated_at,
                        } as AICommitment,
                        user: {
                          username: user?.user_metadata?.user_name || "contributor",
                          totalCommitments: activeCommitments?.length,
                          completedCommitments: userStats?.completed_commitments,
                        } as UserContext,
                      }}
                      enabled={!!user}
                      className="mt-2"
                    /> */}

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-0 pt-2 border-t">
                      <a
                        href={commitment.issue_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="sm:order-1"
                      >
                        <Button variant="outline" size="sm" className="h-8 text-xs sm:text-sm w-full sm:w-auto">
                          <ExternalLink className="mr-1 h-3 w-3 sm:mr-1.5 sm:h-3.5 sm:w-3.5" />
                          View Issue
                        </Button>
                      </a>
                      <div className="flex gap-2 sm:order-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs sm:text-sm flex-1 sm:flex-none"
                          onClick={() => abandonMutation.mutate(commitment.id)}
                        >
                          <X className="mr-1 h-3 w-3 sm:mr-1.5 sm:h-3.5 sm:w-3.5" />
                          Abandon
                        </Button>
                        <Button
                          size="sm"
                          className="h-8 text-xs sm:text-sm flex-1 sm:flex-none bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 text-white border-0 shadow-md shadow-violet-500/25"
                          onClick={() => completeMutation.mutate(commitment.id)}
                          disabled={!commitment.progress_pr_opened}
                        >
                          <Check className="mr-1 h-3 w-3 sm:mr-1.5 sm:h-3.5 sm:w-3.5" />
                          Complete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Target className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-4 text-muted-foreground">
                  No active commitments
                </p>
                <Link href="/issues">
                  <Button className="mt-4 bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 text-white border-0 shadow-md shadow-violet-500/25">Find an issue</Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="completed" className="mt-4 sm:mt-6 space-y-4">
          {completedCommitments && completedCommitments.length > 0 ? (
            completedCommitments.map((commitment) => (
              <Card key={commitment.id} className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-teal-500/5">
                <CardHeader className="pb-2 sm:pb-3 p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm sm:text-lg leading-tight flex items-center gap-2">
                        <Check className="h-4 w-4 sm:h-5 sm:w-5 text-green-500 shrink-0" />
                        <span className="line-clamp-2">{commitment.issue_title}</span>
                      </CardTitle>
                      <CardDescription className="mt-1 text-xs sm:text-sm">
                        {commitment.github_repo_full_name} #
                        {commitment.issue_number}
                      </CardDescription>
                    </div>
                    <Badge variant="success" className="self-start text-xs shrink-0">Completed</Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0">
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Completed{" "}
                    {formatDistanceToNow(new Date(commitment.completed_at!), {
                      addSuffix: true,
                    })}
                  </p>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">
                  No completed commitments yet
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="archived" className="mt-4 sm:mt-6 space-y-4">
          {abandonedCommitments && abandonedCommitments.length > 0 ? (
            abandonedCommitments.map((commitment) => (
              <Card key={commitment.id} className="opacity-60">
                <CardHeader className="pb-2 sm:pb-3 p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-sm sm:text-lg leading-tight line-clamp-2">
                        {commitment.issue_title}
                      </CardTitle>
                      <CardDescription className="mt-1 text-xs sm:text-sm">
                        {commitment.github_repo_full_name} #
                        {commitment.issue_number}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary" className="self-start text-xs shrink-0">
                      {commitment.status === "expired" ? "Expired" : "Abandoned"}
                    </Badge>
                  </div>
                </CardHeader>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No archived commitments</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
