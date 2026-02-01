import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendReminderEmail({
  to,
  userName,
  issueTitle,
  repoName,
  issueUrl,
  daysRemaining,
  reminderType,
}: {
  to: string;
  userName: string;
  issueTitle: string;
  repoName: string;
  issueUrl: string;
  daysRemaining: number;
  reminderType: "day3" | "day6";
}) {
  const subject =
    reminderType === "day3"
      ? `Need help with "${issueTitle}"?`
      : `${daysRemaining} day${daysRemaining !== 1 ? "s" : ""} left for "${issueTitle}"`;

  const { data, error } = await resend.emails.send({
    from: "Nilla <noreply@nilla.app>",
    to: [to],
    subject,
    html: reminderType === "day3" ? getDay3Template({
      userName,
      issueTitle,
      repoName,
      issueUrl,
      daysRemaining,
    }) : getDay6Template({
      userName,
      issueTitle,
      repoName,
      issueUrl,
      daysRemaining,
    }),
  });

  if (error) {
    console.error("Failed to send reminder email:", error);
    throw error;
  }

  return data;
}

function getDay3Template({
  userName,
  issueTitle,
  repoName,
  issueUrl,
  daysRemaining,
}: {
  userName: string;
  issueTitle: string;
  repoName: string;
  issueUrl: string;
  daysRemaining: number;
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #22c55e; margin: 0;">🌱 Nilla</h1>
    <p style="color: #666; margin: 5px 0;">Your Open Source Companion</p>
  </div>

  <h2 style="color: #333;">Hey ${userName}! Need a hand?</h2>

  <p>You've been working on your commitment for a few days now. How's it going?</p>

  <div style="background: #f8f9fa; border-left: 4px solid #22c55e; padding: 15px; margin: 20px 0; border-radius: 4px;">
    <strong>${issueTitle}</strong><br>
    <span style="color: #666;">${repoName}</span><br>
    <span style="color: #888; font-size: 14px;">${daysRemaining} days remaining</span>
  </div>

  <p>If you're stuck, here are some tips:</p>
  <ul style="color: #555;">
    <li>Ask a question on the issue - maintainers are usually helpful!</li>
    <li>Look for similar issues or PRs for guidance</li>
    <li>Check the project's contributing guidelines</li>
    <li>Break the problem into smaller steps</li>
  </ul>

  <div style="text-align: center; margin: 30px 0;">
    <a href="${issueUrl}" style="display: inline-block; background: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">View Issue</a>
  </div>

  <p style="color: #666; font-size: 14px;">
    Remember: Progress beats perfection. Even a small step forward counts!
  </p>

  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

  <p style="color: #888; font-size: 12px; text-align: center;">
    You're receiving this because you committed to an issue on Nilla.<br>
    <a href="#" style="color: #22c55e;">Manage your notifications</a>
  </p>
</body>
</html>
  `;
}

function getDay6Template({
  userName,
  issueTitle,
  repoName,
  issueUrl,
  daysRemaining,
}: {
  userName: string;
  issueTitle: string;
  repoName: string;
  issueUrl: string;
  daysRemaining: number;
}) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #22c55e; margin: 0;">🌱 Nilla</h1>
    <p style="color: #666; margin: 5px 0;">Your Open Source Companion</p>
  </div>

  <h2 style="color: #333;">Final stretch, ${userName}!</h2>

  <p>Your commitment deadline is approaching. Time to wrap things up!</p>

  <div style="background: #fff7ed; border-left: 4px solid #f97316; padding: 15px; margin: 20px 0; border-radius: 4px;">
    <strong>${issueTitle}</strong><br>
    <span style="color: #666;">${repoName}</span><br>
    <span style="color: #f97316; font-size: 14px; font-weight: 500;">⏰ Only ${daysRemaining} day${daysRemaining !== 1 ? "s" : ""} left!</span>
  </div>

  <p>Here's what you can do:</p>
  <ul style="color: #555;">
    <li><strong>Ready to submit?</strong> Open that PR!</li>
    <li><strong>Need more time?</strong> That's okay - you can always recommit</li>
    <li><strong>Hit a wall?</strong> Consider switching to a different issue</li>
  </ul>

  <div style="text-align: center; margin: 30px 0;">
    <a href="${issueUrl}" style="display: inline-block; background: #22c55e; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">View Issue</a>
  </div>

  <p style="color: #666; font-size: 14px;">
    No pressure - open source is a marathon, not a sprint. 🏃‍♂️
  </p>

  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

  <p style="color: #888; font-size: 12px; text-align: center;">
    You're receiving this because you committed to an issue on Nilla.<br>
    <a href="#" style="color: #22c55e;">Manage your notifications</a>
  </p>
</body>
</html>
  `;
}
