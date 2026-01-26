import google.generativeai as genai
from typing import List, Dict, Any, Optional
import os
import json
from tools.github_tools import GitHubTools
from models.schemas import UserProfile, ContributionGuide
from opik.opik_wrapper import opik_wrapper


class PreparationAgent:
    """
    Proactively prepares onboarding materials for selected repositories.
    Generates personalized getting-started guides.
    """

    def __init__(self):
        genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
        self.model = genai.GenerativeModel('gemini-2.0-flash-exp')
        self.github_tools = GitHubTools()

    @opik_wrapper.track_agent("preparation_agent")
    async def prepare_onboarding_guide(
        self,
        user_profile: UserProfile,
        repo_name: str
    ) -> ContributionGuide:
        """
        Generate a personalized onboarding guide for a repository.
        """
        # Step 1: Gather repository information
        readme = await self.github_tools.get_readme(repo_name)
        contributing_guide = await self.github_tools.get_contributing_guide(repo_name)
        repo_info = await self.github_tools.get_repository_info(repo_name)

        # Step 2: Generate personalized guide using Gemini
        guide = await self._generate_guide(
            user_profile,
            repo_name,
            readme,
            contributing_guide,
            repo_info
        )

        return guide

    async def _generate_guide(
        self,
        user_profile: UserProfile,
        repo_name: str,
        readme: Optional[str],
        contributing_guide: Optional[str],
        repo_info: Dict[str, Any]
    ) -> ContributionGuide:
        """
        Use Gemini to generate a personalized onboarding guide.
        """
        prompt = f"""You are creating a personalized onboarding guide for a new contributor.

Repository: {repo_name}
Language: {repo_info.get('language', 'Unknown')}
Description: {repo_info.get('description', 'N/A')}

User Profile:
- Skill Level: {user_profile.skill_level}
- Languages: {', '.join(user_profile.programming_languages)}

README Content (first 1000 chars):
{(readme or 'Not available')[:1000]}

CONTRIBUTING.md (first 1000 chars):
{(contributing_guide or 'Not available')[:1000]}

Create a comprehensive, beginner-friendly onboarding guide with these sections:

1. SETUP INSTRUCTIONS: Step-by-step environment setup tailored to this project
2. PROJECT STRUCTURE: Overview of the codebase organization
3. CODING CONVENTIONS: Key style guidelines and patterns used
4. TESTING GUIDE: How to run tests and write new ones
5. CONTRIBUTION WORKFLOW: Git workflow and PR process
6. HELPFUL RESOURCES: Links and tips for getting started

Important:
- Tailor complexity to skill level: {user_profile.skill_level}
- Be specific to this project
- Include actual commands and examples
- Be encouraging and welcoming

Respond in JSON format:
{{
  "setup_instructions": "Detailed setup steps...",
  "project_structure": "Overview of folders and key files...",
  "coding_conventions": "Style guide, naming conventions, patterns...",
  "testing_guide": "How to run tests, write tests...",
  "contribution_workflow": "Fork, branch, commit, PR process...",
  "helpful_resources": [
    "Link or tip 1",
    "Link or tip 2",
    ...
  ]
}}

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
            json_start = response_text.find("{")
            json_end = response_text.rfind("}") + 1
            guide_json = json.loads(response_text[json_start:json_end])

            return ContributionGuide(
                repo_name=repo_name,
                setup_instructions=guide_json["setup_instructions"],
                project_structure=guide_json["project_structure"],
                coding_conventions=guide_json["coding_conventions"],
                testing_guide=guide_json["testing_guide"],
                contribution_workflow=guide_json["contribution_workflow"],
                helpful_resources=guide_json["helpful_resources"]
            )

        except Exception as e:
            print(f"Error generating contribution guide: {e}")
            # Fallback guide
            return ContributionGuide(
                repo_name=repo_name,
                setup_instructions=self._extract_setup_from_readme(readme) or "Clone the repository and follow README instructions",
                project_structure="Explore the repository to understand the structure",
                coding_conventions=self._extract_conventions(contributing_guide) or "Follow the project's existing code style",
                testing_guide="Check README or CONTRIBUTING.md for testing instructions",
                contribution_workflow="Standard GitHub flow: fork, branch, commit, push, PR",
                helpful_resources=[
                    f"Repository: https://github.com/{repo_name}",
                    "GitHub Flow Guide: https://guides.github.com/introduction/flow/"
                ]
            )

    def _extract_setup_from_readme(self, readme: Optional[str]) -> Optional[str]:
        """Extract setup instructions from README"""
        if not readme:
            return None

        # Look for common setup section headers
        readme_lower = readme.lower()
        setup_keywords = ["## installation", "## setup", "## getting started", "## quick start"]

        for keyword in setup_keywords:
            if keyword in readme_lower:
                start = readme_lower.index(keyword)
                # Get next ~500 chars
                end = min(start + 500, len(readme))
                return readme[start:end]

        return None

    def _extract_conventions(self, contributing_guide: Optional[str]) -> Optional[str]:
        """Extract coding conventions from contributing guide"""
        if not contributing_guide:
            return None

        guide_lower = contributing_guide.lower()
        convention_keywords = ["## style", "## coding", "## convention"]

        for keyword in convention_keywords:
            if keyword in guide_lower:
                start = guide_lower.index(keyword)
                end = min(start + 400, len(contributing_guide))
                return contributing_guide[start:end]

        return None
