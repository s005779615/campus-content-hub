"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import clsx from "clsx";
import { appName, navItems } from "@/lib/constants";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

export function AppShell({
  profile,
  children
}: {
  profile: Profile;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const visibleItems = navItems.filter(
    (item) => !item.adminOnly || profile.role === "admin"
  );

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur">
        <div className="flex h-14 items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              className="button-ghost h-9 w-9 p-0 lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="打开导航"
            >
              <Menu size={19} />
            </button>
            <Link href="/dashboard" className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand-600 text-sm font-bold text-white">
                校
              </span>
              <span className="text-sm font-semibold sm:text-base">{appName}</span>
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium leading-5">
                {profile.full_name || profile.email}
              </p>
              <p className="text-xs text-muted">
                {profile.role === "admin" ? "管理员" : "队员"}
              </p>
            </div>
            <button className="button-ghost h-9 w-9 p-0" onClick={signOut} aria-label="退出登录">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1440px]">
        <aside className="sticky top-14 hidden h-[calc(100vh-56px)] w-56 shrink-0 border-r border-line bg-white px-3 py-4 lg:block">
          <nav className="space-y-1">
            {visibleItems.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition",
                    active
                      ? "bg-brand-50 text-brand-700"
                      : "text-muted hover:bg-canvas hover:text-ink"
                  )}
                >
                  <Icon size={18} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {open ? (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button
              className="absolute inset-0 bg-ink/30"
              onClick={() => setOpen(false)}
              aria-label="关闭导航遮罩"
            />
            <aside className="absolute left-0 top-0 h-full w-72 bg-white p-4 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-semibold">{appName}</span>
                <button
                  className="button-ghost h-9 w-9 p-0"
                  onClick={() => setOpen(false)}
                  aria-label="关闭导航"
                >
                  <X size={18} />
                </button>
              </div>
              <nav className="space-y-1">
                {visibleItems.map((item) => {
                  const active = pathname === item.href;
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={clsx(
                        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition",
                        active
                          ? "bg-brand-50 text-brand-700"
                          : "text-muted hover:bg-canvas hover:text-ink"
                      )}
                    >
                      <Icon size={18} />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </aside>
          </div>
        ) : null}

        <main className="min-w-0 flex-1 px-4 py-5 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
