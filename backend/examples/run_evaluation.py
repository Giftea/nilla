"""
Example script demonstrating Opik evaluation for CodePathfinder agents.

This script shows how to:
1. Run agents on test data
2. Evaluate outputs using LLM-as-judge metrics
3. Track experiments in Opik
4. Compare different prompting strategies
"""

import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

from opik import Opik
from opik.evaluation import evaluate

# Import our agents and metrics
import sys
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from agents import RepositoryScoutAgent, IssueMatcherAgent, MentoringAgent
from evaluators import (
    RepositoryMatchQualityMetric,
    IssueDifficultyCalibrationMetric,
    MentoringHelpfulnessMetric,
)
from models.schemas import UserProfile, SkillLevel


# Test data
TEST_PROFILES = [
    UserProfile(
        skill_level=SkillLevel.BEGINNER,
        programming_languages=["Python"],
        interests=["web-dev", "CLI tools"],
        time_commitment="5-10 hours/week",
    ),
    UserProfile(
        skill_level=SkillLevel.INTERMEDIATE,
        programming_languages=["JavaScript", "TypeScript"],
        interests=["frontend", "React"],
        time_commitment="10-20 hours/week",
    ),
    UserProfile(
        skill_level=SkillLevel.ADVANCED,
        programming_languages=["Rust", "Go"],
        interests=["systems programming", "performance"],
        time_commitment="20+ hours/week",
    ),
]


async def evaluate_repository_scout():
    """Evaluate the Repository Scout Agent's matching quality"""
    print("\n📊 Evaluating Repository Scout Agent...")

    scout_agent = RepositoryScoutAgent()
    metric = RepositoryMatchQualityMetric()

    results = []

    for profile in TEST_PROFILES:
        print(f"\n  Testing with {profile.skill_level} profile...")

        # Run the agent
        repositories = await scout_agent.find_repositories(profile)

        # Prepare data for evaluation
        repos_data = [
            {
                "repo_name": r.repo_name,
                "repo_url": r.repo_url,
                "language": r.language,
                "difficulty_level": r.difficulty_level,
                "match_reasoning": r.match_reasoning,
                "match_score": r.match_score,
            }
            for r in repositories
        ]

        user_profile_dict = {
            "skill_level": profile.skill_level,
            "programming_languages": profile.programming_languages,
            "interests": profile.interests,
        }

        # Evaluate
        score = metric.score(
            user_profile=user_profile_dict,
            repository_matches=repos_data
        )

        results.append({
            "profile": profile.skill_level,
            "score": score.value,
            "reason": score.reason,
            "repositories_found": len(repositories),
        })

        print(f"    ✓ Score: {score.value:.2f}")
        print(f"    ✓ Reason: {score.reason[:100]}...")

    # Summary
    avg_score = sum(r["score"] for r in results) / len(results)
    print(f"\n  📈 Average Match Quality Score: {avg_score:.2f}")

    return results


async def evaluate_issue_difficulty():
    """Evaluate Issue Matcher's difficulty calibration accuracy"""
    print("\n📊 Evaluating Issue Difficulty Calibration...")

    issue_matcher = IssueMatcherAgent()
    metric = IssueDifficultyCalibrationMetric()

    # Test on a known repository
    test_repo = "microsoft/vscode"  # Well-known repo with diverse issues
    profile = TEST_PROFILES[1]  # Intermediate user

    print(f"\n  Analyzing issues from {test_repo}...")

    try:
        issues = await issue_matcher.find_suitable_issues(profile, test_repo)

        results = []
        for issue in issues[:3]:  # Evaluate first 3
            issue_data = {
                "title": issue.title,
                "description": issue.description,
                "labels": issue.labels,
            }

            score = metric.score(
                issue_data=issue_data,
                predicted_difficulty=issue.difficulty_rating
            )

            results.append({
                "issue_number": issue.issue_number,
                "predicted_difficulty": issue.difficulty_rating,
                "calibration_score": score.value,
                "reason": score.reason,
            })

            print(f"    Issue #{issue.issue_number}: {score.value:.2f}")

        avg_calibration = sum(r["calibration_score"] for r in results) / len(results)
        print(f"\n  📈 Average Calibration Accuracy: {avg_calibration:.2f}")

        return results

    except Exception as e:
        print(f"    ⚠️  Error: {str(e)}")
        print(f"    Note: This test requires GitHub API access and may fail if rate limited")
        return []


async def evaluate_mentoring_helpfulness():
    """Evaluate Mentoring Agent's plan quality"""
    print("\n📊 Evaluating Mentoring Plan Helpfulness...")

    mentoring_agent = MentoringAgent()
    metric = MentoringHelpfulnessMetric()

    # Use a simple, well-documented repo for testing
    test_repo = "firstcontributions/first-contributions"
    test_issue_number = 1  # Typically a good first issue

    profile = TEST_PROFILES[0]  # Beginner user

    print(f"\n  Creating mentoring plan for {test_repo}...")

    try:
        plan = await mentoring_agent.create_mentoring_plan(
            profile,
            test_repo,
            test_issue_number
        )

        plan_data = {
            "step_by_step_plan": plan.step_by_step_plan,
            "key_files_to_examine": plan.key_files_to_examine,
            "suggested_approach": plan.suggested_approach,
        }

        score = metric.score(
            mentoring_plan=plan_data,
            user_skill_level=profile.skill_level
        )

        print(f"    ✓ Helpfulness Score: {score.value:.2f}")
        print(f"    ✓ Reason: {score.reason[:100]}...")

        return {
            "score": score.value,
            "reason": score.reason,
            "plan_steps": len(plan.step_by_step_plan),
        }

    except Exception as e:
        print(f"    ⚠️  Error: {str(e)}")
        return None


async def run_full_evaluation():
    """Run all evaluations and generate a comprehensive report"""
    print("=" * 60)
    print("CodePathfinder Agent Evaluation Suite")
    print("=" * 60)

    # Initialize Opik client
    opik_client = Opik(
        api_key=os.getenv("OPIK_API_KEY"),
        project_name="codepathfinder-evaluation"
    )

    print("\n🚀 Starting evaluation pipeline...")

    # Run evaluations
    scout_results = await evaluate_repository_scout()
    issue_results = await evaluate_issue_difficulty()
    mentoring_result = await evaluate_mentoring_helpfulness()

    # Generate summary report
    print("\n" + "=" * 60)
    print("EVALUATION SUMMARY")
    print("=" * 60)

    print("\n📋 Repository Scout Agent:")
    if scout_results:
        avg_score = sum(r["score"] for r in scout_results) / len(scout_results)
        print(f"  • Average Match Quality: {avg_score:.2f}/1.0")
        print(f"  • Profiles Tested: {len(scout_results)}")

    print("\n📋 Issue Matcher Agent:")
    if issue_results:
        avg_calibration = sum(r["calibration_score"] for r in issue_results) / len(issue_results)
        print(f"  • Average Calibration Accuracy: {avg_calibration:.2f}/1.0")
        print(f"  • Issues Evaluated: {len(issue_results)}")
    else:
        print("  • Not evaluated (requires GitHub access)")

    print("\n📋 Mentoring Agent:")
    if mentoring_result:
        print(f"  • Helpfulness Score: {mentoring_result['score']:.2f}/1.0")
        print(f"  • Plan Steps Generated: {mentoring_result['plan_steps']}")
    else:
        print("  • Not evaluated (requires GitHub access)")

    print("\n" + "=" * 60)
    print("✅ Evaluation Complete!")
    print("=" * 60)
    print(f"\nView detailed results in your Opik dashboard:")
    print(f"https://www.comet.com/opik")


if __name__ == "__main__":
    # Check for required API keys
    if not os.getenv("GOOGLE_API_KEY"):
        print("❌ Error: GOOGLE_API_KEY not found in environment")
        print("Please set it in your .env file")
        exit(1)

    if not os.getenv("GITHUB_TOKEN"):
        print("⚠️  Warning: GITHUB_TOKEN not found")
        print("Some evaluations may fail without GitHub API access")

    if not os.getenv("OPIK_API_KEY"):
        print("⚠️  Warning: OPIK_API_KEY not found")
        print("Results will not be tracked in Opik dashboard")

    # Run evaluation
    asyncio.run(run_full_evaluation())
