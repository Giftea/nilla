from github import Github, Repository, Issue as GithubIssue
from typing import List, Dict, Any, Optional
import os
from datetime import datetime, timedelta
from dotenv import load_dotenv

load_dotenv()


class GitHubTools:
    def __init__(self):
        github_token = os.getenv("GITHUB_TOKEN")
        if not github_token:
            raise ValueError("GITHUB_TOKEN not found in environment variables")
        self.client = Github(github_token)

    async def search_repositories(
        self,
        languages: List[str],
        min_stars: int = 100,
        max_results: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Search for repositories based on programming languages and popularity.
        """
        repos_data = []

        # Build search query
        language_query = " OR ".join([f"language:{lang}" for lang in languages])
        query = f"({language_query}) stars:>{min_stars} good-first-issues:>3"

        try:
            repositories = self.client.search_repositories(query=query, sort="stars", order="desc")

            for repo in repositories[:max_results]:
                repos_data.append({
                    "name": repo.full_name,
                    "url": repo.html_url,
                    "description": repo.description or "",
                    "stars": repo.stargazers_count,
                    "language": repo.language,
                    "forks": repo.forks_count,
                    "open_issues": repo.open_issues_count,
                    "topics": repo.get_topics(),
                    "created_at": repo.created_at.isoformat(),
                    "updated_at": repo.updated_at.isoformat(),
                    "has_wiki": repo.has_wiki,
                    "has_contributing": self._check_contributing_file(repo),
                })
        except Exception as e:
            print(f"Error searching repositories: {e}")

        return repos_data

    def _check_contributing_file(self, repo: Repository.Repository) -> bool:
        """Check if repository has a CONTRIBUTING.md file"""
        try:
            repo.get_contents("CONTRIBUTING.md")
            return True
        except:
            try:
                repo.get_contents(".github/CONTRIBUTING.md")
                return True
            except:
                return False

    async def get_repository_info(self, repo_name: str) -> Dict[str, Any]:
        """Get detailed information about a specific repository"""
        try:
            repo = self.client.get_repo(repo_name)
            return {
                "name": repo.full_name,
                "url": repo.html_url,
                "description": repo.description or "",
                "stars": repo.stargazers_count,
                "language": repo.language,
                "forks": repo.forks_count,
                "open_issues": repo.open_issues_count,
                "topics": repo.get_topics(),
                "created_at": repo.created_at.isoformat(),
                "updated_at": repo.updated_at.isoformat(),
            }
        except Exception as e:
            print(f"Error getting repository info: {e}")
            return {}

    async def get_issues(
        self,
        repo_name: str,
        labels: Optional[List[str]] = None,
        max_results: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Fetch issues from a repository, optionally filtered by labels.
        """
        issues_data = []

        try:
            repo = self.client.get_repo(repo_name)

            # Default labels for beginner-friendly issues
            if labels is None:
                labels = ["good first issue", "help wanted", "beginner-friendly", "easy"]

            issues = repo.get_issues(state="open", labels=labels)

            for issue in issues[:max_results]:
                # Skip pull requests
                if issue.pull_request:
                    continue

                issues_data.append({
                    "number": issue.number,
                    "title": issue.title,
                    "url": issue.html_url,
                    "labels": [label.name for label in issue.labels],
                    "body": issue.body or "",
                    "created_at": issue.created_at.isoformat(),
                    "comments": issue.comments,
                    "assignee": issue.assignee.login if issue.assignee else None,
                    "state": issue.state,
                })
        except Exception as e:
            print(f"Error fetching issues: {e}")

        return issues_data

    async def analyze_maintainer_activity(self, repo_name: str) -> Dict[str, Any]:
        """
        Analyze maintainer responsiveness by looking at recent PR and issue activity.
        """
        try:
            repo = self.client.get_repo(repo_name)

            # Get recent closed PRs to check merge time
            recent_prs = repo.get_pulls(state="closed", sort="updated", direction="desc")

            merge_times = []
            for pr in list(recent_prs)[:10]:
                if pr.merged and pr.created_at and pr.merged_at:
                    merge_time = (pr.merged_at - pr.created_at).days
                    merge_times.append(merge_time)

            avg_merge_time = sum(merge_times) / len(merge_times) if merge_times else None

            # Check recent issue responses
            recent_issues = repo.get_issues(state="all", sort="updated", direction="desc")
            issues_with_responses = 0
            total_checked = 0

            for issue in list(recent_issues)[:10]:
                total_checked += 1
                if issue.comments > 0:
                    issues_with_responses += 1

            response_rate = issues_with_responses / total_checked if total_checked > 0 else 0

            return {
                "average_merge_time_days": avg_merge_time,
                "issue_response_rate": response_rate,
                "total_contributors": repo.get_contributors().totalCount,
                "recent_commit_activity": repo.get_commits().totalCount > 0,
            }
        except Exception as e:
            print(f"Error analyzing maintainer activity: {e}")
            return {
                "average_merge_time_days": None,
                "issue_response_rate": 0.0,
                "total_contributors": 0,
                "recent_commit_activity": False,
            }

    async def get_contributing_guide(self, repo_name: str) -> Optional[str]:
        """Fetch the CONTRIBUTING.md file if it exists"""
        try:
            repo = self.client.get_repo(repo_name)
            try:
                contributing = repo.get_contents("CONTRIBUTING.md")
                return contributing.decoded_content.decode("utf-8")
            except:
                contributing = repo.get_contents(".github/CONTRIBUTING.md")
                return contributing.decoded_content.decode("utf-8")
        except Exception as e:
            print(f"No CONTRIBUTING.md found: {e}")
            return None

    async def get_readme(self, repo_name: str) -> Optional[str]:
        """Fetch the README file"""
        try:
            repo = self.client.get_repo(repo_name)
            readme = repo.get_readme()
            return readme.decoded_content.decode("utf-8")
        except Exception as e:
            print(f"Error fetching README: {e}")
            return None

    async def analyze_pr_sentiment(self, repo_name: str) -> float:
        """
        Analyze sentiment of PR comments to gauge community friendliness.
        Returns a score between 0 and 1.
        """
        try:
            repo = self.client.get_repo(repo_name)
            recent_prs = repo.get_pulls(state="all", sort="updated", direction="desc")

            positive_keywords = ["thanks", "great", "awesome", "excellent", "welcome", "good", "nice"]
            negative_keywords = ["no", "wrong", "bad", "terrible", "reject", "close", "spam"]

            positive_count = 0
            negative_count = 0
            total_comments = 0

            for pr in list(recent_prs)[:5]:
                comments = pr.get_comments()
                for comment in list(comments)[:20]:
                    total_comments += 1
                    comment_body = comment.body.lower()

                    if any(keyword in comment_body for keyword in positive_keywords):
                        positive_count += 1
                    if any(keyword in comment_body for keyword in negative_keywords):
                        negative_count += 1

            if total_comments == 0:
                return 0.7  # Neutral score if no data

            # Calculate friendliness score
            friendliness = (positive_count - negative_count) / total_comments
            # Normalize to 0-1 range
            normalized_score = max(0, min(1, (friendliness + 1) / 2))

            return normalized_score
        except Exception as e:
            print(f"Error analyzing PR sentiment: {e}")
            return 0.7  # Default neutral score
