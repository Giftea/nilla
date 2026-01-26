from typing import TypedDict, Annotated, Sequence
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolExecutor
import operator
from typing import List, Optional

from agents import (
    RepositoryScoutAgent,
    IssueMatcherAgent,
    MentoringAgent,
    PreparationAgent,
    ProgressTrackerAgent
)
from models.schemas import (
    UserProfile,
    RepositoryMatch,
    Issue,
    ContributionGuide,
    MentoringPlan
)


class AgentWorkflowState(TypedDict):
    """State maintained throughout the agent workflow"""
    user_profile: Optional[UserProfile]
    repositories: List[RepositoryMatch]
    selected_repo_name: Optional[str]
    selected_repo_url: Optional[str]
    issues: List[Issue]
    selected_issue_number: Optional[int]
    contribution_guide: Optional[ContributionGuide]
    mentoring_plan: Optional[MentoringPlan]
    messages: Annotated[Sequence[str], operator.add]
    current_step: str
    error: Optional[str]


class CodePathfinderWorkflow:
    """
    LangGraph workflow orchestrating all agents.
    Manages the flow from onboarding to contribution.
    """

    def __init__(self):
        self.scout_agent = RepositoryScoutAgent()
        self.issue_matcher = IssueMatcherAgent()
        self.mentoring_agent = MentoringAgent()
        self.preparation_agent = PreparationAgent()
        self.tracker_agent = ProgressTrackerAgent()

        # Build the workflow graph
        self.workflow = self._build_workflow()

    def _build_workflow(self) -> StateGraph:
        """Build the LangGraph workflow"""
        workflow = StateGraph(AgentWorkflowState)

        # Define nodes (agent actions)
        workflow.add_node("scout_repositories", self.scout_repositories_node)
        workflow.add_node("prepare_onboarding", self.prepare_onboarding_node)
        workflow.add_node("match_issues", self.match_issues_node)
        workflow.add_node("create_mentoring_plan", self.create_mentoring_plan_node)

        # Define edges (workflow flow)
        workflow.set_entry_point("scout_repositories")

        workflow.add_edge("scout_repositories", "prepare_onboarding")
        workflow.add_edge("prepare_onboarding", "match_issues")
        workflow.add_edge("match_issues", "create_mentoring_plan")
        workflow.add_edge("create_mentoring_plan", END)

        return workflow.compile()

    async def scout_repositories_node(self, state: AgentWorkflowState) -> AgentWorkflowState:
        """Node: Scout for suitable repositories"""
        try:
            repositories = await self.scout_agent.find_repositories(state["user_profile"])

            return {
                **state,
                "repositories": repositories,
                "messages": state.get("messages", []) + [f"Found {len(repositories)} suitable repositories"],
                "current_step": "repositories_found"
            }
        except Exception as e:
            return {
                **state,
                "error": f"Error scouting repositories: {str(e)}",
                "messages": state.get("messages", []) + [f"Error: {str(e)}"]
            }

    async def prepare_onboarding_node(self, state: AgentWorkflowState) -> AgentWorkflowState:
        """Node: Prepare onboarding guide for selected repository"""
        try:
            # Use first repository if none selected
            if not state.get("selected_repo_name") and state.get("repositories"):
                state["selected_repo_name"] = state["repositories"][0].repo_name
                state["selected_repo_url"] = state["repositories"][0].repo_url

            guide = await self.preparation_agent.prepare_onboarding_guide(
                state["user_profile"],
                state["selected_repo_name"]
            )

            return {
                **state,
                "contribution_guide": guide,
                "messages": state.get("messages", []) + ["Prepared onboarding guide"],
                "current_step": "guide_prepared"
            }
        except Exception as e:
            return {
                **state,
                "error": f"Error preparing guide: {str(e)}",
                "messages": state.get("messages", []) + [f"Error: {str(e)}"]
            }

    async def match_issues_node(self, state: AgentWorkflowState) -> AgentWorkflowState:
        """Node: Find and match suitable issues"""
        try:
            issues = await self.issue_matcher.find_suitable_issues(
                state["user_profile"],
                state["selected_repo_name"]
            )

            return {
                **state,
                "issues": issues,
                "messages": state.get("messages", []) + [f"Found {len(issues)} suitable issues"],
                "current_step": "issues_matched"
            }
        except Exception as e:
            return {
                **state,
                "error": f"Error matching issues: {str(e)}",
                "messages": state.get("messages", []) + [f"Error: {str(e)}"]
            }

    async def create_mentoring_plan_node(self, state: AgentWorkflowState) -> AgentWorkflowState:
        """Node: Create mentoring plan for selected issue"""
        try:
            # Use first issue if none selected
            if not state.get("selected_issue_number") and state.get("issues"):
                state["selected_issue_number"] = state["issues"][0].issue_number

            plan = await self.mentoring_agent.create_mentoring_plan(
                state["user_profile"],
                state["selected_repo_name"],
                state["selected_issue_number"]
            )

            return {
                **state,
                "mentoring_plan": plan,
                "messages": state.get("messages", []) + ["Created mentoring plan"],
                "current_step": "plan_created"
            }
        except Exception as e:
            return {
                **state,
                "error": f"Error creating plan: {str(e)}",
                "messages": state.get("messages", []) + [f"Error: {str(e)}"]
            }

    async def run_full_workflow(self, user_profile: UserProfile) -> AgentWorkflowState:
        """
        Run the complete workflow from user profile to mentoring plan.
        """
        initial_state: AgentWorkflowState = {
            "user_profile": user_profile,
            "repositories": [],
            "selected_repo_name": None,
            "selected_repo_url": None,
            "issues": [],
            "selected_issue_number": None,
            "contribution_guide": None,
            "mentoring_plan": None,
            "messages": ["Starting CodePathfinder workflow"],
            "current_step": "initializing",
            "error": None
        }

        # Run the workflow
        final_state = await self.workflow.ainvoke(initial_state)

        return final_state

    async def run_partial_workflow(
        self,
        start_node: str,
        state: AgentWorkflowState
    ) -> AgentWorkflowState:
        """
        Run workflow from a specific node (for incremental updates).
        """
        # Create a custom workflow starting from the specified node
        workflow = StateGraph(AgentWorkflowState)

        if start_node == "prepare_onboarding":
            workflow.add_node("prepare_onboarding", self.prepare_onboarding_node)
            workflow.add_node("match_issues", self.match_issues_node)
            workflow.add_node("create_mentoring_plan", self.create_mentoring_plan_node)
            workflow.set_entry_point("prepare_onboarding")
            workflow.add_edge("prepare_onboarding", "match_issues")
            workflow.add_edge("match_issues", "create_mentoring_plan")
            workflow.add_edge("create_mentoring_plan", END)

        elif start_node == "match_issues":
            workflow.add_node("match_issues", self.match_issues_node)
            workflow.add_node("create_mentoring_plan", self.create_mentoring_plan_node)
            workflow.set_entry_point("match_issues")
            workflow.add_edge("match_issues", "create_mentoring_plan")
            workflow.add_edge("create_mentoring_plan", END)

        elif start_node == "create_mentoring_plan":
            workflow.add_node("create_mentoring_plan", self.create_mentoring_plan_node)
            workflow.set_entry_point("create_mentoring_plan")
            workflow.add_edge("create_mentoring_plan", END)

        compiled_workflow = workflow.compile()
        final_state = await compiled_workflow.ainvoke(state)

        return final_state
