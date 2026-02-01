import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { Sidebar } from "@/components/layout/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  const { data: userStats } = await supabase
    .from("user_stats")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return (
    <div className="min-h-screen bg-background">
      <Navbar
        user={{
          id: user.id,
          email: user.email || "",
          avatarUrl: profile?.github_avatar_url || "",
          username: profile?.github_username || "",
          displayName: profile?.display_name || profile?.github_username || "",
        }}
        stats={userStats}
      />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
