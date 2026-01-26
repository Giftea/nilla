from typing import Dict, Any, List
from datetime import datetime
from models.schemas import UserProfile, ContributionOutcome, SkillLevel
from opik.opik_wrapper import opik_wrapper
import google.generativeai as genai
import os
import json


class ProgressTrackerAgent:
    """
    Monitors contribution outcomes and adapts recommendations.
    Tracks success metrics and recalibrates difficulty estimates.
    """

    def __init__(self):
        genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
        self.model = genai.GenerativeModel('gemini-2.0-flash-exp')

    @opik_wrapper.track_agent("progress_tracker")
    async def analyze_contribution_outcome(
        self,
        user_profile: UserProfile,
        outcome: ContributionOutcome
    ) -> Dict[str, Any]:
        """
        Analyze a contribution outcome and generate insights.
        """
        insights = await self._generate_insights(user_profile, outcome)

        return insights

    async def _generate_insights(
        self,
        user_profile: UserProfile,
        outcome: ContributionOutcome
    ) -> Dict[str, Any]:
        """
        Use Gemini to generate personalized insights and recommendations.
        """
        # Calculate time spent
        time_spent = None
        if outcome.completed_at:
            time_spent = (outcome.completed_at - outcome.started_at).days

        prompt = f"""Analyze this open source contribution outcome and provide insights.

User Profile:
- Skill Level: {user_profile.skill_level}
- Languages: {', '.join(user_profile.programming_languages)}

Contribution:
- Repository: {outcome.repo_name}
- Issue: #{outcome.issue_number}
- Status: {outcome.status}
- Time Spent: {time_spent} days
- PR URL: {outcome.pr_url or 'N/A'}
- User Feedback: {outcome.user_feedback or 'None provided'}

Analyze this contribution and provide:

1. SUCCESS_ASSESSMENT: Was this a successful contribution? Why or why not?
2. SKILL_LEVEL_ADJUSTMENT: Should we adjust difficulty for future recommendations?
   - "increase" if they succeeded easily
   - "maintain" if appropriate difficulty
   - "decrease" if they struggled
3. LEARNING_INSIGHTS: What did they likely learn from this?
4. NEXT_STEPS: What should they try next?
5. ENCOURAGEMENT: Personalized encouraging message

Respond in JSON format:
{{
  "success_score": 0.85,
  "success_assessment": "Analysis of success...",
  "skill_level_adjustment": "maintain",
  "suggested_new_skill_level": "intermediate",
  "learning_insights": "What they learned...",
  "next_steps": "Recommendations for next contribution...",
  "encouragement": "Encouraging message...",
  "metrics": {{
    "completion_rate": 1.0,
    "estimated_difficulty_accuracy": 0.9
  }}
}}

Only output the JSON object."""

        response = self.model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=0.7,
                max_output_tokens=2000,
            )
        )

        try:
            response_text = response.text
            json_start = response_text.find("{")
            json_end = response_text.rfind("}") + 1
            insights = json.loads(response_text[json_start:json_end])

            return insights

        except Exception as e:
            print(f"Error generating insights: {e}")
            return {
                "success_score": 0.5,
                "success_assessment": "Unable to fully assess contribution",
                "skill_level_adjustment": "maintain",
                "suggested_new_skill_level": user_profile.skill_level,
                "learning_insights": "Gained experience with open source workflow",
                "next_steps": "Continue contributing to similar projects",
                "encouragement": "Keep up the great work!",
                "metrics": {
                    "completion_rate": 1.0 if outcome.status == "merged" else 0.0
                }
            }

    async def generate_progress_report(
        self,
        user_profile: UserProfile,
        outcomes: List[ContributionOutcome]
    ) -> Dict[str, Any]:
        """
        Generate a comprehensive progress report for the user.
        """
        total_contributions = len(outcomes)
        merged_count = len([o for o in outcomes if o.status == "merged"])
        in_progress_count = len([o for o in outcomes if o.status == "in_progress"])

        completion_rate = merged_count / total_contributions if total_contributions > 0 else 0

        # Calculate average time to completion
        completed = [o for o in outcomes if o.completed_at]
        avg_days = None
        if completed:
            total_days = sum((o.completed_at - o.started_at).days for o in completed)
            avg_days = total_days / len(completed)

        report = {
            "total_contributions": total_contributions,
            "merged": merged_count,
            "in_progress": in_progress_count,
            "completion_rate": completion_rate,
            "average_days_to_complete": avg_days,
            "repositories_contributed_to": list(set(o.repo_name for o in outcomes)),
            "trend": "improving" if completion_rate > 0.7 else "learning",
        }

        return report

    async def recommend_difficulty_adjustment(
        self,
        user_profile: UserProfile,
        recent_outcomes: List[ContributionOutcome]
    ) -> SkillLevel:
        """
        Recommend skill level adjustment based on recent performance.
        """
        if not recent_outcomes:
            return user_profile.skill_level

        # Calculate success rate in recent contributions
        recent_merged = len([o for o in recent_outcomes if o.status == "merged"])
        success_rate = recent_merged / len(recent_outcomes)

        # Calculate average completion time
        completed = [o for o in recent_outcomes if o.completed_at]
        if completed:
            avg_days = sum((o.completed_at - o.started_at).days for o in completed) / len(completed)

            # Quick completion + high success = increase difficulty
            if success_rate >= 0.8 and avg_days < 7:
                if user_profile.skill_level == SkillLevel.BEGINNER:
                    return SkillLevel.INTERMEDIATE
                elif user_profile.skill_level == SkillLevel.INTERMEDIATE:
                    return SkillLevel.ADVANCED

            # Low success rate = decrease difficulty
            elif success_rate < 0.3:
                if user_profile.skill_level == SkillLevel.ADVANCED:
                    return SkillLevel.INTERMEDIATE
                elif user_profile.skill_level == SkillLevel.INTERMEDIATE:
                    return SkillLevel.BEGINNER

        return user_profile.skill_level
