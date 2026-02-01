export const GOALS = {
  first_contribution: {
    id: "first_contribution",
    title: "Make my first open-source contribution",
    description:
      "Perfect for newcomers! Complete your first contribution to any open-source project.",
    emoji: "🌟",
    targetDays: null,
  },
  weekly_contribution: {
    id: "weekly_contribution",
    title: "Contribute once this week",
    description:
      "A focused goal to make one meaningful contribution within the next 7 days.",
    emoji: "📅",
    targetDays: 7,
  },
  thirty_day_streak: {
    id: "thirty_day_streak",
    title: "Contribute consistently for 30 days",
    description:
      "Build a habit! Make at least one contribution every day for 30 days.",
    emoji: "🔥",
    targetDays: 30,
  },
} as const;

export type GoalType = keyof typeof GOALS;
