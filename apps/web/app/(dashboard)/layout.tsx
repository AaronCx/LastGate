"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Shield,
  LayoutDashboard,
  GitFork,
  Activity,
  ClipboardCheck,
  Settings,
  LogOut,
  Menu,
  X,
  User,
  Users,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Overview", href: "/overview", icon: LayoutDashboard },
  { name: "Repos", href: "/repos", icon: GitFork },
  { name: "Activity", href: "/activity", icon: Activity },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Review", href: "/review", icon: ClipboardCheck },
  { name: "Team", href: "/team", icon: Users },
  { name: "Settings", href: "/settings", icon: Settings },
];

interface UserData {
  github_username: string;
  avatar_url: string;
  email: string;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [user, setUser] = useState<UserData | null>(null);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => {
        if (!res.ok) throw new Error("Not authenticated");
        return res.json();
      })
      .then((data) => setUser(data.user))
      .catch(() => {
        router.push("/login");
      });
  }, [router]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-lg-bg">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-lg-surface border-r border-lg-border transform transition-transform duration-200 ease-in-out lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between px-6 border-b border-lg-border">
          <Link href="/overview" className="flex items-center gap-2.5">
            <Shield className="h-6 w-6 text-lg-accent" />
            <span className="text-lg font-bold font-mono text-lg-text tracking-tight">
              LastGate
            </span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-lg-text-muted hover:text-lg-text"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-6 px-3 space-y-1">
          {navigation.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-lg-accent/10 text-lg-accent border border-lg-accent/20"
                    : "text-lg-text-secondary hover:bg-lg-surface-2 hover:text-lg-text border border-transparent"
                )}
              >
                <item.icon className="h-[18px] w-[18px] shrink-0" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 border-t border-lg-border p-4">
          <div className="flex items-center gap-3">
            {user?.avatar_url ? (
              <Image
                src={user.avatar_url}
                alt={user.github_username}
                width={32}
                height={32}
                className="rounded-full ring-2 ring-lg-border"
              />
            ) : (
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-lg-surface-2">
                <User className="h-4 w-4 text-lg-text-muted" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-lg-text truncate">
                {user?.github_username || "Loading..."}
              </p>
              <p className="text-xs text-lg-text-muted truncate">
                {user?.email || ""}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="text-lg-text-muted hover:text-lg-fail transition-colors"
              title="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-lg-border bg-lg-bg/80 backdrop-blur-md px-4 sm:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden text-lg-text-muted hover:text-lg-text"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-3">
            {user?.avatar_url ? (
              <Image
                src={user.avatar_url}
                alt={user.github_username}
                width={28}
                height={28}
                className="rounded-full ring-1 ring-lg-border"
              />
            ) : (
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-lg-surface-2">
                <User className="h-3.5 w-3.5 text-lg-text-muted" />
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
