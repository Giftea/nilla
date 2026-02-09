"use client";

import {
  Clock,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Zap,
  AlertCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AIPanel } from "./ai-panel";
import { useCommitmentCoach } from "@/lib/hooks/use-ai";
import type { CommitmentCoachInput, CommitmentCoachOutput } from "@/lib/ai";
import { cn } from "@/lib/utils";

interface CommitmentCoachCardProps {
  input: CommitmentCoachInput | null;
  enabled?: boolean;
  className?: string;
}

const riskLevelConfig = {
  on_track: {
    color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    icon: CheckCircle2,
    label: "On Track",
  },
  needs_attention: {
    color: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    icon: AlertCircle,
    label: "Needs Attention",
  },
  at_risk: {
    color: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    icon: AlertTriangle,
    label: "At Risk",
  },
  critical: {
    color: "bg-red-500/10 text-red-500 border-red-500/20",
    icon: AlertTriangle,
    label: "Critical",
  },
};

const nudgeToneStyles = {
  encouraging: "border-l-emerald-500",
  motivating: "border-l-blue-500",
  celebratory: "border-l-amber-500",
  urgent: "border-l-red-500",
  supportive: "border-l-violet-500",
};

export function CommitmentCoachCard({
  input,
  enabled = true,
  className,
}: CommitmentCoachCardProps) {
  const { data, isLoading, error, refetch } = useCommitmentCoach(input, {
    enabled: enabled && input !== null,
  });

  if (!input) {
    return null;
  }

  return (
    <AIPanel
      title="AI Coach"
      isLoading={isLoading}
      error={error}
      onRetry={() => refetch()}
      className={className}
    >
      {data && <CoachingContent data={data} />}
    </AIPanel>
  );
}

function CoachingContent({ data }: { data: CommitmentCoachOutput }) {
  const riskConfig = riskLevelConfig[data.riskAssessment.level];
  const RiskIcon = riskConfig.icon;

  return (
    <div className="space-y-4">
      {/* Nudge message - the main coaching message */}
      <div
        className={cn(
          "rounded-r-lg border-l-4 bg-muted/30 p-3",
          nudgeToneStyles[data.nudge.tone]
        )}
      >
        <p className="text-sm leading-relaxed">{data.nudge.message}</p>
      </div>

      {/* Warning if present */}
      {data.warning && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/5 p-3">
          <div className="mb-1 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="text-sm font-medium text-red-500">Heads up</span>
          </div>
          <p className="mb-2 text-sm text-red-500/90">{data.warning.message}</p>
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">Suggestion:</span> {data.warning.suggestion}
          </p>
        </div>
      )}

      {/* Next action */}
      <div className="rounded-lg border border-violet-500/20 bg-background/50 p-3">
        <div className="mb-2 flex items-center gap-2">
          <ArrowRight className="h-4 w-4 text-violet-500" />
          <span className="text-xs font-medium text-violet-500">Next Step</span>
          {data.nextAction.estimatedMinutes && (
            <Badge variant="outline" className="ml-auto text-xs">
              ~{data.nextAction.estimatedMinutes} min
            </Badge>
          )}
        </div>
        <p className="mb-1 text-sm font-medium">{data.nextAction.action}</p>
        <p className="text-xs text-muted-foreground">{data.nextAction.why}</p>
      </div>

      {/* Progress and status row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Progress bar */}
        <div className="flex-1">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{data.progress.percentComplete}%</span>
          </div>
          <Progress
            value={data.progress.percentComplete}
            className="h-2 bg-muted"
          />
        </div>

        {/* Status badges */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={cn("text-xs", riskConfig.color)}>
            <RiskIcon className="mr-1 h-3 w-3" />
            {riskConfig.label}
          </Badge>
          <Badge variant="outline" className="text-xs">
            <Clock className="mr-1 h-3 w-3" />
            {data.riskAssessment.daysRemaining}d left
          </Badge>
        </div>
      </div>

      {/* Risk reason */}
      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
        <Zap className="mt-0.5 h-3 w-3 shrink-0" />
        {data.riskAssessment.reason}
      </p>
    </div>
  );
}
