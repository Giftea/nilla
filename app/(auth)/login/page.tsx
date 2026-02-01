"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Github, Sparkles, Target, Users, Zap } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function LoginContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");

  const handleGitHubLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/callback`,
        scopes: "read:user user:email repo",
      },
    });
  };

  return (
    <div className="flex min-h-screen">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-violet-600 via-indigo-600 to-cyan-500 p-12 flex-col justify-between relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-white/10 to-transparent rounded-full blur-3xl" />
          <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-white/10 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-white/5 rounded-full blur-2xl animate-pulse" />
        </div>

        <div className="relative z-10">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm text-white shadow-lg">
              <span className="text-2xl">🌱</span>
            </div>
            <span className="text-3xl font-bold text-white">Nilla</span>
          </Link>
        </div>

        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-4">
              Start your open source journey today
            </h1>
            <p className="text-xl text-white/80">
              Find beginner-friendly issues, track your commitments, and grow as a developer.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-4 text-white/90">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                <Target className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Discover Issues</p>
                <p className="text-sm text-white/70">Find curated beginner-friendly issues</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-white/90">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Stay Accountable</p>
                <p className="text-sm text-white/70">Commit to issues and track your progress</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-white/90">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">Join the Community</p>
                <p className="text-sm text-white/70">Connect with fellow open source contributors</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10">
          <p className="text-white/60 text-sm">
            Trusted by developers starting their open source journey
          </p>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-8 bg-gradient-to-br from-background via-violet-500/5 to-indigo-500/5">
        {/* Mobile logo */}
        <Link href="/" className="lg:hidden mb-12 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 text-white shadow-lg shadow-violet-500/25">
            <span className="text-2xl">🌱</span>
          </div>
          <span className="text-3xl font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
            Nilla
          </span>
        </Link>

        <div className="w-full max-w-md space-y-8">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 text-violet-600 text-sm font-medium mb-4">
              <Sparkles className="h-4 w-4" />
              Free to use
            </div>
            <h2 className="text-3xl font-bold">Welcome back</h2>
            <p className="text-muted-foreground">
              Sign in to continue your open source journey
            </p>
          </div>

          {error && (
            <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-4 text-sm text-destructive">
              Authentication failed. Please try again.
            </div>
          )}

          <div className="space-y-4">
            <Button
              onClick={handleGitHubLogin}
              className="w-full gap-3 h-12 text-base bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 text-white border-0 shadow-lg shadow-violet-500/25 transition-all hover:shadow-xl hover:shadow-violet-500/30 hover:scale-[1.02]"
              size="lg"
            >
              <Github className="h-5 w-5" />
              Continue with GitHub
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/50" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Secure authentication
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 text-center text-sm">
              <div className="p-3 rounded-xl bg-muted/50">
                <p className="font-semibold text-foreground">100%</p>
                <p className="text-xs text-muted-foreground">Free</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/50">
                <p className="font-semibold text-foreground">OAuth</p>
                <p className="text-xs text-muted-foreground">Secure</p>
              </div>
              <div className="p-3 rounded-xl bg-muted/50">
                <p className="font-semibold text-foreground">No spam</p>
                <p className="text-xs text-muted-foreground">Promise</p>
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            By signing in, you agree to our{" "}
            <Link href="/terms" className="text-violet-600 hover:underline">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-violet-600 hover:underline">
              Privacy Policy
            </Link>
          </p>
        </div>

        <p className="mt-12 text-sm text-muted-foreground">
          New to open source?{" "}
          <Link href="/" className="text-violet-600 hover:underline font-medium">
            Learn how Nilla can help
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-violet-500/5 to-indigo-500/5">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-500 border-t-transparent" />
            <span className="text-muted-foreground">Loading...</span>
          </div>
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
