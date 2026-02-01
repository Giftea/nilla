import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRepoIssues, GitHubAPIError } from "@/lib/github/api";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const owner = request.nextUrl.searchParams.get("owner");
  const repo = request.nextUrl.searchParams.get("repo");
  const labels = request.nextUrl.searchParams.get("labels");
  const page = request.nextUrl.searchParams.get("page") || "1";

  if (!owner || !repo) {
    return NextResponse.json(
      { error: "Owner and repo parameters required" },
      { status: 400 }
    );
  }

  try {
    const issues = await getRepoIssues(owner, repo, {
      labels: labels || undefined,
      page: parseInt(page),
      perPage: 30,
    });

    // Filter out pull requests (GitHub API returns PRs as issues)
    const filteredIssues = issues.filter(
      (issue) => !("pull_request" in issue)
    );

    return NextResponse.json(filteredIssues);
  } catch (error) {
    if (error instanceof GitHubAPIError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    throw error;
  }
}
