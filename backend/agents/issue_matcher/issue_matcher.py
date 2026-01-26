import google.generativeai as genai
from typing import List, Dict, Any
import os
import json
from datetime import datetime
from tools.github_tools import GitHubTools
from models.schemas import UserProfile, Issue, SkillLevel
from opik.opik_wrapper import opik_wrapper


class IssueMatcherAgent:
    """
    Finds and ranks issues suitable for user's skill level.
    Analyzes issue complexity and provides difficulty ratings.
    """

    def __init__(self):
        genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
        self.model = genai.GenerativeModel('gemini-2.0-flash-exp')
        self.github_tools = GitHubTools()

    @opik_wrapper.track_agent("issue_matcher")
    async def find_suitable_issues(
        self,
        user_profile: UserProfile,
        repo_name: str
    ) -> List[Issue]:
        """
        Find and rank issues appropriate for the user's skill level.
        """
        # Step 1: Fetch issues from GitHub
        github_issues = await self.github_tools.get_issues(
            repo_name=repo_name,
            labels=None,  # Will use default beginner-friendly labels
            max_results=20
        )

        if not github_issues:
            return []

        # Step 2: Use Gemini to analyze each issue's complexity
        analyzed_issues = await self._analyze_issues(
            user_profile,
            repo_name,
            github_issues
        )

        # Step 3: Rank by suitability
        ranked_issues = sorted(
            analyzed_issues,
            key=lambda x: self._calculate_suitability_score(x, user_profile),
            reverse=True
        )

        return ranked_issues[:5]  # Return top 5

    async def _analyze_issues(
        self,
        user_profile: UserProfile,
        repo_name: str,
        github_issues: List[Dict[str, Any]]
    ) -> List[Issue]:
        """
        Use Gemini to analyze issue complexity and generate approach suggestions.
        """
        # Analyze in batches to avoid token limits
        batch_size = 5
        all_analyzed = []

        for i in range(0, len(github_issues), batch_size):
            batch = github_issues[i:i+batch_size]
            analyzed_batch = await self._analyze_batch(user_profile, repo_name, batch)
            all_analyzed.extend(analyzed_batch)

        return all_analyzed

    async def _analyze_batch(
        self,
        user_profile: UserProfile,
        repo_name: str,
        issues: List[Dict[str, Any]]
    ) -> List[Issue]:
        """Analyze a batch of issues"""

        prompt = self._build_issue_analysis_prompt(user_profile, repo_name, issues)

        response = self.model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=0.5,
                max_output_tokens=4000,
            )
        )

        try:
            response_text = response.text
            json_start = response_text.find("[")
            json_end = response_text.rfind("]") + 1
            issues_json = json.loads(response_text[json_start:json_end])

            analyzed_issues = []
            for issue_data in issues_json:
                # Find corresponding GitHub issue for metadata
                github_issue = next(
                    (gi for gi in issues if gi["number"] == issue_data["issue_number"]),
                    None
                )

                if github_issue:
                    analyzed_issues.append(Issue(
                        issue_number=issue_data["issue_number"],
                        title=issue_data["title"],
                        url=issue_data["url"],
                        labels=github_issue["labels"],
                        description=issue_data["description"][:500],
                        difficulty_rating=SkillLevel(issue_data["difficulty_rating"]),
                        estimated_complexity=issue_data["estimated_complexity"],
                        approach_suggestions=issue_data["approach_suggestions"],
                        created_at=datetime.fromisoformat(github_issue["created_at"].replace("Z", "+00:00")),
                        comments_count=github_issue["comments"]
                    ))

            return analyzed_issues

        except Exception as e:
            print(f"Error analyzing issues: {e}")
            return []

    def _build_issue_analysis_prompt(
        self,
        user_profile: UserProfile,
        repo_name: str,
        issues: List[Dict[str, Any]]
    ) -> str:
        """Build prompt for issue analysis"""

        issues_summary = "\n\n".join([
            f"""Issue #{issue['number']}:
Title: {issue['title']}
URL: {issue['url']}
Labels: {', '.join(issue['labels'])}
Description: {issue['body'][:500]}
Comments: {issue['comments']}
Created: {issue['created_at']}"""
            for issue in issues
        ])

        return f"""You are analyzing GitHub issues to help a developer find suitable contribution opportunities.

Repository: {repo_name}

User Profile:
- Skill Level: {user_profile.skill_level}
- Languages: {', '.join(user_profile.programming_languages)}
- Interests: {', '.join(user_profile.interests)}

Issues to Analyze:
{issues_summary}

For each issue, determine:
1. difficulty_rating: beginner, intermediate, or advanced
2. estimated_complexity: Brief description (e.g., "Simple text change", "Moderate refactoring", "Complex algorithm implementation")
3. approach_suggestions: 2-3 sentences on how to approach this issue

Consider:
- Code changes required (scope and complexity)
- Testing needs
- Domain knowledge required
- Impact on existing codebase

Respond with a JSON array:
[
  {{
    "issue_number": 123,
    "title": "Issue title",
    "url": "https://github.com/...",
    "description": "Brief description",
    "difficulty_rating": "beginner",
    "estimated_complexity": "Simple bug fix in error handling logic",
    "approach_suggestions": "Start by reading the error handling module. Add a try-catch block around the failing code. Write a test case to verify the fix."
  }}
]

Only output the JSON array."""

        return prompt

    def _calculate_suitability_score(self, issue: Issue, user_profile: UserProfile) -> float:
        """
        Calculate how suitable an issue is for the user.
        Higher score = more suitable.
        """
        score = 0.0

        # Match difficulty with skill level
        difficulty_match = {
            (SkillLevel.BEGINNER, SkillLevel.BEGINNER): 1.0,
            (SkillLevel.BEGINNER, SkillLevel.INTERMEDIATE): 0.3,
            (SkillLevel.INTERMEDIATE, SkillLevel.BEGINNER): 0.7,
            (SkillLevel.INTERMEDIATE, SkillLevel.INTERMEDIATE): 1.0,
            (SkillLevel.INTERMEDIATE, SkillLevel.ADVANCED): 0.4,
            (SkillLevel.ADVANCED, SkillLevel.INTERMEDIATE): 0.6,
            (SkillLevel.ADVANCED, SkillLevel.ADVANCED): 1.0,
        }

        score += difficulty_match.get(
            (user_profile.skill_level, issue.difficulty_rating),
            0.5
        ) * 0.6  # 60% weight

        # Prefer issues with labels like "good first issue"
        good_labels = ["good first issue", "beginner-friendly", "easy", "help wanted"]
        if any(label.lower() in [l.lower() for l in issue.labels] for label in good_labels):
            score += 0.2

        # Prefer issues with some comments (indicates clarity/interest)
        if 0 < issue.comments_count < 5:
            score += 0.1
        elif issue.comments_count >= 5:
            score += 0.05  # Too many comments might indicate complexity

        # Recent issues are better
        days_old = (datetime.utcnow().replace(tzinfo=issue.created_at.tzinfo) - issue.created_at).days
        if days_old < 30:
            score += 0.1

        return min(score, 1.0)
