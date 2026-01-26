from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from db.database import get_db, UserProfileDB, ContributionOutcomeDB
from models.schemas import (
    UserProfile,
    ScoutRequest,
    ScoutResponse,
    IssueMatchRequest,
    IssueMatchResponse,
    PreparationRequest,
    ContributionGuide,
    MentoringRequest,
    MentoringPlan,
    ProgressUpdate,
    ContributionOutcome,
)
from agents import (
    RepositoryScoutAgent,
    IssueMatcherAgent,
    MentoringAgent,
    PreparationAgent,
    ProgressTrackerAgent,
)
from workflows.agent_workflow import CodePathfinderWorkflow

router = APIRouter()

# Initialize agents
scout_agent = RepositoryScoutAgent()
issue_matcher = IssueMatcherAgent()
mentoring_agent = MentoringAgent()
preparation_agent = PreparationAgent()
tracker_agent = ProgressTrackerAgent()
workflow = CodePathfinderWorkflow()


@router.post("/profile", response_model=UserProfile)
async def create_user_profile(
    profile: UserProfile,
    db: AsyncSession = Depends(get_db)
):
    """Create a new user profile"""
    db_profile = UserProfileDB(
        skill_level=profile.skill_level.value,
        programming_languages=profile.programming_languages,
        interests=profile.interests,
        time_commitment=profile.time_commitment,
        github_username=profile.github_username,
    )

    db.add(db_profile)
    await db.commit()
    await db.refresh(db_profile)

    profile.id = db_profile.id
    profile.created_at = db_profile.created_at

    return profile


@router.post("/scout", response_model=ScoutResponse)
async def scout_repositories(request: ScoutRequest):
    """
    Scout for suitable repositories based on user profile.
    This endpoint triggers the Repository Scout Agent.
    """
    try:
        repositories = await scout_agent.find_repositories(request.user_profile)

        return ScoutResponse(
            repositories=repositories,
            reasoning=f"Found {len(repositories)} repositories matching your profile. "
                     f"Sorted by relevance based on your skills, interests, and experience level."
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error scouting repositories: {str(e)}")


@router.post("/issues/match", response_model=IssueMatchResponse)
async def match_issues(request: IssueMatchRequest):
    """
    Find suitable issues in a repository for the user.
    This endpoint triggers the Issue Matcher Agent.
    """
    try:
        issues = await issue_matcher.find_suitable_issues(
            request.user_profile,
            request.repo_name
        )

        return IssueMatchResponse(
            issues=issues,
            reasoning=f"Found {len(issues)} issues suitable for your skill level. "
                     f"Issues are ranked by difficulty and your experience."
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error matching issues: {str(e)}")


@router.post("/preparation/guide", response_model=ContributionGuide)
async def get_preparation_guide(request: PreparationRequest):
    """
    Get a personalized onboarding guide for a repository.
    This endpoint triggers the Preparation Agent.
    """
    try:
        guide = await preparation_agent.prepare_onboarding_guide(
            request.user_profile,
            request.repo_name
        )

        return guide
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error preparing guide: {str(e)}")


@router.post("/mentoring/plan", response_model=MentoringPlan)
async def get_mentoring_plan(request: MentoringRequest):
    """
    Get a step-by-step mentoring plan for tackling an issue.
    This endpoint triggers the Mentoring Agent.
    """
    try:
        plan = await mentoring_agent.create_mentoring_plan(
            request.user_profile,
            request.repo_name,
            request.issue_number
        )

        return plan
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating mentoring plan: {str(e)}")


@router.post("/progress/track")
async def track_progress(
    update: ProgressUpdate,
    db: AsyncSession = Depends(get_db)
):
    """
    Track a contribution outcome and get insights.
    This endpoint triggers the Progress Tracker Agent.
    """
    try:
        # Save to database
        db_outcome = ContributionOutcomeDB(
            user_id=update.user_id,
            repo_name=update.contribution_outcome.repo_name,
            issue_number=update.contribution_outcome.issue_number,
            pr_url=update.contribution_outcome.pr_url,
            status=update.contribution_outcome.status,
            started_at=update.contribution_outcome.started_at,
            completed_at=update.contribution_outcome.completed_at,
            user_feedback=update.contribution_outcome.user_feedback,
        )

        db.add(db_outcome)
        await db.commit()

        # Get user profile
        from sqlalchemy import select
        result = await db.execute(select(UserProfileDB).where(UserProfileDB.id == update.user_id))
        db_profile = result.scalar_one_or_none()

        if not db_profile:
            raise HTTPException(status_code=404, detail="User profile not found")

        user_profile = UserProfile(
            id=db_profile.id,
            skill_level=db_profile.skill_level,
            programming_languages=db_profile.programming_languages,
            interests=db_profile.interests,
            time_commitment=db_profile.time_commitment,
            github_username=db_profile.github_username,
        )

        # Analyze outcome
        insights = await tracker_agent.analyze_contribution_outcome(
            user_profile,
            update.contribution_outcome
        )

        return {
            "message": "Progress tracked successfully",
            "insights": insights
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error tracking progress: {str(e)}")


@router.post("/workflow/full")
async def run_full_workflow(profile: UserProfile):
    """
    Run the complete agent workflow from profile to mentoring plan.
    This demonstrates the full LangGraph workflow orchestration.
    """
    try:
        final_state = await workflow.run_full_workflow(profile)

        return {
            "status": "completed" if not final_state.get("error") else "error",
            "error": final_state.get("error"),
            "repositories": [r.dict() for r in final_state.get("repositories", [])],
            "selected_repo": final_state.get("selected_repo_name"),
            "issues": [i.dict() for i in final_state.get("issues", [])],
            "contribution_guide": final_state.get("contribution_guide").dict() if final_state.get("contribution_guide") else None,
            "mentoring_plan": final_state.get("mentoring_plan").dict() if final_state.get("mentoring_plan") else None,
            "messages": final_state.get("messages", []),
            "current_step": final_state.get("current_step"),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error running workflow: {str(e)}")


@router.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "CodePathfinder API"}
