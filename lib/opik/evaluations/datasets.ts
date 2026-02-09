import type { RecommendIssueInput } from "@/lib/ai/agents/recommend-issue";
import type { CommitmentCoachInput } from "@/lib/ai/agents/commitment-coach";
import type { IssueExplainerInput } from "@/lib/ai/agents/issue-explainer";

// ============================================
// ISSUE RECOMMENDER TEST CASES
// ============================================

export const issueRecommenderTestCases: Array<{
  name: string;
  input: RecommendIssueInput;
  expectedBehavior: string;
}> = [
  // Test Case 1: Beginner with clear good-first-issue
  {
    name: "Beginner with clear good-first-issue available",
    input: {
      user: {
        id: "test-1",
        username: "beginner_dev",
        skillLevel: "beginner",
        preferredLanguages: ["Python"],
        pastContributions: 0,
      },
      issues: [
        {
          id: "1",
          title: "Add type hints to utility functions",
          labels: ["good-first-issue", "python"],
          repository: "project/backend",
          language: "Python",
          commentCount: 2,
          url: "https://github.com/project/backend/issues/1",
          body: "Simple refactoring task - add type hints to 5 utility functions in utils.py",
        },
        {
          id: "2",
          title: "Refactor authentication middleware",
          labels: ["bug", "security"],
          repository: "project/backend",
          language: "Python",
          commentCount: 15,
          url: "https://github.com/project/backend/issues/2",
          body: "Complex security issue requiring deep understanding of JWT tokens, session management, and OAuth2 flows. Need to refactor the entire auth stack.",
        },
      ],
    },
    expectedBehavior:
      "Should recommend Issue #1 (type hints) as it's labeled good-first-issue, matches Python preference, has low comment count indicating clear scope, and is explicitly described as simple. Issue #2 is too complex for a beginner with security implications.",
  },

  // Test Case 2: Intermediate user with language mismatch
  {
    name: "Intermediate user with partial language match",
    input: {
      user: {
        id: "test-2",
        username: "mid_level_dev",
        skillLevel: "intermediate",
        preferredLanguages: ["JavaScript", "TypeScript"],
        pastContributions: 5,
      },
      issues: [
        {
          id: "3",
          title: "Fix CSS grid layout on mobile",
          labels: ["bug", "css"],
          repository: "app/frontend",
          language: "TypeScript",
          commentCount: 3,
          url: "https://github.com/app/frontend/issues/3",
          body: "The grid layout breaks on mobile devices. Need to add responsive breakpoints.",
        },
        {
          id: "4",
          title: "Implement Redis caching layer",
          labels: ["feature", "backend"],
          repository: "app/api",
          language: "Go",
          commentCount: 8,
          url: "https://github.com/app/api/issues/4",
          body: "Add Redis caching for API responses to improve performance.",
        },
      ],
    },
    expectedBehavior:
      "Should recommend Issue #3 (CSS grid fix) because it's in a TypeScript repo matching user's language preference. Issue #4 is in Go which the user doesn't know. The CSS fix is appropriate for intermediate level.",
  },

  // Test Case 3: Advanced user with complex options
  {
    name: "Advanced user choosing between complex issues",
    input: {
      user: {
        id: "test-3",
        username: "senior_contributor",
        skillLevel: "advanced",
        preferredLanguages: ["Rust", "Go", "Python"],
        interests: ["performance", "systems"],
        pastContributions: 50,
      },
      issues: [
        {
          id: "5",
          title: "Optimize memory allocation in parser",
          labels: ["performance", "rust"],
          repository: "compiler/core",
          language: "Rust",
          commentCount: 12,
          url: "https://github.com/compiler/core/issues/5",
          body: "The parser allocates too many small objects. Need to implement arena allocation to reduce GC pressure and improve throughput by ~30%.",
        },
        {
          id: "6",
          title: "Add documentation for CLI flags",
          labels: ["documentation", "good-first-issue"],
          repository: "compiler/cli",
          language: "Rust",
          commentCount: 1,
          url: "https://github.com/compiler/cli/issues/6",
          body: "Document all CLI flags in the README.",
        },
      ],
    },
    expectedBehavior:
      "Should recommend Issue #5 (memory optimization) as it matches the advanced user's skill level, Rust language preference, and performance interests. Issue #6 is too simple for an advanced contributor with 50 past contributions.",
  },

  // Test Case 4: Beginner with all hard issues
  {
    name: "Beginner with only complex issues available",
    input: {
      user: {
        id: "test-4",
        username: "new_contributor",
        skillLevel: "beginner",
        preferredLanguages: ["JavaScript"],
        pastContributions: 0,
      },
      issues: [
        {
          id: "7",
          title: "Implement WebSocket reconnection logic",
          labels: ["feature", "networking"],
          repository: "chat/client",
          language: "JavaScript",
          commentCount: 20,
          url: "https://github.com/chat/client/issues/7",
          body: "Need to implement exponential backoff for WebSocket reconnection with state synchronization.",
        },
        {
          id: "8",
          title: "Fix race condition in message queue",
          labels: ["bug", "critical"],
          repository: "chat/server",
          language: "JavaScript",
          commentCount: 25,
          url: "https://github.com/chat/server/issues/8",
          body: "Race condition causing message loss under high load. Requires understanding of async/await, promises, and concurrent queue processing.",
        },
      ],
    },
    expectedBehavior:
      "Should recommend Issue #7 as the lesser of two complex issues, but flag HIGH risk level. Both issues are challenging for a beginner - the recommendation should acknowledge this and suggest the user might want to find easier issues or ask for mentorship.",
  },

  // Test Case 5: User with specific interests
  {
    name: "User with testing interest matching test issue",
    input: {
      user: {
        id: "test-5",
        username: "test_enthusiast",
        skillLevel: "intermediate",
        preferredLanguages: ["Python"],
        interests: ["testing", "quality"],
        pastContributions: 10,
      },
      issues: [
        {
          id: "9",
          title: "Add unit tests for user service",
          labels: ["testing", "help-wanted"],
          repository: "platform/api",
          language: "Python",
          commentCount: 4,
          url: "https://github.com/platform/api/issues/9",
          body: "The user service has 0% test coverage. Add comprehensive unit tests using pytest.",
        },
        {
          id: "10",
          title: "Refactor database models",
          labels: ["refactoring"],
          repository: "platform/api",
          language: "Python",
          commentCount: 7,
          url: "https://github.com/platform/api/issues/10",
          body: "Split the monolithic models.py into separate files per domain.",
        },
      ],
    },
    expectedBehavior:
      "Should recommend Issue #9 (unit tests) as it directly matches the user's interest in testing, uses their preferred language Python, and is labeled help-wanted. The fit score should be high due to interest alignment.",
  },

  // Test Case 6: Language mismatch but good-first-issue
  {
    name: "Beginner with language mismatch on good-first-issue",
    input: {
      user: {
        id: "test-6",
        username: "python_beginner",
        skillLevel: "beginner",
        preferredLanguages: ["Python"],
        pastContributions: 1,
      },
      issues: [
        {
          id: "11",
          title: "Fix typo in error message",
          labels: ["good-first-issue", "documentation"],
          repository: "cli/tool",
          language: "Go",
          commentCount: 0,
          url: "https://github.com/cli/tool/issues/11",
          body: "There's a typo in the error message: 'Invlaid' should be 'Invalid'",
        },
        {
          id: "12",
          title: "Implement retry logic for API calls",
          labels: ["feature"],
          repository: "sdk/python",
          language: "Python",
          commentCount: 10,
          url: "https://github.com/sdk/python/issues/12",
          body: "Add configurable retry logic with exponential backoff for all API calls.",
        },
      ],
    },
    expectedBehavior:
      "Should recommend Issue #11 (typo fix) despite Go language mismatch because it's a documentation/string change that doesn't require Go knowledge. The simplicity outweighs the language mismatch for a beginner.",
  },

  // Test Case 7: Multiple good options for intermediate
  {
    name: "Intermediate user with multiple suitable issues",
    input: {
      user: {
        id: "test-7",
        username: "versatile_dev",
        skillLevel: "intermediate",
        preferredLanguages: ["TypeScript", "Python"],
        pastContributions: 15,
      },
      issues: [
        {
          id: "13",
          title: "Add dark mode toggle",
          labels: ["feature", "ui"],
          repository: "dashboard/web",
          language: "TypeScript",
          commentCount: 5,
          url: "https://github.com/dashboard/web/issues/13",
          body: "Implement dark mode with system preference detection and manual toggle.",
        },
        {
          id: "14",
          title: "Create API endpoint for user preferences",
          labels: ["feature", "api"],
          repository: "dashboard/api",
          language: "Python",
          commentCount: 6,
          url: "https://github.com/dashboard/api/issues/14",
          body: "Add REST endpoint to save/retrieve user preferences including theme setting.",
        },
        {
          id: "15",
          title: "Update dependencies to fix security vulnerabilities",
          labels: ["security", "maintenance"],
          repository: "dashboard/web",
          language: "TypeScript",
          commentCount: 2,
          url: "https://github.com/dashboard/web/issues/15",
          body: "npm audit shows 3 moderate vulnerabilities. Update affected packages.",
        },
      ],
    },
    expectedBehavior:
      "Should provide a well-reasoned recommendation among good options. Issue #13 or #14 are both suitable features. Issue #15 is simpler but less interesting. Should explain trade-offs and provide alternatives.",
  },

  // Test Case 8: User with time constraints
  {
    name: "User with limited availability",
    input: {
      user: {
        id: "test-8",
        username: "busy_contributor",
        skillLevel: "intermediate",
        preferredLanguages: ["JavaScript"],
        availableHoursPerWeek: 2,
        pastContributions: 8,
      },
      issues: [
        {
          id: "16",
          title: "Fix button alignment on mobile",
          labels: ["bug", "quick-fix"],
          repository: "app/mobile-web",
          language: "JavaScript",
          commentCount: 1,
          url: "https://github.com/app/mobile-web/issues/16",
          body: "Submit button is misaligned on iPhone SE. Probably just needs a CSS tweak.",
        },
        {
          id: "17",
          title: "Implement full-text search",
          labels: ["feature", "backend"],
          repository: "app/api",
          language: "JavaScript",
          commentCount: 30,
          url: "https://github.com/app/api/issues/17",
          body: "Add full-text search across all content using Elasticsearch. Includes indexing, query building, and results ranking.",
        },
      ],
    },
    expectedBehavior:
      "Should recommend Issue #16 (button alignment) given the user's limited 2 hours/week availability. Issue #17 is a major feature that would take much longer. The recommendation should consider time commitment.",
  },

  // Test Case 9: Advanced user with documentation issue
  {
    name: "Advanced user with only simple issues",
    input: {
      user: {
        id: "test-9",
        username: "expert_dev",
        skillLevel: "advanced",
        preferredLanguages: ["Rust", "C++"],
        interests: ["compilers", "performance"],
        pastContributions: 100,
      },
      issues: [
        {
          id: "18",
          title: "Update README with installation instructions",
          labels: ["documentation", "good-first-issue"],
          repository: "compiler/docs",
          language: "Markdown",
          commentCount: 0,
          url: "https://github.com/compiler/docs/issues/18",
          body: "Add Windows installation instructions to the README.",
        },
        {
          id: "19",
          title: "Add code of conduct",
          labels: ["community", "good-first-issue"],
          repository: "compiler/docs",
          language: "Markdown",
          commentCount: 1,
          url: "https://github.com/compiler/docs/issues/19",
          body: "Add a CODE_OF_CONDUCT.md file based on Contributor Covenant.",
        },
      ],
    },
    expectedBehavior:
      "Should acknowledge that both issues are below the user's skill level. May recommend Issue #18 as slightly more technical (installation instructions) but should flag that these issues might not be challenging enough for an advanced contributor.",
  },

  // Test Case 10: First-time contributor with anxiety-reducing issue
  {
    name: "Zero contributions with very simple first issue",
    input: {
      user: {
        id: "test-10",
        username: "nervous_newbie",
        skillLevel: "beginner",
        preferredLanguages: ["Python"],
        pastContributions: 0,
      },
      issues: [
        {
          id: "20",
          title: "Fix spelling mistakes in comments",
          labels: ["good-first-issue", "documentation"],
          repository: "library/core",
          language: "Python",
          commentCount: 0,
          url: "https://github.com/library/core/issues/20",
          body: "Found 3 spelling mistakes in code comments. Easy fix!",
        },
        {
          id: "21",
          title: "Add input validation to user form",
          labels: ["good-first-issue", "enhancement"],
          repository: "library/web",
          language: "Python",
          commentCount: 3,
          url: "https://github.com/library/web/issues/21",
          body: "Add email and phone number validation to the registration form.",
        },
      ],
    },
    expectedBehavior:
      "Should recommend Issue #20 (spelling fix) as the absolute simplest starting point for someone with zero contributions. This builds confidence before tackling validation logic in Issue #21.",
  },

  // Test Case 11: Intermediate with stale vs fresh issues
  {
    name: "Intermediate choosing between stale and fresh issues",
    input: {
      user: {
        id: "test-11",
        username: "active_contributor",
        skillLevel: "intermediate",
        preferredLanguages: ["TypeScript"],
        pastContributions: 20,
      },
      issues: [
        {
          id: "22",
          title: "Add pagination to user list",
          labels: ["feature", "help-wanted"],
          repository: "admin/dashboard",
          language: "TypeScript",
          openedAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year old
          commentCount: 45,
          url: "https://github.com/admin/dashboard/issues/22",
          body: "User list needs pagination for better performance with large datasets.",
        },
        {
          id: "23",
          title: "Add loading skeleton to dashboard",
          labels: ["feature", "ui"],
          repository: "admin/dashboard",
          language: "TypeScript",
          openedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 1 week old
          commentCount: 3,
          url: "https://github.com/admin/dashboard/issues/23",
          body: "Add skeleton loading states to improve perceived performance.",
        },
      ],
    },
    expectedBehavior:
      "Should prefer Issue #23 (loading skeleton) as it's fresh (1 week old) vs Issue #22 (1 year old with 45 comments suggesting it may be stuck or complex). Fresh issues with active maintainer engagement are better.",
  },

  // Test Case 12: Multi-language user with cross-stack issue
  {
    name: "Full-stack developer with cross-cutting issue",
    input: {
      user: {
        id: "test-12",
        username: "fullstack_dev",
        skillLevel: "advanced",
        preferredLanguages: ["TypeScript", "Python", "Go"],
        interests: ["fullstack", "api-design"],
        pastContributions: 35,
      },
      issues: [
        {
          id: "24",
          title: "Implement real-time notifications",
          labels: ["feature", "fullstack"],
          repository: "platform/monorepo",
          language: "TypeScript",
          commentCount: 8,
          url: "https://github.com/platform/monorepo/issues/24",
          body: "Add real-time notifications using WebSockets. Requires changes to both frontend (React) and backend (Go API + Python worker).",
        },
        {
          id: "25",
          title: "Refactor button component styles",
          labels: ["refactoring", "ui"],
          repository: "platform/frontend",
          language: "TypeScript",
          commentCount: 2,
          url: "https://github.com/platform/frontend/issues/25",
          body: "Consolidate button styles into a single component with variants.",
        },
      ],
    },
    expectedBehavior:
      "Should recommend Issue #24 (real-time notifications) as it leverages the user's full-stack skills across TypeScript, Python, and Go. This matches their interests and advanced skill level better than a simple CSS refactor.",
  },
];

// ============================================
// COMMITMENT COACH TEST CASES
// ============================================

export const commitmentCoachTestCases: Array<{
  name: string;
  input: CommitmentCoachInput;
  expectedBehavior: string;
}> = [
  // Test Case 1: Critical deadline - 1 day left, early stage
  {
    name: "Critical: 1 day left, still on read_issue",
    input: {
      commitment: {
        id: "c1",
        issueTitle: "Fix typo in README",
        issueUrl: "https://github.com/org/repo/issues/1",
        repository: "org/repo",
        createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
        deadlineAt: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
        currentMilestone: "read_issue",
        milestonesCompleted: ["not_started"],
      },
      user: { username: "test_user" },
      currentTime: new Date().toISOString(),
    },
    expectedBehavior:
      "Should have 'urgent' tone, flag CRITICAL risk level (only 1 day left but barely started), include a warning with specific suggestion to either push hard or consider dropping commitment.",
  },

  // Test Case 2: On track - good progress
  {
    name: "On track: Day 3, working on solution",
    input: {
      commitment: {
        id: "c2",
        issueTitle: "Add dark mode support",
        issueUrl: "https://github.com/org/repo/issues/2",
        repository: "org/repo",
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        deadlineAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
        currentMilestone: "work_on_solution",
        milestonesCompleted: ["not_started", "read_issue", "ask_question"],
      },
      user: { username: "productive_dev", completedCommitments: 5 },
      currentTime: new Date().toISOString(),
    },
    expectedBehavior:
      "Should have 'encouraging' or 'motivating' tone, flag ON_TRACK risk level. User is making good progress with 4 days left and already working on solution. Should encourage continuing momentum.",
  },

  // Test Case 3: Just started - Day 1
  {
    name: "Just started: Day 1, not started yet",
    input: {
      commitment: {
        id: "c3",
        issueTitle: "Implement user preferences API",
        issueUrl: "https://github.com/org/repo/issues/3",
        repository: "org/repo",
        createdAt: new Date(Date.now() - 0.5 * 24 * 60 * 60 * 1000).toISOString(),
        deadlineAt: new Date(Date.now() + 6.5 * 24 * 60 * 60 * 1000).toISOString(),
        currentMilestone: "not_started",
        milestonesCompleted: [],
      },
      user: { username: "new_committer", completedCommitments: 0 },
      currentTime: new Date().toISOString(),
    },
    expectedBehavior:
      "Should have 'encouraging' tone (fresh start), flag ON_TRACK risk (plenty of time). First action should be to read the issue. Should be welcoming for first-time committer.",
  },

  // Test Case 4: Needs attention - Day 4, still reading
  {
    name: "Needs attention: Day 4, only read issue",
    input: {
      commitment: {
        id: "c4",
        issueTitle: "Fix pagination bug",
        issueUrl: "https://github.com/org/repo/issues/4",
        repository: "org/repo",
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        deadlineAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        currentMilestone: "read_issue",
        milestonesCompleted: ["not_started"],
      },
      user: { username: "slow_starter" },
      currentTime: new Date().toISOString(),
    },
    expectedBehavior:
      "Should have 'motivating' tone, flag NEEDS_ATTENTION risk level. 4 days in with only 3 left, still on read_issue. Should push to move forward without being harsh.",
  },

  // Test Case 5: About to complete - PR opened
  {
    name: "Almost done: PR opened, 2 days left",
    input: {
      commitment: {
        id: "c5",
        issueTitle: "Add unit tests for auth service",
        issueUrl: "https://github.com/org/repo/issues/5",
        repository: "org/repo",
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        deadlineAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        currentMilestone: "open_pr",
        milestonesCompleted: ["not_started", "read_issue", "ask_question", "work_on_solution"],
      },
      user: { username: "finisher", completedCommitments: 10 },
      currentTime: new Date().toISOString(),
    },
    expectedBehavior:
      "Should have 'celebratory' tone, flag ON_TRACK. User has PR open with 2 days to spare. Should congratulate progress and encourage addressing any review feedback.",
  },

  // Test Case 6: At risk - Day 5, asking questions
  {
    name: "At risk: Day 5, still asking questions",
    input: {
      commitment: {
        id: "c6",
        issueTitle: "Refactor database models",
        issueUrl: "https://github.com/org/repo/issues/6",
        repository: "org/repo",
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        deadlineAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        currentMilestone: "ask_question",
        milestonesCompleted: ["not_started", "read_issue"],
      },
      user: { username: "blocked_dev" },
      currentTime: new Date().toISOString(),
    },
    expectedBehavior:
      "Should have 'urgent' or 'supportive' tone, flag AT_RISK. 5 days in, only 2 left, still asking questions means work hasn't started. Should include warning and suggest either starting work immediately or reconsidering.",
  },

  // Test Case 7: Completed milestone
  {
    name: "Completed: All milestones done",
    input: {
      commitment: {
        id: "c7",
        issueTitle: "Add search functionality",
        issueUrl: "https://github.com/org/repo/issues/7",
        repository: "org/repo",
        createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
        deadlineAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        currentMilestone: "completed",
        milestonesCompleted: ["not_started", "read_issue", "ask_question", "work_on_solution", "open_pr"],
      },
      user: { username: "champion", completedCommitments: 15 },
      currentTime: new Date().toISOString(),
    },
    expectedBehavior:
      "Should have 'celebratory' tone, flag ON_TRACK. User completed early! Should celebrate achievement and encourage picking up next commitment.",
  },

  // Test Case 8: Overdue commitment
  {
    name: "Overdue: Past deadline, work in progress",
    input: {
      commitment: {
        id: "c8",
        issueTitle: "Fix memory leak",
        issueUrl: "https://github.com/org/repo/issues/8",
        repository: "org/repo",
        createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
        deadlineAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        currentMilestone: "work_on_solution",
        milestonesCompleted: ["not_started", "read_issue", "ask_question"],
      },
      user: { username: "late_finisher" },
      currentTime: new Date().toISOString(),
    },
    expectedBehavior:
      "Should flag CRITICAL risk (overdue). Tone should be 'supportive' not punishing - user is still working on it. Should encourage finishing what they started or making a decision about the commitment.",
  },

  // Test Case 9: Experienced user with good track record
  {
    name: "Experienced: Good track record, day 2",
    input: {
      commitment: {
        id: "c9",
        issueTitle: "Implement caching layer",
        issueUrl: "https://github.com/org/repo/issues/9",
        repository: "org/repo",
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        deadlineAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        currentMilestone: "ask_question",
        milestonesCompleted: ["not_started", "read_issue"],
      },
      user: { username: "reliable_contributor", completedCommitments: 25, totalCommitments: 27 },
      currentTime: new Date().toISOString(),
    },
    expectedBehavior:
      "Should have 'encouraging' tone, flag ON_TRACK. Day 2 with 5 days left, asking questions is good progress. Should acknowledge user's strong track record (25/27 completed).",
  },

  // Test Case 10: No recent activity
  {
    name: "Stalled: No activity for 3 days",
    input: {
      commitment: {
        id: "c10",
        issueTitle: "Update documentation",
        issueUrl: "https://github.com/org/repo/issues/10",
        repository: "org/repo",
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        deadlineAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        currentMilestone: "read_issue",
        milestonesCompleted: ["not_started"],
        lastActivityAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
      user: { username: "busy_person" },
      currentTime: new Date().toISOString(),
    },
    expectedBehavior:
      "Should flag AT_RISK due to inactivity. Note the 3-day gap since last activity. Tone should be 'supportive' - life happens. Should gently re-engage and suggest small next step.",
  },

  // Test Case 11: Quick progress early on
  {
    name: "Fast start: Day 1, already working",
    input: {
      commitment: {
        id: "c11",
        issueTitle: "Add form validation",
        issueUrl: "https://github.com/org/repo/issues/11",
        repository: "org/repo",
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        deadlineAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
        currentMilestone: "work_on_solution",
        milestonesCompleted: ["not_started", "read_issue", "ask_question"],
      },
      user: { username: "eager_beaver" },
      currentTime: new Date().toISOString(),
    },
    expectedBehavior:
      "Should have 'celebratory' or 'encouraging' tone, flag ON_TRACK. Excellent progress - already working on solution on day 1! Should praise the quick start and encourage sustainable pace.",
  },

  // Test Case 12: First commitment ever
  {
    name: "First timer: Very first commitment, day 3",
    input: {
      commitment: {
        id: "c12",
        issueTitle: "Fix button styling",
        issueUrl: "https://github.com/org/repo/issues/12",
        repository: "org/repo",
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        deadlineAt: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
        currentMilestone: "read_issue",
        milestonesCompleted: ["not_started"],
      },
      user: { username: "absolute_beginner", completedCommitments: 0, totalCommitments: 1 },
      currentTime: new Date().toISOString(),
    },
    expectedBehavior:
      "Should have 'supportive' tone, flag ON_TRACK or NEEDS_ATTENTION. This is user's very first commitment - be extra encouraging and helpful. Guide them through the process with clear next steps.",
  },
];

// ============================================
// ISSUE EXPLAINER TEST CASES
// ============================================

export const issueExplainerTestCases: Array<{
  name: string;
  input: IssueExplainerInput;
  expectedBehavior: string;
}> = [
  // Test Case 1: Beginner with UI feature
  {
    name: "Beginner explaining UI feature",
    input: {
      issue: {
        title: "Add dark mode support",
        body: "Users have requested dark mode. We should add a theme toggle in settings that persists to localStorage. Consider using CSS variables for theming.",
        labels: ["feature", "ui", "good-first-issue"],
        repository: "app/frontend",
        url: "https://github.com/app/frontend/issues/1",
      },
      user: { experienceLevel: "beginner" },
    },
    expectedBehavior:
      "Should explain in simple terms what dark mode is, define 'CSS variables' and 'localStorage', suggest a beginner-friendly approach (maybe using a UI library), and note accessibility considerations. Should not assume knowledge of React patterns.",
  },

  // Test Case 2: Advanced with complex bug
  {
    name: "Advanced explaining race condition bug",
    input: {
      issue: {
        title: "Fix race condition in WebSocket message handler",
        body: "Under high load, messages are processed out of order causing state corruption. The issue is in handleMessage() where we update state before confirming receipt. Need to implement proper message queuing with acknowledgments.",
        labels: ["bug", "critical", "networking"],
        repository: "realtime/server",
        url: "https://github.com/realtime/server/issues/2",
      },
      user: { experienceLevel: "advanced" },
    },
    expectedBehavior:
      "Should be concise, skip basic explanations of WebSockets or race conditions. Focus on the specific issue: state update timing, message ordering guarantees, and acknowledgment patterns. Suggest approaches like using a queue or implementing sequence numbers.",
  },

  // Test Case 3: Intermediate with API feature
  {
    name: "Intermediate explaining REST API feature",
    input: {
      issue: {
        title: "Implement pagination for /users endpoint",
        body: "The /users endpoint returns all users which is slow with 10k+ users. Implement cursor-based pagination with a default page size of 50. Should support ?cursor=xxx&limit=N query params.",
        labels: ["feature", "api", "performance"],
        repository: "platform/api",
        url: "https://github.com/platform/api/issues/3",
      },
      user: { experienceLevel: "intermediate" },
    },
    expectedBehavior:
      "Should explain cursor-based vs offset pagination briefly, why cursor is preferred for performance. Should not over-explain what REST or query params are. Focus on implementation approach and edge cases (empty results, invalid cursor).",
  },

  // Test Case 4: Beginner with testing task
  {
    name: "Beginner explaining testing task",
    input: {
      issue: {
        title: "Add unit tests for UserService",
        body: "UserService has 0% test coverage. Add tests for: createUser(), getUserById(), updateUser(), deleteUser(). Use Jest and mock the database layer.",
        labels: ["testing", "good-first-issue"],
        repository: "backend/core",
        url: "https://github.com/backend/core/issues/4",
      },
      user: { experienceLevel: "beginner" },
    },
    expectedBehavior:
      "Should explain what unit tests are and why they matter. Define 'mocking' and why we mock the database. Explain Jest basics. Provide a simple approach: start with one function, write a passing test, then expand. Mention test naming conventions.",
  },

  // Test Case 5: Vague issue description
  {
    name: "Intermediate with vague issue",
    input: {
      issue: {
        title: "Improve performance",
        body: "The app is slow. Make it faster.",
        labels: ["performance"],
        repository: "app/main",
        url: "https://github.com/app/main/issues/5",
      },
      user: { experienceLevel: "intermediate" },
    },
    expectedBehavior:
      "Should acknowledge the issue is vague and lacks specifics. Suggest questions to ask: Which parts are slow? What metrics define 'fast enough'? Are there specific user complaints? Recommend profiling before optimizing. Note this issue needs clarification before starting work.",
  },

  // Test Case 6: Beginner with documentation task
  {
    name: "Beginner with documentation task",
    input: {
      issue: {
        title: "Add API documentation for authentication endpoints",
        body: "Document the /auth/login, /auth/register, and /auth/refresh endpoints. Include request/response examples, error codes, and rate limits. Use OpenAPI/Swagger format.",
        labels: ["documentation", "good-first-issue"],
        repository: "api/docs",
        url: "https://github.com/api/docs/issues/6",
      },
      user: { experienceLevel: "beginner" },
    },
    expectedBehavior:
      "Should explain what OpenAPI/Swagger is in simple terms. Define rate limits and why they exist. Provide a structured approach: start with one endpoint, document request format, then response, then errors. Mention tools for viewing/testing API docs.",
  },

  // Test Case 7: Advanced with security issue
  {
    name: "Advanced explaining security vulnerability",
    input: {
      issue: {
        title: "Fix SQL injection vulnerability in search endpoint",
        body: "The /search endpoint directly interpolates user input into SQL query. Need to use parameterized queries. See OWASP guidelines. Also add input validation.",
        labels: ["security", "critical"],
        repository: "api/search",
        url: "https://github.com/api/search/issues/7",
      },
      user: { experienceLevel: "advanced" },
    },
    expectedBehavior:
      "Should be direct about the severity. Skip explaining what SQL injection is. Focus on: where the vulnerability exists, parameterized query syntax for this stack, input validation strategies, and testing approach (with safe payloads). Mention security review process.",
  },

  // Test Case 8: Intermediate with refactoring task
  {
    name: "Intermediate explaining refactoring task",
    input: {
      issue: {
        title: "Split monolithic UserController into domain services",
        body: "UserController is 2000 lines and handles auth, profile, preferences, and notifications. Extract into: AuthService, ProfileService, PreferencesService, NotificationService. Maintain backwards compatibility.",
        labels: ["refactoring", "tech-debt"],
        repository: "backend/api",
        url: "https://github.com/backend/api/issues/8",
      },
      user: { experienceLevel: "intermediate" },
    },
    expectedBehavior:
      "Should explain the Single Responsibility Principle briefly. Outline a step-by-step approach: 1) Identify boundaries, 2) Extract one service at a time, 3) Update imports, 4) Test thoroughly. Emphasize backwards compatibility and gradual migration.",
  },

  // Test Case 9: Beginner with CI/CD task
  {
    name: "Beginner explaining CI/CD task",
    input: {
      issue: {
        title: "Add GitHub Actions workflow for automated testing",
        body: "Set up CI to run tests on every PR. Should run npm test and fail if tests don't pass. Use ubuntu-latest runner.",
        labels: ["ci-cd", "infrastructure"],
        repository: "project/main",
        url: "https://github.com/project/main/issues/9",
      },
      user: { experienceLevel: "beginner" },
    },
    expectedBehavior:
      "Should explain what CI/CD is and why automated testing matters. Define 'runner' and 'workflow'. Walk through the YAML structure step by step. Mention where to put the file (.github/workflows/). Note that this runs automatically on PRs.",
  },

  // Test Case 10: Issue with RAG context
  {
    name: "Beginner with RAG context available",
    input: {
      issue: {
        title: "Add rate limiting to API endpoints",
        body: "Implement rate limiting to prevent abuse. Start with 100 requests per minute per user.",
        labels: ["security", "feature"],
        repository: "api/gateway",
        url: "https://github.com/api/gateway/issues/10",
      },
      user: { experienceLevel: "beginner" },
      repoContext: `## Repository Documentation Context
### CONTRIBUTING.md
All PRs must include tests. Use the rate-limiter-flexible package for rate limiting.
Rate limit configs go in config/limits.json.

### docs/architecture.md
API gateway uses Express.js middleware pattern. Add new middleware in src/middleware/.`,
    },
    expectedBehavior:
      "Should incorporate the RAG context: mention using rate-limiter-flexible package, putting config in config/limits.json, creating middleware in src/middleware/. Should extract and list these repo-specific guidelines. Explain rate limiting concept simply.",
  },

  // Test Case 11: Advanced with infrastructure task
  {
    name: "Advanced explaining Kubernetes migration",
    input: {
      issue: {
        title: "Migrate deployment from Docker Compose to Kubernetes",
        body: "Create k8s manifests for all services. Include: Deployments, Services, ConfigMaps, Secrets, Ingress. Set up horizontal pod autoscaling for API pods.",
        labels: ["infrastructure", "devops"],
        repository: "platform/infra",
        url: "https://github.com/platform/infra/issues/11",
      },
      user: { experienceLevel: "advanced" },
    },
    expectedBehavior:
      "Should skip explaining what Kubernetes is. Focus on manifest structure, HPA configuration, secrets management best practices, and Ingress setup. Suggest using Helm or Kustomize for environment differences. Note testing strategy in staging first.",
  },

  // Test Case 12: Intermediate with frontend bug
  {
    name: "Intermediate explaining React state bug",
    input: {
      issue: {
        title: "Fix stale closure in useEffect causing incorrect data display",
        body: "The dashboard shows stale data after user switches tabs. The useEffect callback captures old state. Need to properly handle dependencies or use useRef.",
        labels: ["bug", "react"],
        repository: "dashboard/web",
        url: "https://github.com/dashboard/web/issues/12",
      },
      user: { experienceLevel: "intermediate" },
    },
    expectedBehavior:
      "Should explain the stale closure problem in React hooks at an intermediate level. Cover the dependency array, why it matters, and solutions: adding proper dependencies, using useRef for mutable values, or using functional updates. Not over-explain basic React.",
  },
];
