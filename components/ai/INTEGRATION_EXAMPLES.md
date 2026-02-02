# AI Component Integration Examples

This file shows how to integrate AI features into existing pages without disrupting current functionality.

## Issues Page Integration

Add the `IssueRecommendationCard` to the issues page. Place it above the issue list.

### Step 1: Import the components and hook

```tsx
// In /app/(dashboard)/issues/page.tsx, add these imports:
import { IssueRecommendationCard } from "@/components/ai";
import type { Issue as AIIssue, UserProfile } from "@/lib/ai";
```

### Step 2: Prepare the AI input data

```tsx
// Inside your component, after fetching issues:

// Transform your issues to AI format
const aiIssues: AIIssue[] = useMemo(() => {
  if (!issues) return [];
  return issues.slice(0, 10).map((issue) => ({
    id: String(issue.number),
    title: issue.title,
    body: issue.body || undefined,
    labels: issue.labels?.map((l: { name: string }) => l.name) || [],
    repository: issue.repository,
    language: issue.language || undefined,
    commentCount: issue.comments,
    url: issue.html_url,
  }));
}, [issues]);

// Create user profile (get from your auth/user context)
const userProfile: UserProfile | null = useMemo(() => {
  if (!user) return null;
  return {
    id: user.id,
    username: user.user_metadata?.user_name || "user",
    skillLevel: user.user_metadata?.skill_level || "beginner",
    preferredLanguages: user.user_metadata?.languages || ["javascript"],
    interests: user.user_metadata?.interests,
    pastContributions: stats?.contributions || 0,
  };
}, [user, stats]);

const aiInput = userProfile && aiIssues.length > 0
  ? { user: userProfile, issues: aiIssues }
  : null;
```

### Step 3: Add the component to your JSX

```tsx
// Place ABOVE your existing issues list:
{filteredIssues.length > 0 && (
  <IssueRecommendationCard
    input={aiInput}
    enabled={!isLoading && aiIssues.length > 0}
    onIssueClick={(issueId) => {
      // Find the issue and trigger commit dialog
      const issue = issues?.find((i) => String(i.number) === issueId);
      if (issue) {
        setSelectedIssue(issue);
        setCommitDialogOpen(true);
      }
    }}
    className="mb-6"
  />
)}

{/* Your existing issues grid */}
<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
  {/* ... existing issue cards ... */}
</div>
```

---

## Commitments Page Integration

Add the `CommitmentCoachCard` to each active commitment card.

### Step 1: Import the components

```tsx
// In /app/(dashboard)/commitments/page.tsx or commitment card component:
import { CommitmentCoachCard } from "@/components/ai";
import type { Commitment as AICommitment, UserContext } from "@/lib/ai";
```

### Step 2: Transform commitment data

```tsx
// Inside your commitment card or map function:

function getAICommitmentInput(commitment: YourCommitmentType, user: YourUserType) {
  const aiCommitment: AICommitment = {
    id: commitment.id,
    issueTitle: commitment.issue_title,
    issueUrl: commitment.issue_url,
    repository: commitment.repository,
    createdAt: commitment.created_at,
    deadlineAt: commitment.deadline, // 7 days from created_at
    currentMilestone: getMilestoneFromProgress(commitment), // Map your progress to milestone
    milestonesCompleted: getCompletedMilestones(commitment),
    lastActivityAt: commitment.updated_at,
  };

  const userContext: UserContext = {
    username: user.user_metadata?.user_name || "contributor",
    totalCommitments: stats?.active_commitments,
    completedCommitments: stats?.completed_commitments,
  };

  return { commitment: aiCommitment, user: userContext };
}

// Helper to map your progress booleans to milestone
function getMilestoneFromProgress(commitment: YourCommitmentType): Milestone {
  if (commitment.pr_opened) return "open_pr";
  if (commitment.working_on_solution) return "work_on_solution";
  if (commitment.asked_question) return "ask_question";
  if (commitment.read_issue) return "read_issue";
  return "not_started";
}

function getCompletedMilestones(commitment: YourCommitmentType): Milestone[] {
  const completed: Milestone[] = [];
  if (commitment.read_issue) completed.push("not_started", "read_issue");
  if (commitment.asked_question) completed.push("ask_question");
  if (commitment.working_on_solution) completed.push("work_on_solution");
  if (commitment.pr_opened) completed.push("open_pr");
  return completed;
}
```

### Step 3: Add to commitment card

```tsx
// Inside each active commitment card, add after the progress checklist:
{commitment.status === "active" && (
  <CommitmentCoachCard
    input={getAICommitmentInput(commitment, user)}
    enabled={true}
    className="mt-4"
  />
)}
```

---

## Error Handling Strategy

The AI components are designed to be **non-blocking**:

1. **Loading State**: Shows a subtle spinner with "AI is thinking..."
2. **Error State**: Shows "AI recommendations unavailable" with retry button
3. **No Data**: Component returns `null` and doesn't render
4. **Network Failure**: Caught by React Query, displays error state

The primary UI always works even if AI fails.

---

## Performance Considerations

- **Caching**: Results are cached for 5 minutes (issues) / 2 minutes (coaching)
- **Lazy Loading**: AI calls only happen when component is enabled and has data
- **Rate Limiting**: Single retry on failure, then shows error state
- **Debouncing**: Query keys include data counts to prevent unnecessary refetches

---

## On-Demand Pattern (Alternative)

If you prefer button-triggered AI instead of automatic:

```tsx
import { useIssueRecommendationMutation } from "@/lib/hooks/use-ai";

function MyComponent() {
  const { mutate, isPending, data, error } = useIssueRecommendationMutation();

  return (
    <>
      <Button
        onClick={() => mutate({ user: userProfile, issues: aiIssues })}
        disabled={isPending}
      >
        {isPending ? "Analyzing..." : "Get AI Recommendation"}
      </Button>

      {data && (
        <div className="mt-4">
          <h3>Recommended: {data.recommendedIssue.title}</h3>
          <p>{data.explanation}</p>
        </div>
      )}
    </>
  );
}
```
