"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FolderGit2,
  CircleDot,
  Target,
  Trophy,
  X,
  GitBranch,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Repositories",
    href: "/repos",
    icon: FolderGit2,
  },
  {
    title: "Issues",
    href: "/issues",
    icon: CircleDot,
  },
  {
    title: "Commitments",
    href: "/commitments",
    icon: Target,
  },
  {
    title: "Rewards",
    href: "/profile",
    icon: Trophy,
  },
];

interface MobileNavProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileNav({ open, onOpenChange }: MobileNavProps) {
  const pathname = usePathname();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />
      <div className="fixed inset-y-0 left-0 w-72 border-r bg-gradient-to-b from-background to-muted/30 p-6">
        <div className="flex items-center justify-between mb-8">
          <Link href="/dashboard" className="flex items-center gap-2 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/25 transition-transform group-hover:scale-105">
              <GitBranch className="h-5 w-5" />
            </div>
            <span className="hidden font-bold bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent sm:inline-block">
              Nilla
            </span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        <nav className="flex flex-col gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => onOpenChange(false)}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                  isActive
                    ? "bg-gradient-to-r from-violet-500/10 to-indigo-500/10 text-violet-700 dark:text-violet-300 border border-violet-500/20 shadow-sm"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                <item.icon
                  className={cn(
                    "h-5 w-5",
                    isActive && "text-violet-600 dark:text-violet-400",
                  )}
                />
                {item.title}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
