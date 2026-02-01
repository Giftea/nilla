"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { GitBranch, Flame, Zap, LogOut, User, Menu } from "lucide-react";
import { useState } from "react";
import { MobileNav } from "./mobile-nav";

interface NavbarProps {
  user: {
    id: string;
    email: string;
    avatarUrl: string;
    username: string;
    displayName: string;
  };
  stats: {
    total_xp: number;
    current_level: number;
    current_streak: number;
  } | null;
}

export function Navbar({ user, stats }: NavbarProps) {
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <>
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-16 items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Link href="/dashboard" className="flex items-center gap-2 group">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/25 transition-transform group-hover:scale-105">
                <GitBranch className="h-5 w-5" />
              </div>
              <span className="hidden font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent sm:inline-block">Nilla</span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            {/* Stats */}
            {stats && (
              <div className="hidden items-center gap-3 sm:flex">
                <div className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 px-3 py-1 text-orange-600 dark:text-orange-400">
                  <Flame className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {stats.current_streak}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-500/10 to-indigo-500/10 border border-violet-500/20 px-3 py-1 text-violet-600 dark:text-violet-400">
                  <Zap className="h-4 w-4" />
                  <span className="text-sm font-medium">{stats.total_xp} XP</span>
                </div>
                <Badge className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0">Level {stats.current_level}</Badge>
              </div>
            )}

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-9 w-9 rounded-full"
                >
                  <Avatar className="h-9 w-9">
                    <AvatarImage
                      src={user.avatarUrl}
                      alt={user.displayName}
                    />
                    <AvatarFallback>
                      {user.displayName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user.displayName}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      @{user.username}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {stats && (
                  <>
                    <div className="flex items-center justify-between px-2 py-1.5 sm:hidden">
                      <div className="flex items-center gap-1.5 text-orange-600">
                        <Flame className="h-4 w-4" />
                        <span className="text-sm">{stats.current_streak} streak</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between px-2 py-1.5 sm:hidden">
                      <div className="flex items-center gap-1.5 text-primary">
                        <Zap className="h-4 w-4" />
                        <span className="text-sm">{stats.total_xp} XP</span>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        Lvl {stats.current_level}
                      </Badge>
                    </div>
                    <DropdownMenuSeparator className="sm:hidden" />
                  </>
                )}
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      <MobileNav open={mobileNavOpen} onOpenChange={setMobileNavOpen} />
    </>
  );
}
