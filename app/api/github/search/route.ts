import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchRepos, GitHubAPIError } from "@/lib/github/api";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const query = request.nextUrl.searchParams.get("q");
  if (!query) {
    return NextResponse.json(
      { error: "Query parameter required" },
      { status: 400 }
    );
  }

  const page = parseInt(request.nextUrl.searchParams.get("page") || "1");

  try {
    const results = await searchRepos(query, page);
    return NextResponse.json(results);
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
