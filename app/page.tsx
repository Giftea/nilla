import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import {
  GitBranch,
  Search,
  Target,
  TrendingUp,
  Award,
  CheckCircle2,
  Clock,
  Flame,
  Heart,
  Users,
  ArrowRight,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react";

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthenticated = !!user;

  return (
    <div className="flex min-h-screen flex-col bg-background overflow-hidden">
      {/* Animated background gradient */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-cyan-500/5" />
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/25 transition-transform group-hover:scale-110">
              <GitBranch className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
              Nilla
            </span>
          </Link>
          <Link href={isAuthenticated ? "/dashboard" : "/login"}>
            <Button className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-lg shadow-violet-500/25 transition-all hover:shadow-xl hover:shadow-violet-500/30">
              {isAuthenticated ? "Dashboard" : "Sign in with GitHub"}
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-20 md:py-32 relative">
          {/* Floating elements */}
          <div className="absolute top-20 left-10 animate-float opacity-20">
            <Sparkles className="h-8 w-8 text-violet-500" />
          </div>
          <div className="absolute top-40 right-20 animate-float-delayed opacity-20">
            <Zap className="h-6 w-6 text-cyan-500" />
          </div>
          <div className="absolute bottom-20 left-1/4 animate-float opacity-20">
            <Target className="h-10 w-10 text-indigo-500" />
          </div>

          <div className="mx-auto max-w-4xl text-center relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-4 py-1.5 text-sm text-violet-600 dark:text-violet-400 mb-6 animate-fade-in">
              <Sparkles className="h-4 w-4" />
              Your open-source consistency coach
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-7xl animate-fade-in-up">
              From wanting to contribute
              <br />
              <span className="bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-600 bg-clip-text text-transparent">
                to actually shipping PRs
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground animate-fade-in-up delay-100">
              Find beginner-friendly issues, commit to one at a time, and build
              momentum with small wins. No more abandoned PRs.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center animate-fade-in-up delay-200">
              <Link href={isAuthenticated ? "/dashboard" : "/login"}>
                <Button
                  size="lg"
                  className="gap-2 text-base bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 shadow-xl shadow-violet-500/30 transition-all hover:shadow-2xl hover:shadow-violet-500/40 hover:scale-105"
                >
                  <GitHubIcon className="h-5 w-5" />
                  {isAuthenticated
                    ? "Go to Dashboard"
                    : "Get started with GitHub"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <p className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground animate-fade-in-up delay-300">
              <Shield className="h-4 w-4 text-green-500" />
              Read-only GitHub access. We never modify your repositories.
            </p>
          </div>
        </section>

        {/* Problem Recognition */}
        <section className="relative py-24 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-violet-500/5 via-transparent to-transparent" />
          <div className="container mx-auto px-4 relative">
            <div className="mx-auto max-w-3xl">
              <h2 className="text-center text-2xl font-semibold md:text-4xl">
                Sound{" "}
                <span className="bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                  familiar?
                </span>
              </h2>
              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                <PainPoint
                  text="Starring repos with good intentions, but never contributing"
                  delay="0"
                />
                <PainPoint
                  text="Opening an issue, feeling overwhelmed, and closing the tab"
                  delay="100"
                />
                <PainPoint
                  text="Starting work on an issue, then losing momentum"
                  delay="200"
                />
                <PainPoint
                  text="Not knowing if an issue is actually beginner-friendly"
                  delay="300"
                />
                <PainPoint
                  text="Wanting to contribute but not knowing where to start"
                  delay="400"
                  className="sm:col-span-2 sm:max-w-md sm:mx-auto"
                />
              </div>
              <p className="mt-12 text-center text-lg text-muted-foreground">
                GitHub shows activity.{" "}
                <span className="font-semibold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                  Nilla helps you follow through.
                </span>
              </p>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section className="py-24 relative">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-5xl">
              <div className="text-center">
                <h2 className="text-2xl font-semibold md:text-4xl">
                  How it{" "}
                  <span className="bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent">
                    works
                  </span>
                </h2>
                <p className="mt-4 text-muted-foreground">
                  Five simple steps to your next contribution
                </p>
              </div>
              <div className="mt-16 relative">
                {/* Connection line */}
                <div className="hidden md:block absolute top-12 left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-violet-500/50 via-indigo-500/50 to-cyan-500/50" />
                <div className="grid gap-8 md:grid-cols-5">
                  <Step
                    number={1}
                    icon={<GitHubIcon className="h-5 w-5" />}
                    title="Sign in"
                    description="Connect with GitHub"
                    color="from-violet-500 to-violet-600"
                  />
                  <Step
                    number={2}
                    icon={<GitBranch className="h-5 w-5" />}
                    title="Track repos"
                    description="Add repos you care about"
                    color="from-indigo-500 to-indigo-600"
                  />
                  <Step
                    number={3}
                    icon={<Search className="h-5 w-5" />}
                    title="Discover"
                    description="Find beginner-friendly issues"
                    color="from-blue-500 to-blue-600"
                  />
                  <Step
                    number={4}
                    icon={<Target className="h-5 w-5" />}
                    title="Commit"
                    description="Focus on one issue"
                    color="from-cyan-500 to-cyan-600"
                  />
                  <Step
                    number={5}
                    icon={<TrendingUp className="h-5 w-5" />}
                    title="Track"
                    description="Build your streak"
                    color="from-teal-500 to-teal-600"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Key Features */}
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-indigo-500/5 to-transparent" />
          <div className="container mx-auto px-4 relative">
            <div className="mx-auto max-w-5xl">
              <div className="text-center">
                <h2 className="text-2xl font-semibold md:text-4xl">
                  Built for your{" "}
                  <span className="bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
                    success
                  </span>
                </h2>
                <p className="mt-4 text-muted-foreground">
                  Tools designed to keep you moving forward
                </p>
              </div>
              <div className="mt-12 grid gap-6 sm:grid-cols-2">
                <FeatureCard
                  icon={<Search className="h-6 w-6" />}
                  title="Smart issue discovery"
                  description="Issues are scored by difficulty based on labels, comments, and activity. Find ones that match your experience level."
                  gradient="from-violet-500 to-indigo-500"
                />
                <FeatureCard
                  icon={<Clock className="h-6 w-6" />}
                  title="7-day commitment windows"
                  description="Each commitment has a deadline. Gentle accountability that keeps you focused without overwhelming you."
                  gradient="from-indigo-500 to-blue-500"
                />
                <FeatureCard
                  icon={<CheckCircle2 className="h-6 w-6" />}
                  title="Milestone-based progress"
                  description="Break down your work into small checkpoints: read the issue, ask questions, start coding, open PR."
                  gradient="from-blue-500 to-cyan-500"
                />
                <FeatureCard
                  icon={<Award className="h-6 w-6" />}
                  title="XP, levels, streaks & badges"
                  description="Earn rewards for showing up consistently. Watch your progress grow with every small win."
                  gradient="from-cyan-500 to-teal-500"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Gamification Reassurance */}
        <section className="py-24">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-2xl text-center">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 to-rose-500 shadow-xl shadow-pink-500/30">
                <Heart className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-2xl font-semibold md:text-4xl">
                Encouragement,{" "}
                <span className="bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent">
                  not competition
                </span>
              </h2>
              <p className="mt-6 text-lg text-muted-foreground">
                Our gamification is designed to motivate you, not stress you
                out. There are no leaderboards, no rankings, no pressure to
                compete with others.
              </p>
              <p className="mt-4 text-lg text-muted-foreground">
                Just you, your goals, and a system that celebrates{" "}
                <span className="font-semibold bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent">
                  progress over perfection
                </span>
                .
              </p>
            </div>
          </div>
        </section>

        {/* Who This Is For */}
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-500/5 to-transparent" />
          <div className="container mx-auto px-4 relative">
            <div className="mx-auto max-w-4xl">
              <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-xl shadow-blue-500/30">
                <Users className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-center text-2xl font-semibold md:text-4xl">
                Built for developers{" "}
                <span className="bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
                  like you
                </span>
              </h2>
              <div className="mt-12 grid gap-4 sm:grid-cols-2">
                <PersonaCard
                  title="First-time contributors"
                  description="Ready to make your first PR but unsure where to start"
                  emoji="🌱"
                />
                <PersonaCard
                  title="Consistency builders"
                  description="Want to make open source a regular habit, not a one-time thing"
                  emoji="🔥"
                />
                <PersonaCard
                  title="Bootcamp graduates"
                  description="Looking to build real-world experience on your portfolio"
                  emoji="🎓"
                />
                <PersonaCard
                  title="Busy developers"
                  description="Have limited time but want to contribute meaningfully"
                  emoji="⚡"
                />
              </div>
            </div>
          </div>
        </section>

        {/* What This Is Not */}
        <section className="py-24">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-semibold md:text-4xl">
                What Nilla is{" "}
                <span className="bg-gradient-to-r from-gray-500 to-gray-600 bg-clip-text text-transparent">
                  not
                </span>
              </h2>
              <div className="mt-10 space-y-4 text-left">
                <Clarification text="Not a GitHub replacement — we complement your workflow, not replace it" />
                <Clarification text="Not an issue tracker — use GitHub for that, we help you stay accountable" />
                <Clarification text="Not a productivity app that nags — we encourage, never guilt" />
              </div>
            </div>
          </div>
        </section>

        {/* Social Proof Placeholder */}
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-500/5 to-transparent" />
          <div className="container mx-auto px-4 relative">
            <div className="mx-auto max-w-2xl">
              <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/10 via-transparent to-indigo-500/10 p-8 md:p-12 text-center backdrop-blur-sm">
                <div className="text-5xl mb-6">&ldquo;</div>
                <blockquote className="text-xl md:text-2xl font-medium text-foreground/90">
                  I&apos;d been wanting to contribute to open source for months.
                  Nilla helped me actually do it. The commitment system kept me
                  accountable, and now I have 3 merged PRs.
                </blockquote>
                <div className="mt-8 flex items-center justify-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500" />
                  <div className="text-left">
                    <p className="font-semibold">A happy developer</p>
                    <p className="text-sm text-muted-foreground">
                      First-time contributor
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-violet-500/10 via-indigo-500/5 to-transparent" />
          <div className="container mx-auto px-4 relative">
            <div className="mx-auto max-w-2xl text-center">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-orange-500 to-red-500 shadow-2xl shadow-orange-500/30 animate-pulse">
                <Flame className="h-10 w-10 text-white" />
              </div>
              <h2 className="text-3xl font-bold md:text-5xl">
                Start your{" "}
                <span className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 bg-clip-text text-transparent">
                  open-source journey
                </span>
              </h2>
              <p className="mt-6 text-lg text-muted-foreground">
                You don&apos;t need to be an expert. You just need to start.
                <br />
                We&apos;ll help you take it from there.
              </p>
              <div className="mt-10">
                <Link href={isAuthenticated ? "/dashboard" : "/login"}>
                  <Button
                    size="lg"
                    className="gap-2 text-lg px-8 py-6 bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-600 hover:from-violet-700 hover:via-indigo-700 hover:to-cyan-700 shadow-2xl shadow-violet-500/30 transition-all hover:shadow-3xl hover:shadow-violet-500/40 hover:scale-105"
                  >
                    <GitHubIcon className="h-5 w-5" />
                    {isAuthenticated
                      ? "Go to Dashboard"
                      : "Sign in with GitHub"}
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
              </div>
              <p className="mt-6 text-sm text-muted-foreground">
                Free to use. No credit card required.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 bg-background/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p className="flex items-center justify-center gap-2">
            <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent font-semibold">
              Nilla
            </span>
            — Your consistency coach for open-source contributions.
          </p>
        </div>
      </footer>

    </div>
  );
}

function PainPoint({
  text,
  delay,
  className = "",
}: {
  text: string;
  delay: string;
  className?: string;
}) {
  return (
    <div
      className={`group flex items-start gap-3 rounded-xl border border-red-500/10 bg-gradient-to-br from-red-500/5 to-orange-500/5 p-4 transition-all hover:border-red-500/20 hover:shadow-lg hover:shadow-red-500/5 ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-gradient-to-r from-red-500 to-orange-500 group-hover:scale-125 transition-transform" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function Step({
  number,
  icon,
  title,
  description,
  color,
}: {
  number: number;
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}) {
  return (
    <div className="text-center group">
      <div
        className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${color} text-white shadow-lg transition-all group-hover:scale-110 group-hover:shadow-xl`}
      >
        {icon}
      </div>
      <div className="mt-4 inline-flex items-center justify-center h-6 w-6 rounded-full bg-muted text-xs font-bold">
        {number}
      </div>
      <h3 className="mt-2 font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  gradient,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  gradient: string;
}) {
  return (
    <div className="group rounded-2xl border bg-gradient-to-br from-background to-muted/30 p-6 transition-all hover:shadow-xl hover:shadow-violet-500/5 hover:border-violet-500/20">
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${gradient} text-white shadow-lg transition-transform group-hover:scale-110`}
      >
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function PersonaCard({
  title,
  description,
  emoji,
}: {
  title: string;
  description: string;
  emoji: string;
}) {
  return (
    <div className="group rounded-xl border bg-gradient-to-br from-background to-muted/30 p-5 transition-all hover:shadow-lg hover:shadow-blue-500/5 hover:border-blue-500/20">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{emoji}</span>
        <h3 className="font-semibold">{title}</h3>
      </div>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function Clarification({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-muted/50 p-4 transition-all hover:bg-muted/70">
      <div className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-muted-foreground/20 text-xs font-bold text-muted-foreground">
        ✕
      </div>
      <p className="text-muted-foreground">{text}</p>
    </div>
  );
}
