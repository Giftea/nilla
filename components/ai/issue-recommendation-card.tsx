"use client";

import { ExternalLink, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AIPanel } from "./ai-panel";
import { useIssueRecommendation } from "@/lib/hooks/use-ai";
import type { RecommendIssueInput, RecommendIssueOutput } from "@/lib/ai";
import { cn } from "@/lib/utils";

interface IssueRecommendationCardProps {
  input: RecommendIssueInput | null;
  enabled?: boolean;
  onIssueClick?: (issueId: string) => void;
  className?: string;
}

const riskColors = {
  low: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  medium: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  high: "bg-red-500/10 text-red-500 border-red-500/20",
};

const riskIcons = {
  low: CheckCircle2,
  medium: AlertTriangle,
  high: AlertTriangle,
};

/**
 * Displays AI-powered issue recommendations
 * Non-blocking - gracefully handles loading/error states
 */
export function IssueRecommendationCard({
  input,
  enabled = true,
  onIssueClick,
  className,
}: IssueRecommendationCardProps) {
  const { data, isLoading, error, refetch } = useIssueRecommendation(input, {
    enabled: enabled && input !== null && (input?.issues?.length ?? 0) > 0,
  });

  // Don't render if no issues to analyze
  if (!input || input.issues.length === 0) {
    return null;
  }

  return (
    <AIPanel
      title="AI Recommendation"
      isLoading={isLoading}
      error={error}
      onRetry={() => refetch()}
      className={className}
    >
      {data && <RecommendationContent data={data} onIssueClick={onIssueClick} />}
    </AIPanel>
  );
}

function RecommendationContent({
  data,
  onIssueClick,
}: {
  data: RecommendIssueOutput;
  onIssueClick?: (issueId: string) => void;
}) {
  const RiskIcon = riskIcons[data.riskLevel];

  return (
    <div className="space-y-4">
      {/* Main recommendation */}
      <div className="rounded-lg border border-violet-500/20 bg-background/50 p-3">
        <div className="mb-2 flex items-start justify-between gap-2">
          <h4 className="font-medium leading-tight text-sm">
            {data.recommendedIssue.title}
          </h4>
          <Badge variant="outline" className={cn("shrink-0", riskColors[data.riskLevel])}>
            <RiskIcon className="mr-1 h-3 w-3" />
            {data.riskLevel} risk
          </Badge>
        </div>

        <p className="mb-3 text-xs text-muted-foreground">
          {data.recommendedIssue.repository}
        </p>

        <p className="mb-3 text-sm text-foreground/80">{data.explanation}</p>

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => window.open(data.recommendedIssue.url, "_blank")}
          >
            <ExternalLink className="mr-1 h-3 w-3" />
            View Issue
          </Button>
          {onIssueClick && (
            <Button
              size="sm"
              className="h-7 bg-gradient-to-r from-violet-500 to-indigo-500 text-xs"
              onClick={() => onIssueClick(data.recommendedIssue.id)}
            >
              Commit to this
            </Button>
          )}
        </div>
      </div>

      {/* Risk factors */}
      {data.riskFactors.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-medium text-muted-foreground">
            Things to consider:
          </p>
          <ul className="space-y-1">
            {data.riskFactors.map((factor, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" />
                {factor}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Alternatives */}
      {data.alternativeIssues.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            Other good options:
          </p>
          <div className="space-y-2">
            {data.alternativeIssues.map((alt) => (
              <div
                key={alt.id}
                className="rounded border border-border/50 bg-muted/30 p-2"
              >
                <p className="text-xs font-medium">{alt.title}</p>
                <p className="text-xs text-muted-foreground">{alt.reason}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fit scores summary */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <TrendingUp className="h-3 w-3" />
        <span>
          Analyzed {data.rankedIssues.length} issues based on your profile
        </span>
      </div>
    </div>
  );
}
