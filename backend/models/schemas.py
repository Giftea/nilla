from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class SkillLevel(str, Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class UserProfile(BaseModel):
    id: Optional[int] = None
    skill_level: SkillLevel
    programming_languages: List[str] = Field(description="List of programming languages")
    interests: List[str] = Field(description="Areas of interest (e.g., web-dev, ML, DevOps)")
    time_commitment: str = Field(description="Hours per week available")
    github_username: Optional[str] = None
    created_at: Optional[datetime] = None


class RepositoryMatch(BaseModel):
    repo_name: str
    repo_url: str
    description: str
    stars: int
    language: str
    match_score: float = Field(ge=0, le=1)
    match_reasoning: str
    difficulty_level: SkillLevel
    community_friendliness_score: float = Field(ge=0, le=1)
    good_first_issues_count: int
    recent_activity: bool


class Issue(BaseModel):
    issue_number: int
    title: str
    url: str
    labels: List[str]
    description: str
    difficulty_rating: SkillLevel
    estimated_complexity: str
    approach_suggestions: str
    created_at: datetime
    comments_count: int


class ContributionGuide(BaseModel):
    repo_name: str
    setup_instructions: str
    project_structure: str
    coding_conventions: str
    testing_guide: str
    contribution_workflow: str
    helpful_resources: List[str]


class MentoringPlan(BaseModel):
    issue_number: int
    repo_name: str
    step_by_step_plan: List[str]
    key_files_to_examine: List[str]
    suggested_approach: str
    git_commands: List[str]
    testing_strategy: str
    potential_challenges: List[str]


class ContributionOutcome(BaseModel):
    id: Optional[int] = None
    user_id: int
    repo_name: str
    issue_number: int
    pr_url: Optional[str] = None
    status: str  # "in_progress", "merged", "closed", "abandoned"
    started_at: datetime
    completed_at: Optional[datetime] = None
    user_feedback: Optional[str] = None


class ScoutRequest(BaseModel):
    user_profile: UserProfile


class ScoutResponse(BaseModel):
    repositories: List[RepositoryMatch]
    reasoning: str


class IssueMatchRequest(BaseModel):
    user_profile: UserProfile
    repo_name: str
    repo_url: str


class IssueMatchResponse(BaseModel):
    issues: List[Issue]
    reasoning: str


class PreparationRequest(BaseModel):
    repo_name: str
    repo_url: str
    user_profile: UserProfile


class MentoringRequest(BaseModel):
    repo_name: str
    repo_url: str
    issue_number: int
    user_profile: UserProfile


class ProgressUpdate(BaseModel):
    user_id: int
    contribution_outcome: ContributionOutcome


class AgentState(BaseModel):
    """State shared between agents in LangGraph workflow"""
    user_profile: Optional[UserProfile] = None
    repositories: List[RepositoryMatch] = []
    selected_repo: Optional[str] = None
    selected_repo_url: Optional[str] = None
    issues: List[Issue] = []
    selected_issue: Optional[int] = None
    contribution_guide: Optional[ContributionGuide] = None
    mentoring_plan: Optional[MentoringPlan] = None
    messages: List[str] = []
    current_step: str = "onboarding"

    class Config:
        arbitrary_types_allowed = True
