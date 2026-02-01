"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { GOALS, type GoalType } from "@/lib/constants/goals";
import { LANGUAGES, TOPICS } from "@/lib/constants/languages";
import { GitBranch, ChevronRight, ChevronLeft, Loader2 } from "lucide-react";
import { addDays } from "date-fns";

type ExperienceLevel = "beginner" | "intermediate" | "advanced";

const EXPERIENCE_LEVELS = [
  {
    value: "beginner" as const,
    label: "Beginner",
    description: "New to programming or open source contributions",
    emoji: "🌱",
  },
  {
    value: "intermediate" as const,
    label: "Intermediate",
    description: "Comfortable with coding, but new to open source",
    emoji: "🌿",
  },
  {
    value: "advanced" as const,
    label: "Advanced",
    description: "Experienced developer looking to contribute more",
    emoji: "🌳",
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [experienceLevel, setExperienceLevel] =
    useState<ExperienceLevel | null>(null);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedGoal, setSelectedGoal] = useState<GoalType | null>(null);

  const totalSteps = 3;
  const progress = (step / totalSteps) * 100;

  const canProceed = () => {
    switch (step) {
      case 1:
        return experienceLevel !== null;
      case 2:
        return selectedLanguages.length > 0;
      case 3:
        return selectedGoal !== null;
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const toggleLanguage = (lang: string) => {
    setSelectedLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    );
  };

  const toggleTopic = (topic: string) => {
    setSelectedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  };

  const handleComplete = async () => {
    if (!experienceLevel || !selectedGoal) return;

    setIsLoading(true);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          experience_level: experienceLevel,
          preferred_languages: selectedLanguages,
          preferred_topics: selectedTopics,
          onboarding_completed: true,
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // Create goal
      const goalData = GOALS[selectedGoal];
      const targetDate = goalData.targetDays
        ? addDays(new Date(), goalData.targetDays).toISOString()
        : null;

      const { error: goalError } = await supabase.from("goals").insert({
        user_id: user.id,
        goal_type: selectedGoal,
        target_date: targetDate,
      });

      if (goalError) throw goalError;

      router.push("/dashboard");
    } catch (error) {
      console.error("Failed to complete onboarding:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/50 px-4 py-8">
      <div className="mb-8 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <GitBranch className="h-6 w-6" />
        </div>
        <span className="text-2xl font-bold">Nilla</span>
      </div>

      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="mb-4">
            <Progress value={progress} className="h-2" />
            <p className="mt-2 text-sm text-muted-foreground">
              Step {step} of {totalSteps}
            </p>
          </div>
          {step === 1 && (
            <>
              <CardTitle>What&apos;s your experience level?</CardTitle>
              <CardDescription>
                This helps us recommend appropriate issues for you
              </CardDescription>
            </>
          )}
          {step === 2 && (
            <>
              <CardTitle>What&apos;s your preferred stack?</CardTitle>
              <CardDescription>
                Select the languages and topics you&apos;re interested in
              </CardDescription>
            </>
          )}
          {step === 3 && (
            <>
              <CardTitle>What&apos;s your goal?</CardTitle>
              <CardDescription>
                Choose what you want to achieve
              </CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent>
          {/* Step 1: Experience Level */}
          {step === 1 && (
            <div className="grid gap-4 sm:grid-cols-3">
              {EXPERIENCE_LEVELS.map((level) => (
                <button
                  key={level.value}
                  onClick={() => setExperienceLevel(level.value)}
                  className={cn(
                    "flex flex-col items-center rounded-lg border-2 p-6 text-center transition-all hover:border-primary/50",
                    experienceLevel === level.value
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  )}
                >
                  <span className="mb-2 text-4xl">{level.emoji}</span>
                  <span className="font-semibold">{level.label}</span>
                  <span className="mt-1 text-xs text-muted-foreground">
                    {level.description}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Step 2: Languages & Topics */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h3 className="mb-3 font-medium">Programming Languages</h3>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.value}
                      onClick={() => toggleLanguage(lang.value)}
                      className={cn(
                        "rounded-full border px-4 py-2 text-sm transition-all",
                        selectedLanguages.includes(lang.value)
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      {lang.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="mb-3 font-medium">Topics (optional)</h3>
                <div className="flex flex-wrap gap-2">
                  {TOPICS.map((topic) => (
                    <button
                      key={topic.value}
                      onClick={() => toggleTopic(topic.value)}
                      className={cn(
                        "rounded-full border px-4 py-2 text-sm transition-all",
                        selectedTopics.includes(topic.value)
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:border-primary/50"
                      )}
                    >
                      {topic.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Goal Selection */}
          {step === 3 && (
            <div className="grid gap-4">
              {Object.values(GOALS).map((goal) => (
                <button
                  key={goal.id}
                  onClick={() => setSelectedGoal(goal.id as GoalType)}
                  className={cn(
                    "flex items-start gap-4 rounded-lg border-2 p-4 text-left transition-all hover:border-primary/50",
                    selectedGoal === goal.id
                      ? "border-primary bg-primary/5"
                      : "border-border"
                  )}
                >
                  <span className="text-3xl">{goal.emoji}</span>
                  <div>
                    <span className="font-semibold">{goal.title}</span>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {goal.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Navigation */}
          <div className="mt-8 flex justify-between">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={step === 1}
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            {step < totalSteps ? (
              <Button onClick={handleNext} disabled={!canProceed()}>
                Next
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={handleComplete}
                disabled={!canProceed() || isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Get Started
                    <ChevronRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
