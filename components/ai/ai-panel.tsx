"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Sparkles, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AIPanelProps {
  title: string;
  isLoading?: boolean;
  error?: Error | null;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  onRetry?: () => void;
  className?: string;
}

export function AIPanel({
  title,
  isLoading = false,
  error = null,
  children,
  defaultExpanded = true,
  onRetry,
  className,
}: AIPanelProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <Card
      className={cn(
        "border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-indigo-500/5",
        className
      )}
    >
      <CardHeader className="pb-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex w-full items-center justify-between text-left"
        >
          <CardTitle className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-violet-500" />
            <span className="bg-gradient-to-r from-violet-500 to-indigo-500 bg-clip-text text-transparent">
              {title}
            </span>
          </CardTitle>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
              <span className="ml-2 text-sm text-muted-foreground">
                AI is thinking...
              </span>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center gap-2 py-4 text-center">
              <AlertCircle className="h-5 w-5 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                AI recommendations unavailable
              </p>
              {onRetry && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRetry}
                  className="text-violet-500 hover:text-violet-600"
                >
                  Try again
                </Button>
              )}
            </div>
          ) : (
            children
          )}
        </CardContent>
      )}
    </Card>
  );
}
