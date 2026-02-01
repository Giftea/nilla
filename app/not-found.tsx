"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-violet-500/5 to-indigo-500/5">
      <div className="text-center px-6">
        <div className="mb-8">
          <h1 className="text-8xl font-bold bg-gradient-to-r from-violet-500 to-indigo-500 bg-clip-text text-transparent">
            404
          </h1>
          <div className="mt-4 text-4xl">🌱</div>
        </div>
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          Page not found
        </h2>
        <p className="text-muted-foreground mb-8 max-w-md mx-auto">
          Looks like this page wandered off into the wild. Let&apos;s get you back
          to familiar territory.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/">
            <Button className="bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 text-white border-0 shadow-md shadow-violet-500/25">
              <Home className="mr-2 h-4 w-4" />
              Go home
            </Button>
          </Link>
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go back
          </Button>
        </div>
      </div>
    </div>
  );
}
