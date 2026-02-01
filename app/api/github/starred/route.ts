import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUserStarredRepos, GitHubAPIError } from "@/lib/github/api";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const page = parseInt(request.nextUrl.searchParams.get("page") || "1");
  const perPage = parseInt(request.nextUrl.searchParams.get("per_page") || "30");

  try {
    const repos = await getUserStarredRepos(page, perPage);
    return NextResponse.json(repos);
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
