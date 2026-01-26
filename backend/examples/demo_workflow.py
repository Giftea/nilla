"""
Demo script showing the complete CodePathfinder workflow.

This demonstrates the full agent pipeline from profile creation to mentoring plan.
"""

import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

import sys
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from workflows.agent_workflow import CodePathfinderWorkflow
from models.schemas import UserProfile, SkillLevel


async def demo_workflow():
    """Run a complete demo of the CodePathfinder workflow"""

    print("=" * 70)
    print("CodePathfinder Demo - Complete Agent Workflow")
    print("=" * 70)

    # Create a sample user profile
    print("\n👤 Creating user profile...")
    user_profile = UserProfile(
        skill_level=SkillLevel.BEGINNER,
        programming_languages=["Python", "JavaScript"],
        interests=["web-dev", "CLI tools", "automation"],
        time_commitment="5-10 hours/week",
        github_username="demo_user"
    )

    print(f"   Skill Level: {user_profile.skill_level}")
    print(f"   Languages: {', '.join(user_profile.programming_languages)}")
    print(f"   Interests: {', '.join(user_profile.interests)}")

    # Initialize workflow
    print("\n🤖 Initializing agent workflow...")
    workflow = CodePathfinderWorkflow()

    # Run the complete workflow
    print("\n🚀 Running multi-agent workflow...")
    print("   This will:")
    print("   1. Scout for suitable repositories")
    print("   2. Prepare onboarding materials")
    print("   3. Match suitable issues")
    print("   4. Create mentoring plan")
    print("\n   Please wait, this may take 1-2 minutes...\n")

    try:
        final_state = await workflow.run_full_workflow(user_profile)

        # Display results
        print("\n" + "=" * 70)
        print("WORKFLOW RESULTS")
        print("=" * 70)

        if final_state.get("error"):
            print(f"\n❌ Error occurred: {final_state['error']}")
            return

        # Repositories
        repositories = final_state.get("repositories", [])
        print(f"\n📚 Found {len(repositories)} Recommended Repositories:")
        for i, repo in enumerate(repositories[:3], 1):
            print(f"\n{i}. {repo.repo_name}")
            print(f"   ⭐ Stars: {repo.stars:,}")
            print(f"   💻 Language: {repo.language}")
            print(f"   📊 Difficulty: {repo.difficulty_level}")
            print(f"   🎯 Match Score: {repo.match_score:.0%}")
            print(f"   💡 Why: {repo.match_reasoning[:100]}...")

        # Selected repository
        selected_repo = final_state.get("selected_repo_name")
        if selected_repo:
            print(f"\n✅ Selected Repository: {selected_repo}")

        # Contribution guide
        guide = final_state.get("contribution_guide")
        if guide:
            print(f"\n📖 Onboarding Guide Generated")
            print(f"   Setup: {guide.setup_instructions[:100]}...")

        # Issues
        issues = final_state.get("issues", [])
        print(f"\n🎯 Found {len(issues)} Suitable Issues:")
        for i, issue in enumerate(issues[:3], 1):
            print(f"\n{i}. #{issue.issue_number}: {issue.title}")
            print(f"   Difficulty: {issue.difficulty_rating}")
            print(f"   Complexity: {issue.estimated_complexity}")

        # Mentoring plan
        plan = final_state.get("mentoring_plan")
        if plan:
            print(f"\n🎓 Mentoring Plan Created")
            print(f"   Issue: #{plan.issue_number}")
            print(f"   Steps: {len(plan.step_by_step_plan)}")
            print(f"\n   First 3 steps:")
            for i, step in enumerate(plan.step_by_step_plan[:3], 1):
                print(f"   {i}. {step}")

        # Workflow messages
        print(f"\n📝 Workflow Log:")
        for msg in final_state.get("messages", []):
            print(f"   • {msg}")

        print("\n" + "=" * 70)
        print("✅ Workflow Complete!")
        print("=" * 70)

    except Exception as e:
        print(f"\n❌ Error running workflow: {str(e)}")
        import traceback
        traceback.print_exc()


async def demo_individual_agents():
    """Demo each agent individually"""

    print("\n" + "=" * 70)
    print("Individual Agent Demonstrations")
    print("=" * 70)

    from agents import (
        RepositoryScoutAgent,
        IssueMatcherAgent,
        PreparationAgent,
        MentoringAgent
    )

    user_profile = UserProfile(
        skill_level=SkillLevel.BEGINNER,
        programming_languages=["Python"],
        interests=["web-dev"],
        time_commitment="5-10 hours/week"
    )

    # Demo Repository Scout
    print("\n1️⃣  Repository Scout Agent")
    print("-" * 70)
    scout = RepositoryScoutAgent()
    try:
        repos = await scout.find_repositories(user_profile)
        print(f"   ✅ Found {len(repos)} repositories")
        if repos:
            print(f"   Top match: {repos[0].repo_name} ({repos[0].match_score:.0%} match)")
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")

    # Demo Issue Matcher
    print("\n2️⃣  Issue Matcher Agent")
    print("-" * 70)
    matcher = IssueMatcherAgent()
    try:
        # Use a well-known beginner-friendly repo
        test_repo = "firstcontributions/first-contributions"
        issues = await matcher.find_suitable_issues(user_profile, test_repo)
        print(f"   ✅ Found {len(issues)} suitable issues in {test_repo}")
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")

    # Demo Preparation Agent
    print("\n3️⃣  Preparation Agent")
    print("-" * 70)
    prep = PreparationAgent()
    try:
        test_repo = "firstcontributions/first-contributions"
        guide = await prep.prepare_onboarding_guide(user_profile, test_repo)
        print(f"   ✅ Generated onboarding guide for {test_repo}")
        print(f"   Sections: setup, structure, conventions, testing, workflow")
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")

    # Demo Mentoring Agent
    print("\n4️⃣  Mentoring Agent")
    print("-" * 70)
    mentor = MentoringAgent()
    try:
        test_repo = "firstcontributions/first-contributions"
        plan = await mentor.create_mentoring_plan(user_profile, test_repo, 1)
        print(f"   ✅ Created mentoring plan with {len(plan.step_by_step_plan)} steps")
    except Exception as e:
        print(f"   ❌ Error: {str(e)}")

    print("\n" + "=" * 70)


if __name__ == "__main__":
    # Check for API keys
    if not os.getenv("GOOGLE_API_KEY"):
        print("❌ Error: GOOGLE_API_KEY not found")
        exit(1)

    if not os.getenv("GITHUB_TOKEN"):
        print("❌ Error: GITHUB_TOKEN not found")
        exit(1)

    print("\nChoose demo mode:")
    print("1. Full workflow demo")
    print("2. Individual agent demos")
    print("3. Both")

    choice = input("\nEnter choice (1-3): ").strip()

    if choice == "1":
        asyncio.run(demo_workflow())
    elif choice == "2":
        asyncio.run(demo_individual_agents())
    elif choice == "3":
        asyncio.run(demo_individual_agents())
        asyncio.run(demo_workflow())
    else:
        print("Invalid choice")
