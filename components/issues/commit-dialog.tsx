"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/lib/hooks/use-toast";
import { Target, Clock, Loader2, CheckCircle } from "lucide-react";
import { addDays, format } from "date-fns";
import type { GitHubIssue } from "@/lib/github/api";
import { BADGES } from "@/lib/constants/badges";

interface CommitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  issue: GitHubIssue;
  repoFullName: string;
}

export function CommitDialog({
  open,
  onOpenChange,
  issue,
  repoFullName,
}: CommitDialogProps) {
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const deadline = addDays(new Date(), 7);

  const commitMutation = useMutation({
    mutationFn: async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) throw new Error("Not authenticated");

      // Check for existing active commitment to this issue
      const { data: existingCommitment } = await supabase
        .from("commitments")
        .select("id, status")
        .eq("user_id", user.id)
        .eq("github_issue_id", issue.id)
        .eq("status", "active")
        .maybeSingle();

      if (existingCommitment) {
        throw new Error("You already have an active commitment to this issue");
      }

      // Get current level before awarding XP
      const { data: statsBefore } = await supabase
        .from("user_stats")
        .select("current_level")
        .eq("user_id", user.id)
        .single();
      const levelBefore = statsBefore?.current_level || 1;

      // Create commitment
      const { data: commitment, error: commitmentError } = await supabase
        .from("commitments")
        .insert({
          user_id: user.id,
          github_issue_id: issue.id,
          github_repo_full_name: repoFullName,
          issue_number: issue.number,
          issue_title: issue.title,
          issue_url: issue.html_url,
          deadline_at: deadline.toISOString(),
        })
        .select()
        .single();

      if (commitmentError) throw commitmentError;

      // Update user stats: award XP and increment total_commitments
      await supabase.rpc("award_xp", {
        p_user_id: user.id,
        p_action: "commitment_created",
        p_xp_amount: 10,
        p_commitment_id: commitment.id,
        p_description: `Committed to: ${issue.title}`,
      });

      // Increment total_commitments
      await supabase.rpc("increment_stat", {
        p_user_id: user.id,
        p_stat_name: "total_commitments",
      });

      // Award first_commit badge (function checks if already earned)
      const { data: badgeAwarded } = await supabase.rpc("check_and_award_badge", {
        p_user_id: user.id,
        p_badge_type: "first_commit",
        p_commitment_id: commitment.id,
      });

      // Get new level after awarding XP
      const { data: statsAfter } = await supabase
        .from("user_stats")
        .select("current_level")
        .eq("user_id", user.id)
        .single();
      const levelAfter = statsAfter?.current_level || 1;

      return {
        commitment,
        badgeAwarded: badgeAwarded as boolean,
        leveledUp: levelAfter > levelBefore,
        newLevel: levelAfter,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["commitments"] });
      queryClient.invalidateQueries({ queryKey: ["user-stats"] });
      queryClient.invalidateQueries({ queryKey: ["active-commitments"] });

      toast({
        title: "Committed!",
        description: "You've committed to this issue. Good luck!",
        variant: "success",
      });

      // Show badge notification
      if (data.badgeAwarded) {
        setTimeout(() => {
          toast({
            title: `${BADGES.first_commit.icon} Badge Earned: ${BADGES.first_commit.name}`,
            description: BADGES.first_commit.description,
            variant: "success",
          });
        }, 500);
      }

      // Show level up notification
      if (data.leveledUp) {
        setTimeout(() => {
          toast({
            title: `Level Up!`,
            description: `Congratulations! You've reached Level ${data.newLevel}`,
            variant: "success",
          });
        }, data.badgeAwarded ? 1000 : 500);
      }

      onOpenChange(false);
      router.push("/commitments");
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to commit",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Commit to this issue?
          </DialogTitle>
          <DialogDescription>
            You&apos;re about to commit to working on this issue
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg border p-4">
            <h3 className="font-medium line-clamp-2">{issue.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {repoFullName} #{issue.number}
            </p>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span>Deadline:</span>
              <Badge variant="secondary">
                {format(deadline, "MMM d, yyyy")} (7 days)
              </Badge>
            </div>
          </div>

          <div className="rounded-lg bg-muted p-4 space-y-2">
            <p className="text-sm font-medium">What happens next:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3.5 w-3.5 text-primary" />
                Issue moves to your Commitments dashboard
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3.5 w-3.5 text-primary" />
                7-day countdown begins
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3.5 w-3.5 text-primary" />
                Track your progress with checkpoints
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="h-3.5 w-3.5 text-primary" />
                Earn XP when you complete the issue
              </li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => commitMutation.mutate()}
            disabled={commitMutation.isPending}
          >
            {commitMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Committing...
              </>
            ) : (
              <>
                <Target className="mr-2 h-4 w-4" />
                Commit to Issue
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
