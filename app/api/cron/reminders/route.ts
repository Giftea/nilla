import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendReminderEmail } from "@/lib/email/resend";
import { differenceInDays } from "date-fns";

// This endpoint should be called by a Vercel Cron Job daily
// Add to vercel.json: { "crons": [{ "path": "/api/cron/reminders", "schedule": "0 9 * * *" }] }

export async function GET(request: NextRequest) {
  // Verify cron secret (optional but recommended)
  const authHeader = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    authHeader !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();

    // Fetch active commitments that need reminders
    const { data: commitments, error } = await supabase
      .from("commitments")
      .select(`
        *,
        profiles:user_id (
          github_username,
          display_name
        )
      `)
      .eq("status", "active");

    if (error) {
      throw error;
    }

    const results = {
      processed: 0,
      day3Sent: 0,
      day6Sent: 0,
      errors: 0,
    };

    for (const commitment of commitments || []) {
      const deadline = new Date(commitment.deadline_at);
      const daysRemaining = differenceInDays(deadline, new Date());
      const daysSinceCommit = differenceInDays(
        new Date(),
        new Date(commitment.committed_at)
      );

      results.processed++;

      try {
        // Day 3 reminder (3 days after commitment)
        if (daysSinceCommit >= 3 && !commitment.reminder_day3_sent) {
          // Get user email from auth.users (requires admin client)
          const { data: authUser } = await supabase.auth.admin.getUserById(
            commitment.user_id
          );

          if (authUser?.user?.email) {
            await sendReminderEmail({
              to: authUser.user.email,
              userName:
                commitment.profiles?.display_name ||
                commitment.profiles?.github_username ||
                "there",
              issueTitle: commitment.issue_title,
              repoName: commitment.github_repo_full_name,
              issueUrl: commitment.issue_url,
              daysRemaining,
              reminderType: "day3",
            });

            // Mark reminder as sent
            await supabase
              .from("commitments")
              .update({ reminder_day3_sent: true })
              .eq("id", commitment.id);

            results.day3Sent++;
          }
        }

        // Day 6 reminder (1 day before deadline)
        if (daysRemaining <= 1 && daysRemaining >= 0 && !commitment.reminder_day6_sent) {
          const { data: authUser } = await supabase.auth.admin.getUserById(
            commitment.user_id
          );

          if (authUser?.user?.email) {
            await sendReminderEmail({
              to: authUser.user.email,
              userName:
                commitment.profiles?.display_name ||
                commitment.profiles?.github_username ||
                "there",
              issueTitle: commitment.issue_title,
              repoName: commitment.github_repo_full_name,
              issueUrl: commitment.issue_url,
              daysRemaining,
              reminderType: "day6",
            });

            await supabase
              .from("commitments")
              .update({ reminder_day6_sent: true })
              .eq("id", commitment.id);

            results.day6Sent++;
          }
        }

        // Mark expired commitments
        if (daysRemaining < 0) {
          await supabase
            .from("commitments")
            .update({ status: "expired" })
            .eq("id", commitment.id);
        }
      } catch (emailError) {
        console.error(
          `Failed to process commitment ${commitment.id}:`,
          emailError
        );
        results.errors++;
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error("Cron job failed:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
