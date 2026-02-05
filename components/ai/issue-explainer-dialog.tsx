"use client";

import { useEffect } from "react";
import {
  Sparkles,
  Loader2,
  AlertCircle,
  BookOpen,
  Target,
  ScrollText,
  AlertTriangle,
  Lightbulb,
  HelpCircle,
  ShieldCheck,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useIssueExplainerMutation,
  type IssueExplainerInput,
} from "@/lib/hooks/use-ai";
import type { IssueExplainerOutput } from "@/lib/ai";

interface IssueExplainerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  issue: {
    title: string;
    body?: string;
    labels: string[];
    repository: string;
    url: string;
  } | null;
  repoId?: string;
  userExperienceLevel: "beginner" | "intermediate" | "advanced";
}

export function IssueExplainerDialog({
  open,
  onOpenChange,
  issue,
  repoId,
  userExperienceLevel,
}: IssueExplainerDialogProps) {
  const { mutate, data, isPending, error, reset } =
    useIssueExplainerMutation();

  // Trigger the explanation when the dialog opens with a new issue
  useEffect(() => {
    if (open && issue) {
      const input: IssueExplainerInput = {
        issue: {
          title: issue.title,
          body: issue.body,
          labels: issue.labels,
          repository: issue.repository,
          url: issue.url,
        },
        user: { experienceLevel: userExperienceLevel },
        repoId,
      };
      mutate(input);
    }
    // Reset state when dialog closes
    if (!open) {
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, issue?.url]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-500" />
            <span className="bg-gradient-to-r from-violet-500 to-indigo-500 bg-clip-text text-transparent">
              AI Issue Explainer
            </span>
          </DialogTitle>
          {issue && (
            <DialogDescription className="line-clamp-2">
              {issue.title}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="py-2">
          {isPending ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <Loader2 className="h-6 w-6 animate-spin text-violet-500" />
              <p className="text-sm text-muted-foreground">
                AI is analyzing this issue...
              </p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center gap-3 py-8">
              <AlertCircle className="h-6 w-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Failed to explain this issue
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="text-violet-500 hover:text-violet-600"
                onClick={() => {
                  if (issue) {
                    mutate({
                      issue: {
                        title: issue.title,
                        body: issue.body,
                        labels: issue.labels,
                        repository: issue.repository,
                        url: issue.url,
                      },
                      user: { experienceLevel: userExperienceLevel },
                      repoId,
                    });
                  }
                }}
              >
                Try again
              </Button>
            </div>
          ) : data ? (
            <ExplainerContent data={data} />
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ExplainerContent({ data }: { data: IssueExplainerOutput }) {
  return (
    <div className="space-y-5">
      {/* Summary */}
      <Section icon={BookOpen} title="What this issue is about">
        <p className="text-sm text-foreground/80 leading-relaxed">
          {data.summary}
        </p>
      </Section>

      {/* Expected outcome */}
      <Section icon={Target} title="What the maintainer expects">
        <p className="text-sm text-foreground/80 leading-relaxed">
          {data.expectedOutcome}
        </p>
      </Section>

      {/* Repo guidelines (from RAG) */}
      {data.repoGuidelines.length > 0 && (
        <Section icon={ScrollText} title="Repo guidelines">
          <ul className="space-y-1.5">
            {data.repoGuidelines.map((guideline, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 text-sm text-foreground/80"
              >
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-violet-500" />
                {guideline}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Suggested approach */}
      <Section icon={Lightbulb} title="Suggested approach">
        <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">
          {data.suggestedApproach}
        </p>
      </Section>

      {/* Beginner pitfalls */}
      {data.beginnerPitfalls.length > 0 && (
        <Section icon={AlertTriangle} title="Watch out for">
          <ul className="space-y-1.5">
            {data.beginnerPitfalls.map((pitfall, idx) => (
              <li
                key={idx}
                className="flex items-start gap-2 text-sm text-foreground/80"
              >
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-amber-500" />
                {pitfall}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Key terms */}
      {data.keyTerms.length > 0 && (
        <Section icon={HelpCircle} title="Key terms">
          <div className="space-y-2">
            {data.keyTerms.map((item, idx) => (
              <div key={idx} className="rounded-md border border-border/50 bg-muted/30 p-2.5">
                <Badge
                  variant="secondary"
                  className="mb-1 bg-violet-500/10 text-violet-600 border-violet-500/20"
                >
                  {item.term}
                </Badge>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {item.definition}
                </p>
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Confidence note */}
      <Section icon={ShieldCheck} title="Confidence note">
        <p className="text-xs text-muted-foreground italic leading-relaxed">
          {data.confidenceNote}
        </p>
      </Section>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-violet-500/10 bg-gradient-to-br from-violet-500/5 to-indigo-500/5 p-3.5">
      <h4 className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
        <Icon className="h-3.5 w-3.5 text-violet-500" />
        {title}
      </h4>
      {children}
    </div>
  );
}
