import type { GitHubIssue } from "@/lib/github/api";

export type Difficulty = "beginner" | "moderate" | "advanced";

export interface IssueScore {
  difficulty: Difficulty;
  activityScore: number;
  recommendation: string;
  isGoodFirstIssue: boolean;
  isHelpWanted: boolean;
}

const BEGINNER_LABELS = [
  "good first issue",
  "good-first-issue",
  "beginner",
  "easy",
  "starter",
  "first-timers-only",
  "first timers only",
  "low-hanging-fruit",
  "beginner friendly",
  "beginner-friendly",
];

const HELP_WANTED_LABELS = [
  "help wanted",
  "help-wanted",
  "contributions welcome",
  "contributions-welcome",
  "up for grabs",
  "up-for-grabs",
];

const ADVANCED_LABELS = [
  "complex",
  "difficult",
  "expert",
  "advanced",
  "hard",
  "critical",
  "major",
  "breaking",
];

export function scoreIssue(issue: GitHubIssue): IssueScore {
  let difficultyPoints = 0;
  const labelNames = issue.labels.map((l) => l.name.toLowerCase());

  // Check for beginner labels
  const isGoodFirstIssue = labelNames.some((l) =>
    BEGINNER_LABELS.some((bl) => l.includes(bl))
  );
  if (isGoodFirstIssue) {
    difficultyPoints -= 2;
  }

  // Check for help wanted labels
  const isHelpWanted = labelNames.some((l) =>
    HELP_WANTED_LABELS.some((hl) => l.includes(hl))
  );
  if (isHelpWanted) {
    difficultyPoints -= 1;
  }

  // Check for advanced labels
  const hasAdvancedLabel = labelNames.some((l) =>
    ADVANCED_LABELS.some((al) => l.includes(al))
  );
  if (hasAdvancedLabel) {
    difficultyPoints += 2;
  }

  // Comment count analysis
  if (issue.comments > 10) difficultyPoints += 1;
  if (issue.comments > 20) difficultyPoints += 1;

  // Age analysis
  const ageInDays =
    (Date.now() - new Date(issue.created_at).getTime()) / (1000 * 60 * 60 * 24);
  if (ageInDays > 180) difficultyPoints += 1; // Old issues might be complex

  // Determine difficulty
  let difficulty: Difficulty;
  if (difficultyPoints <= -1) {
    difficulty = "beginner";
  } else if (difficultyPoints <= 1) {
    difficulty = "moderate";
  } else {
    difficulty = "advanced";
  }

  // Calculate activity score (higher = better for contribution)
  const recency = Math.max(0, 100 - ageInDays);
  const activityScore = Math.round(recency - issue.comments * 2);

  // Generate recommendation
  let recommendation = "";
  if (isGoodFirstIssue) {
    recommendation = "Great for newcomers! This issue is labeled as beginner-friendly.";
  } else if (isHelpWanted && difficulty !== "advanced") {
    recommendation = "The maintainers are actively looking for help with this issue.";
  } else if (difficulty === "beginner") {
    recommendation = "This looks like a manageable issue to start with.";
  } else if (difficulty === "moderate") {
    recommendation = "This issue requires some experience but is approachable.";
  } else {
    recommendation = "This is a complex issue - make sure you understand the codebase first.";
  }

  return {
    difficulty,
    activityScore,
    recommendation,
    isGoodFirstIssue,
    isHelpWanted,
  };
}

export function getDifficultyColor(difficulty: Difficulty): string {
  switch (difficulty) {
    case "beginner":
      return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
    case "moderate":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
    case "advanced":
      return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
  }
}
