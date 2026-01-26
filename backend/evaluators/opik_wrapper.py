import opik
from opik import track, Opik
from opik.evaluation import evaluate
from opik.evaluation.metrics import base_metric, score_result
from typing import Dict, Any, List, Optional
import os
from dotenv import load_dotenv

load_dotenv()


class OpikWrapper:
    """Wrapper for Opik tracking and evaluation"""

    def __init__(self):
        # Initialize Opik client
        self.client = Opik(
            api_key=os.getenv("OPIK_API_KEY"),
            workspace=os.getenv("OPIK_WORKSPACE", "default"),
            project_name=os.getenv("OPIK_PROJECT_NAME", "codepathfinder"),
        )

    @staticmethod
    def track_agent(agent_name: str):
        """Decorator to track agent executions"""
        return track(name=agent_name, project_name="codepathfinder")

    def log_agent_call(
        self,
        agent_name: str,
        input_data: Dict[str, Any],
        output_data: Dict[str, Any],
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Log an agent call to Opik"""
        self.client.log_traces(
            name=agent_name,
            input=input_data,
            output=output_data,
            metadata=metadata or {},
            project_name="codepathfinder"
        )

    def log_llm_call(
        self,
        prompt: str,
        response: str,
        model: str = "gemini-2.0-flash-exp",
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Log LLM call for tracking"""
        self.client.log_traces(
            name="llm_call",
            input={"prompt": prompt},
            output={"response": response},
            metadata={
                "model": model,
                **(metadata or {})
            },
            project_name="codepathfinder"
        )


class RepositoryMatchQualityMetric(base_metric.BaseMetric):
    """
    LLM-as-Judge metric to evaluate repository match quality.
    Evaluates if suggested repos actually match user's skills and interests.
    """

    def __init__(self, name: str = "repository_match_quality"):
        super().__init__(name=name)

    def score(
        self,
        user_profile: Dict[str, Any],
        repository_matches: List[Dict[str, Any]],
        **ignored_kwargs: Any
    ) -> score_result.ScoreResult:
        """
        Score the quality of repository matches.
        Uses Gemini to judge if repos are appropriate matches.
        """
        import google.generativeai as genai

        genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
        model = genai.GenerativeModel('gemini-2.0-flash-exp')

        # Build evaluation prompt
        evaluation_prompt = f"""You are evaluating the quality of repository recommendations for an open source contributor.

User Profile:
- Skill Level: {user_profile.get('skill_level', 'N/A')}
- Languages: {', '.join(user_profile.get('programming_languages', []))}
- Interests: {', '.join(user_profile.get('interests', []))}

Repository Matches:
{self._format_repos(repository_matches)}

Evaluate whether these repository recommendations are appropriate matches for this user.
Consider:
1. Do the repos match the user's programming languages?
2. Are they appropriate for the user's skill level?
3. Do they align with the user's interests?
4. Are they beginner-friendly (if user is a beginner)?

Provide a score from 0.0 to 1.0, where:
- 1.0 = Perfect matches, highly relevant
- 0.7-0.9 = Good matches with minor misalignments
- 0.4-0.6 = Moderate matches, some relevant aspects
- 0.0-0.3 = Poor matches, largely irrelevant

Respond with ONLY a JSON object in this format:
{{"score": 0.85, "reasoning": "Brief explanation of the score"}}"""

        try:
            response = model.generate_content(
                evaluation_prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.5,
                    max_output_tokens=500,
                )
            )

            import json
            result = json.loads(response.text)

            return score_result.ScoreResult(
                value=result["score"],
                name=self.name,
                reason=result.get("reasoning", "")
            )
        except Exception as e:
            print(f"Error in repository match quality evaluation: {e}")
            return score_result.ScoreResult(value=0.5, name=self.name, reason=f"Evaluation error: {str(e)}")

    def _format_repos(self, repos: List[Dict[str, Any]]) -> str:
        """Format repositories for the evaluation prompt"""
        formatted = []
        for i, repo in enumerate(repos[:5], 1):
            formatted.append(
                f"{i}. {repo.get('repo_name', 'N/A')}\n"
                f"   Language: {repo.get('language', 'N/A')}\n"
                f"   Difficulty: {repo.get('difficulty_level', 'N/A')}\n"
                f"   Reasoning: {repo.get('match_reasoning', 'N/A')[:100]}..."
            )
        return "\n".join(formatted)


class IssueDifficultyCalibrationMetric(base_metric.BaseMetric):
    """
    LLM-as-Judge metric to evaluate issue difficulty rating accuracy.
    """

    def __init__(self, name: str = "issue_difficulty_calibration"):
        super().__init__(name=name)

    def score(
        self,
        issue_data: Dict[str, Any],
        predicted_difficulty: str,
        **ignored_kwargs: Any
    ) -> score_result.ScoreResult:
        """
        Evaluate if the predicted difficulty is accurate for the issue.
        """
        import google.generativeai as genai

        genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
        model = genai.GenerativeModel('gemini-2.0-flash-exp')

        evaluation_prompt = f"""You are evaluating the accuracy of difficulty ratings for GitHub issues.

Issue Details:
- Title: {issue_data.get('title', 'N/A')}
- Description: {issue_data.get('description', 'N/A')[:500]}
- Labels: {', '.join(issue_data.get('labels', []))}

Predicted Difficulty: {predicted_difficulty}

Based on the issue description and labels, evaluate if the predicted difficulty rating is accurate.
Consider:
1. Code complexity required
2. Scope of changes
3. Domain knowledge needed
4. Testing requirements

Rate the calibration accuracy from 0.0 to 1.0:
- 1.0 = Perfectly calibrated difficulty
- 0.5 = Moderately accurate
- 0.0 = Completely miscalibrated

Respond with ONLY a JSON object:
{{"score": 0.9, "reasoning": "Brief explanation"}}"""

        try:
            response = model.generate_content(
                evaluation_prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.5,
                    max_output_tokens=500,
                )
            )

            import json
            result = json.loads(response.text)

            return score_result.ScoreResult(
                value=result["score"],
                name=self.name,
                reason=result.get("reasoning", "")
            )
        except Exception as e:
            return score_result.ScoreResult(value=0.5, name=self.name, reason=f"Error: {str(e)}")


class MentoringHelpfulnessMetric(base_metric.BaseMetric):
    """
    LLM-as-Judge metric to evaluate mentoring plan helpfulness.
    """

    def __init__(self, name: str = "mentoring_helpfulness"):
        super().__init__(name=name)

    def score(
        self,
        mentoring_plan: Dict[str, Any],
        user_skill_level: str,
        **ignored_kwargs: Any
    ) -> score_result.ScoreResult:
        """
        Evaluate if the mentoring plan is clear, actionable, and helpful.
        """
        import google.generativeai as genai

        genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
        model = genai.GenerativeModel('gemini-2.0-flash-exp')

        evaluation_prompt = f"""Evaluate the quality of this mentoring plan for an open source contribution.

User Skill Level: {user_skill_level}

Mentoring Plan:
- Steps: {mentoring_plan.get('step_by_step_plan', [])}
- Key Files: {mentoring_plan.get('key_files_to_examine', [])}
- Approach: {mentoring_plan.get('suggested_approach', 'N/A')}

Rate from 0.0 to 1.0 based on:
1. Clarity and specificity of steps
2. Appropriateness for skill level
3. Actionability of suggestions
4. Completeness of guidance

Respond with ONLY a JSON object:
{{"score": 0.85, "reasoning": "Brief explanation"}}"""

        try:
            response = model.generate_content(
                evaluation_prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.5,
                    max_output_tokens=500,
                )
            )

            import json
            result = json.loads(response.text)

            return score_result.ScoreResult(
                value=result["score"],
                name=self.name,
                reason=result.get("reasoning", "")
            )
        except Exception as e:
            return score_result.ScoreResult(value=0.5, name=self.name, reason=f"Error: {str(e)}")


# Initialize global Opik wrapper instance
opik_wrapper = OpikWrapper()
