import google.generativeai as genai
from typing import List, Dict, Any
import os
import json
from tools.github_tools import GitHubTools
from models.schemas import UserProfile, RepositoryMatch, SkillLevel
from evaluators.opik_wrapper import opik_wrapper


class RepositoryScoutAgent:
    """
    Autonomously searches and evaluates repositories based on user profile.
    Uses GitHub API and Gemini to analyze and rank repositories.
    """

    def __init__(self):
        genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
        self.model = genai.GenerativeModel('gemini-2.0-flash-exp')
        self.github_tools = GitHubTools()

    @opik_wrapper.track_agent("repository_scout")
    async def find_repositories(self, user_profile: UserProfile) -> List[RepositoryMatch]:
        """
        Main entry point: Find and rank suitable repositories for the user.
        """
        # Step 1: Search GitHub for candidate repositories
        candidate_repos = await self.github_tools.search_repositories(
            languages=user_profile.programming_languages,
            min_stars=50,  # Ensure some community validation
            max_results=15
        )

        # Step 2: Enrich with additional data
        enriched_repos = []
        for repo in candidate_repos:
            # Get maintainer activity and community friendliness
            activity = await self.github_tools.analyze_maintainer_activity(repo["name"])
            sentiment = await self.github_tools.analyze_pr_sentiment(repo["name"])

            # Count good first issues
            issues = await self.github_tools.get_issues(repo["name"], max_results=5)

            enriched_repos.append({
                **repo,
                "maintainer_activity": activity,
                "community_friendliness": sentiment,
                "good_first_issues_count": len(issues),
            })

        # Step 3: Use Gemini to analyze and rank repositories
        ranked_repos = await self._analyze_and_rank(user_profile, enriched_repos)

        # Step 4: Convert to RepositoryMatch objects
        return ranked_repos[:5]  # Return top 5

    async def _analyze_and_rank(
        self,
        user_profile: UserProfile,
        repos: List[Dict[str, Any]]
    ) -> List[RepositoryMatch]:
        """
        Use Gemini to analyze repositories and provide ranking with reasoning.
        """
        # Build prompt for Gemini
        prompt = self._build_analysis_prompt(user_profile, repos)

        # Call Gemini
        response = self.model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=0.7,
                max_output_tokens=4000,
            )
        )

        # Parse response
        try:
            response_text = response.text
            # Extract JSON from response
            json_start = response_text.find("[")
            json_end = response_text.rfind("]") + 1
            repos_json = json.loads(response_text[json_start:json_end])

            # Convert to RepositoryMatch objects
            matches = []
            for repo_data in repos_json:
                matches.append(RepositoryMatch(
                    repo_name=repo_data["repo_name"],
                    repo_url=repo_data["repo_url"],
                    description=repo_data["description"],
                    stars=repo_data["stars"],
                    language=repo_data["language"],
                    match_score=repo_data["match_score"],
                    match_reasoning=repo_data["match_reasoning"],
                    difficulty_level=SkillLevel(repo_data["difficulty_level"]),
                    community_friendliness_score=repo_data["community_friendliness_score"],
                    good_first_issues_count=repo_data["good_first_issues_count"],
                    recent_activity=repo_data["recent_activity"]
                ))

            return matches

        except Exception as e:
            print(f"Error parsing Gemini response: {e}")
            return []

    def _build_analysis_prompt(
        self,
        user_profile: UserProfile,
        repos: List[Dict[str, Any]]
    ) -> str:
        """Build the prompt for Gemini to analyze repositories"""

        repos_summary = "\n\n".join([
            f"""Repository {i+1}:
Name: {repo['name']}
URL: {repo['url']}
Description: {repo['description']}
Language: {repo['language']}
Stars: {repo['stars']}
Open Issues: {repo['open_issues']}
Topics: {', '.join(repo.get('topics', []))}
Has Contributing Guide: {repo.get('has_contributing', False)}
Good First Issues: {repo.get('good_first_issues_count', 0)}
Average PR Merge Time: {repo.get('maintainer_activity', {}).get('average_merge_time_days', 'N/A')} days
Issue Response Rate: {repo.get('maintainer_activity', {}).get('issue_response_rate', 0.0):.2f}
Community Friendliness: {repo.get('community_friendliness', 0.5):.2f}
Recent Activity: {repo.get('maintainer_activity', {}).get('recent_commit_activity', False)}"""
            for i, repo in enumerate(repos)
        ])

        return f"""You are an expert open source mentor helping developers find suitable projects to contribute to.

User Profile:
- Skill Level: {user_profile.skill_level}
- Programming Languages: {', '.join(user_profile.programming_languages)}
- Interests: {', '.join(user_profile.interests)}
- Time Commitment: {user_profile.time_commitment}

Available Repositories:
{repos_summary}

Task: Analyze these repositories and select the top 5 most suitable matches for this user.

For each selected repository, provide:
1. match_score (0.0 to 1.0): How well it matches the user's profile
2. match_reasoning: Why this repo is a good fit (2-3 sentences)
3. difficulty_level: beginner, intermediate, or advanced
4. recent_activity: true if actively maintained

Scoring criteria:
- Language match: Does it use the user's languages?
- Skill appropriateness: Is it suitable for their level?
- Interest alignment: Does it match their interests?
- Community quality: Is it welcoming and responsive?
- Contribution opportunities: Are there good first issues?

Respond with a JSON array of the top 5 repositories in this exact format:
[
  {{
    "repo_name": "owner/repo",
    "repo_url": "https://github.com/owner/repo",
    "description": "repo description",
    "stars": 1234,
    "language": "Python",
    "match_score": 0.85,
    "match_reasoning": "This project...",
    "difficulty_level": "beginner",
    "community_friendliness_score": 0.8,
    "good_first_issues_count": 5,
    "recent_activity": true
  }}
]

Only output the JSON array, nothing else."""

        return prompt
