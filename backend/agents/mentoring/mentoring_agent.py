import google.generativeai as genai
from typing import List, Dict, Any
import os
import json
from tools.github_tools import GitHubTools
from models.schemas import UserProfile, MentoringPlan, SkillLevel
from evaluators.opik_wrapper import opik_wrapper


class MentoringAgent:
    """
    Provides step-by-step guidance for tackling selected issues.
    Uses reasoning chains to break down the contribution process.
    """

    def __init__(self):
        genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
        self.model = genai.GenerativeModel('gemini-2.0-flash-exp')
        self.github_tools = GitHubTools()

    @opik_wrapper.track_agent("mentoring_agent")
    async def create_mentoring_plan(
        self,
        user_profile: UserProfile,
        repo_name: str,
        issue_number: int
    ) -> MentoringPlan:
        """
        Create a detailed, step-by-step plan for addressing an issue.
        """
        # Step 1: Gather context about the issue
        issues = await self.github_tools.get_issues(repo_name, max_results=50)
        target_issue = next((i for i in issues if i["number"] == issue_number), None)

        if not target_issue:
            raise ValueError(f"Issue #{issue_number} not found in {repo_name}")

        # Step 2: Get repository context
        readme = await self.github_tools.get_readme(repo_name)
        contributing_guide = await self.github_tools.get_contributing_guide(repo_name)

        # Step 3: Use Gemini with chain-of-thought reasoning
        plan = await self._generate_plan_with_reasoning(
            user_profile,
            repo_name,
            target_issue,
            readme,
            contributing_guide
        )

        return plan

    async def _generate_plan_with_reasoning(
        self,
        user_profile: UserProfile,
        repo_name: str,
        issue: Dict[str, Any],
        readme: str,
        contributing_guide: str
    ) -> MentoringPlan:
        """
        Use Gemini to generate a detailed contribution plan with reasoning.
        """
        prompt = f"""You are an expert mentor guiding a developer through their open source contribution.

Repository: {repo_name}

User Profile:
- Skill Level: {user_profile.skill_level}
- Languages: {', '.join(user_profile.programming_languages)}
- Experience: {user_profile.time_commitment} per week

Issue Details:
- Number: #{issue['number']}
- Title: {issue['title']}
- Description: {issue['body'][:1000]}
- Labels: {', '.join(issue['labels'])}

README (first 500 chars):
{(readme or 'Not available')[:500]}

Contributing Guide (first 500 chars):
{(contributing_guide or 'Not available')[:500]}

Task: Create a comprehensive, step-by-step mentoring plan to help this developer successfully contribute.

Think through this step by step:

1. UNDERSTANDING: What is the issue asking for?
2. ANALYSIS: What parts of the codebase are likely involved?
3. APPROACH: What's the best way to solve this?
4. IMPLEMENTATION: What are the concrete steps?
5. VALIDATION: How should they test their changes?

Provide your response in this JSON format:
{{
  "step_by_step_plan": [
    "Step 1: Fork the repository and clone it locally",
    "Step 2: Set up the development environment...",
    "Step 3: ...",
    ...
  ],
  "key_files_to_examine": [
    "src/main.py",
    "tests/test_main.py",
    ...
  ],
  "suggested_approach": "Based on the issue description, the best approach is to... This will involve... The key challenge will be...",
  "git_commands": [
    "git clone https://github.com/{repo_name}.git",
    "git checkout -b fix-issue-{issue['number']}",
    "git add .",
    "git commit -m 'Fix: ...'",
    "git push origin fix-issue-{issue['number']}"
  ],
  "testing_strategy": "Description of how to test the changes, including specific test commands and what to verify",
  "potential_challenges": [
    "Challenge 1: Understanding the existing architecture",
    "Challenge 2: ...",
    ...
  ]
}}

IMPORTANT:
- Tailor the complexity to the user's skill level ({user_profile.skill_level})
- Be specific and actionable
- Include actual file paths where possible
- Provide encouragement for beginners

Only output the JSON object."""

        response = self.model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=0.6,
                max_output_tokens=3000,
            )
        )

        try:
            response_text = response.text
            # Extract JSON
            json_start = response_text.find("{")
            json_end = response_text.rfind("}") + 1
            plan_json = json.loads(response_text[json_start:json_end])

            return MentoringPlan(
                issue_number=issue["number"],
                repo_name=repo_name,
                step_by_step_plan=plan_json["step_by_step_plan"],
                key_files_to_examine=plan_json["key_files_to_examine"],
                suggested_approach=plan_json["suggested_approach"],
                git_commands=plan_json["git_commands"],
                testing_strategy=plan_json["testing_strategy"],
                potential_challenges=plan_json["potential_challenges"]
            )

        except Exception as e:
            print(f"Error generating mentoring plan: {e}")
            # Return a basic fallback plan
            return MentoringPlan(
                issue_number=issue["number"],
                repo_name=repo_name,
                step_by_step_plan=[
                    "1. Fork and clone the repository",
                    "2. Read the issue description carefully",
                    "3. Explore the codebase to understand the structure",
                    "4. Implement your solution",
                    "5. Test your changes",
                    "6. Submit a pull request"
                ],
                key_files_to_examine=["README.md", "CONTRIBUTING.md"],
                suggested_approach="Review the issue and explore the codebase to understand the problem.",
                git_commands=[
                    f"git clone https://github.com/{repo_name}.git",
                    f"git checkout -b fix-issue-{issue['number']}"
                ],
                testing_strategy="Run the project's test suite to verify your changes.",
                potential_challenges=["Understanding the codebase structure"]
            )

    async def provide_code_review_simulation(
        self,
        repo_name: str,
        issue_number: int,
        proposed_solution: str
    ) -> str:
        """
        Simulate a code review to help the user improve their solution.
        """
        prompt = f"""You are conducting a friendly code review for a pull request.

Repository: {repo_name}
Issue: #{issue_number}

Proposed Solution:
{proposed_solution}

Provide constructive feedback as a mentor would:
1. What's good about this solution?
2. What could be improved?
3. Any potential issues or edge cases?
4. Suggestions for better practices?

Be encouraging and educational, especially for beginners."""

        response = self.model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=0.7,
                max_output_tokens=1500,
            )
        )

        return response.text
