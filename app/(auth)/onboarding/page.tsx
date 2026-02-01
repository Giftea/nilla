"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GOALS, type GoalType } from "@/lib/constants/goals";
import { LANGUAGES, TOPICS } from "@/lib/constants/languages";
import {
  ChevronRight,
  ChevronLeft,
  Loader2,
  Check,
  Sparkles,
  Code2,
  Target,
} from "lucide-react";
import { addDays } from "date-fns";

type ExperienceLevel = "beginner" | "intermediate" | "advanced";

const EXPERIENCE_LEVELS = [
  {
    value: "beginner" as const,
    label: "Beginner",
    description: "New to programming or open source contributions",
    emoji: "🌱",
    gradient: "from-green-400 to-emerald-500",
  },
  {
    value: "intermediate" as const,
    label: "Intermediate",
    description: "Comfortable with coding, but new to open source",
    emoji: "🌿",
    gradient: "from-blue-400 to-cyan-500",
  },
  {
    value: "advanced" as const,
    label: "Advanced",
    description: "Experienced developer looking to contribute more",
    emoji: "🌳",
    gradient: "from-violet-400 to-purple-500",
  },
];

const STEP_INFO = [
  {
    title: "What's your experience level?",
    subtitle: "This helps us recommend appropriate issues for you",
    icon: Sparkles,
  },
  {
    title: "What's your preferred stack?",
    subtitle: "Select the languages and topics you're interested in",
    icon: Code2,
  },
  {
    title: "What's your goal?",
    subtitle: "Choose what you want to achieve",
    icon: Target,
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

  const currentStepInfo = STEP_INFO[step - 1];
  const StepIcon = currentStepInfo.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-violet-500/5 to-indigo-500/5">
      {/* Header */}
      <div className="border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto max-w-4xl px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 text-white shadow-lg shadow-violet-500/25">
                <span className="text-xl">🌱</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                Nilla
              </span>
            </div>

            {/* Step indicators */}
            <div className="flex items-center gap-2">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center">
                  <div
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-all",
                      s < step
                        ? "bg-gradient-to-r from-green-400 to-emerald-500 text-white"
                        : s === step
                          ? "bg-gradient-to-r from-violet-500 to-indigo-500 text-white shadow-lg shadow-violet-500/25"
                          : "bg-muted text-muted-foreground"
                    )}
                  >
                    {s < step ? <Check className="h-4 w-4" /> : s}
                  </div>
                  {s < 3 && (
                    <div
                      className={cn(
                        "mx-2 h-0.5 w-8 rounded-full transition-all",
                        s < step
                          ? "bg-gradient-to-r from-green-400 to-emerald-500"
                          : "bg-muted"
                      )}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-4xl px-4 py-12">
        {/* Step Header */}
        <div className="mb-10 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-500 text-white shadow-xl shadow-violet-500/25 mb-6">
            <StepIcon className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold mb-2">{currentStepInfo.title}</h1>
          <p className="text-muted-foreground text-lg">
            {currentStepInfo.subtitle}
          </p>
        </div>

        {/* Step 1: Experience Level */}
        {step === 1 && (
          <div className="grid gap-4 sm:grid-cols-3">
            {EXPERIENCE_LEVELS.map((level) => (
              <button
                key={level.value}
                onClick={() => setExperienceLevel(level.value)}
                className={cn(
                  "group relative flex flex-col items-center rounded-2xl border-2 p-8 text-center transition-all duration-300",
                  experienceLevel === level.value
                    ? "border-violet-500 bg-gradient-to-b from-violet-500/10 to-indigo-500/10 shadow-xl shadow-violet-500/10"
                    : "border-border hover:border-violet-500/50 hover:shadow-lg"
                )}
              >
                {experienceLevel === level.value && (
                  <div className="absolute -top-3 -right-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-white shadow-lg">
                      <Check className="h-4 w-4" />
                    </div>
                  </div>
                )}
                <div
                  className={cn(
                    "mb-4 flex h-20 w-20 items-center justify-center rounded-2xl text-5xl transition-transform group-hover:scale-110",
                    `bg-gradient-to-br ${level.gradient} bg-opacity-10`
                  )}
                  style={{
                    background: `linear-gradient(135deg, ${level.gradient.includes("green") ? "rgb(74 222 128 / 0.2)" : level.gradient.includes("blue") ? "rgb(96 165 250 / 0.2)" : "rgb(167 139 250 / 0.2)"}, transparent)`,
                  }}
                >
                  {level.emoji}
                </div>
                <span className="text-lg font-semibold mb-2">{level.label}</span>
                <span className="text-sm text-muted-foreground leading-relaxed">
                  {level.description}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Step 2: Languages & Topics */}
        {step === 2 && (
          <div className="space-y-8">
            <div className="rounded-2xl border bg-card p-6">
              <h3 className="mb-4 text-lg font-semibold flex items-center gap-2">
                <Code2 className="h-5 w-5 text-violet-500" />
                Programming Languages
              </h3>
              <div className="flex flex-wrap gap-3">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.value}
                    onClick={() => toggleLanguage(lang.value)}
                    className={cn(
                      "relative rounded-xl border-2 px-5 py-2.5 text-sm font-medium transition-all duration-200",
                      selectedLanguages.includes(lang.value)
                        ? "border-violet-500 bg-gradient-to-r from-violet-500 to-indigo-500 text-white shadow-lg shadow-violet-500/25"
                        : "border-border hover:border-violet-500/50 hover:bg-violet-500/5"
                    )}
                  >
                    {lang.label}
                    {selectedLanguages.includes(lang.value) && (
                      <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-violet-600 shadow">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border bg-card p-6">
              <h3 className="mb-4 text-lg font-semibold flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-amber-500" />
                Topics
                <span className="text-sm font-normal text-muted-foreground">
                  (optional)
                </span>
              </h3>
              <div className="flex flex-wrap gap-3">
                {TOPICS.map((topic) => (
                  <button
                    key={topic.value}
                    onClick={() => toggleTopic(topic.value)}
                    className={cn(
                      "relative rounded-xl border-2 px-5 py-2.5 text-sm font-medium transition-all duration-200",
                      selectedTopics.includes(topic.value)
                        ? "border-amber-500 bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/25"
                        : "border-border hover:border-amber-500/50 hover:bg-amber-500/5"
                    )}
                  >
                    {topic.label}
                    {selectedTopics.includes(topic.value) && (
                      <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-white text-amber-600 shadow">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {selectedLanguages.length > 0 && (
              <div className="rounded-xl bg-gradient-to-r from-violet-500/10 to-indigo-500/10 border border-violet-500/20 p-4">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {selectedLanguages.length}
                  </span>{" "}
                  language{selectedLanguages.length !== 1 ? "s" : ""} selected
                  {selectedTopics.length > 0 && (
                    <>
                      {" "}
                      and{" "}
                      <span className="font-medium text-foreground">
                        {selectedTopics.length}
                      </span>{" "}
                      topic{selectedTopics.length !== 1 ? "s" : ""}
                    </>
                  )}
                </p>
              </div>
            )}
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
                  "group relative flex items-center gap-6 rounded-2xl border-2 p-6 text-left transition-all duration-300",
                  selectedGoal === goal.id
                    ? "border-violet-500 bg-gradient-to-r from-violet-500/10 to-indigo-500/10 shadow-xl shadow-violet-500/10"
                    : "border-border hover:border-violet-500/50 hover:shadow-lg"
                )}
              >
                {selectedGoal === goal.id && (
                  <div className="absolute -top-3 -right-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 text-white shadow-lg">
                      <Check className="h-4 w-4" />
                    </div>
                  </div>
                )}
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 text-4xl transition-transform group-hover:scale-110">
                  {goal.emoji}
                </div>
                <div className="flex-1">
                  <span className="text-lg font-semibold">{goal.title}</span>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                    {goal.description}
                  </p>
                  {goal.targetDays && (
                    <p className="mt-2 text-xs text-violet-600 font-medium">
                      Target: {goal.targetDays} days
                    </p>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Navigation */}
        <div className="mt-10 flex justify-between">
          <Button
            variant="outline"
            size="lg"
            onClick={handleBack}
            disabled={step === 1}
            className="px-6"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          {step < totalSteps ? (
            <Button
              size="lg"
              onClick={handleNext}
              disabled={!canProceed()}
              className="px-8 bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 text-white border-0 shadow-lg shadow-violet-500/25 transition-all hover:shadow-xl hover:shadow-violet-500/30"
            >
              Continue
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={handleComplete}
              disabled={!canProceed() || isLoading}
              className="px-8 bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 text-white border-0 shadow-lg shadow-violet-500/25 transition-all hover:shadow-xl hover:shadow-violet-500/30"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up...
                </>
              ) : (
                <>
                  Get Started
                  <Sparkles className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
