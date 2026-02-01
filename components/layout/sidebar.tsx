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
} from "lucide-react";

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

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r bg-gradient-to-b from-background to-muted/30 lg:block sticky top-16 h-[calc(100vh-4rem)] overflow-y-auto">
      <nav className="flex flex-col gap-1 p-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                isActive
                  ? "bg-gradient-to-r from-violet-500/10 to-indigo-500/10 text-violet-700 dark:text-violet-300 border border-violet-500/20 shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className={cn("h-5 w-5", isActive && "text-violet-600 dark:text-violet-400")} />
              {item.title}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
