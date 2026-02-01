export const XP_VALUES = {
  COMMITMENT_CREATED: 10,
  PROGRESS_READ_ISSUE: 5,
  PROGRESS_ASKED_QUESTION: 10,
  PROGRESS_WORKING: 15,
  PROGRESS_PR_OPENED: 25,
  PROGRESS_PR_MERGED: 50,
  COMMITMENT_COMPLETED: 30,
  COMMITMENT_COMPLETED_EARLY: 20,
  STREAK_3_DAY: 15,
  STREAK_7_DAY: 30,
  STREAK_14_DAY: 50,
  STREAK_30_DAY: 100,
  BADGE_EARNED: 50,
  GOAL_COMPLETED: 100,
} as const;

export const LEVEL_THRESHOLDS = [
  0, // Level 1
  100, // Level 2
  250, // Level 3
  500, // Level 4
  1000, // Level 5
  2000, // Level 6
  3500, // Level 7
  5500, // Level 8
  8000, // Level 9
  11000, // Level 10
];

export function calculateLevel(totalXp: number): number {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalXp >= LEVEL_THRESHOLDS[i]) {
      return i + 1;
    }
  }
  return 1;
}

export function xpToNextLevel(totalXp: number): {
  current: number;
  required: number;
  percentage: number;
} {
  const level = calculateLevel(totalXp);
  const currentThreshold = LEVEL_THRESHOLDS[level - 1] || 0;
  const nextThreshold =
    LEVEL_THRESHOLDS[level] || LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];

  const current = totalXp - currentThreshold;
  const required = nextThreshold - currentThreshold;
  const percentage = Math.min(100, Math.round((current / required) * 100));

  return { current, required, percentage };
}
