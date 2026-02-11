import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRepo, parseGitHubUrl, GitHubAPIError } from "@/lib/github/api";
import { fetchAndIngestRepoDocs } from "@/lib/rag/fetch-repo-docs";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = request.nextUrl.searchParams.get("url");
  if (!url) {
    return NextResponse.json(
      { error: "URL parameter required" },
      { status: 400 }
    );
  }

  const parsed = parseGitHubUrl(url);
  if (!parsed) {
    return NextResponse.json(
      { error: "Invalid GitHub URL format" },
      { status: 400 }
    );
  }

  try {
    const repo = await getRepo(parsed.owner, parsed.repo);
    return NextResponse.json(repo);
  } catch (error) {
    if (error instanceof GitHubAPIError) {
      if (error.status === 404) {
        return NextResponse.json(
          { error: "Repository not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    throw error;
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { url, addedVia } = body;

  if (!url) {
    return NextResponse.json(
      { error: "URL is required" },
      { status: 400 }
    );
  }

  const parsed = parseGitHubUrl(url);
  if (!parsed) {
    return NextResponse.json(
      { error: "Invalid GitHub URL format" },
      { status: 400 }
    );
  }

  try {
    // Fetch repo details from GitHub
    const repo = await getRepo(parsed.owner, parsed.repo);

    // Check if already tracking
    const { data: existing } = await supabase
      .from("tracked_repos")
      .select("id")
      .eq("user_id", user.id)
      .eq("github_repo_id", repo.id)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: "Repository already tracked" },
        { status: 409 }
      );
    }

    // Add to tracked repos
    const { data: trackedRepo, error } = await supabase
      .from("tracked_repos")
      .insert({
        user_id: user.id,
        github_repo_id: repo.id,
        owner: repo.owner.login,
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description,
        html_url: repo.html_url,
        language: repo.language,
        stars_count: repo.stargazers_count,
        forks_count: repo.forks_count,
        open_issues_count: repo.open_issues_count,
        topics: repo.topics,
        is_archived: repo.archived,
        added_via: addedVia || "url",
      })
      .select()
      .single();

    if (error) {
      console.error("Failed to add repo:", error);
      return NextResponse.json(
        { error: "Failed to add repository" },
        { status: 500 }
      );
    }

    // Fire-and-forget: fetch repo docs and ingest embeddings for RAG.
    fetchAndIngestRepoDocs(
      trackedRepo.id,
      parsed.owner,
      parsed.repo,
      repo.full_name
    ).catch((err) =>
      console.error(`[RAG] Background ingestion failed for ${repo.full_name}:`, err)
    );

    return NextResponse.json(trackedRepo, { status: 201 });
  } catch (error) {
    if (error instanceof GitHubAPIError) {
      if (error.status === 404) {
        return NextResponse.json(
          { error: "Repository not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }
    console.error("Unhandled error in POST /api/github/repos:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
