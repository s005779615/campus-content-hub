"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronRight, LogOut, Menu, Sparkles, X } from "lucide-react";
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
      {/* ── Header ── */}
      <header className="sticky top-0 z-30 border-b border-line/50 glass-header">
        <div className="flex h-14 items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              className="button-ghost h-9 w-9 p-0 lg:hidden"
              onClick={() => setOpen(true)}
              aria-label="打开导航"
            >
              <Menu size={20} />
            </button>
            <Link href="/dashboard" className="flex items-center gap-2.5">
              {profile.avatar_url ? (
                <span className="h-9 w-9 overflow-hidden rounded-xl shadow-sm shadow-brand-200/50 ring-2 ring-brand-100">
                  <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                </span>
              ) : (
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-ink to-brand-700 text-sm font-bold text-white shadow-sm shadow-brand-200/50">
                  校
                </span>
              )}
              <span className="text-[15px] font-semibold tracking-tight text-ink">{appName}</span>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-[13px] font-semibold leading-5 text-ink-soft">
                {profile.full_name || profile.email}
              </p>
              <p className="text-[11px] font-medium text-muted-light">
                {profile.role === "admin" ? "管理员" : "队员"}
              </p>
            </div>
            <div className="flex items-center gap-1 rounded-lg border border-line/80 bg-white p-0.5">
              <button
                className="flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium text-muted transition-all hover:bg-canvas-alt hover:text-ink"
                onClick={signOut}
                aria-label="退出登录"
              >
                <LogOut size={14} />
                <span className="hidden sm:inline">退出</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-[1440px]">
        {/* ── Desktop Sidebar ── */}
        <aside className="sticky top-14 hidden h-[calc(100vh-56px)] w-[232px] shrink-0 border-r border-line/40 bg-white/60 px-3 py-5 lg:block">
          <nav className="space-y-0.5">
            {visibleItems.map((item) => {
              const active = pathname === item.href;
              const Icon = item.icon;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium transition-all duration-200",
                    active
                      ? "bg-brand-50 text-brand-700 shadow-sm"
                      : "text-muted hover:bg-canvas-alt hover:text-ink"
                  )}
                >
                  <Icon
                    size={18}
                    className={clsx(
                      "transition-colors duration-200",
                      active ? "text-brand-500" : "text-muted-light group-hover:text-muted"
                    )}
                  />
                  <span className="flex-1">{item.label}</span>
                  {active ? (
                    <ChevronRight size={14} className="text-brand-400" />
                  ) : null}
                </Link>
              );
            })}
          </nav>

          {/* Sidebar footer */}
          <div className="mt-6 rounded-lg border border-brand-100/60 bg-gradient-to-br from-brand-50/80 to-white p-3.5">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-brand-500" />
              <p className="text-[12px] font-semibold text-brand-700">校园内容中台</p>
            </div>
            <p className="mt-1.5 text-[11px] leading-5 text-muted-light">
              非官方校园生活攻略 · 学长学姐视角 · 新生避坑
            </p>
          </div>
        </aside>

        {/* ── Mobile Drawer ── */}
        {open ? (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button
              className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
              onClick={() => setOpen(false)}
              aria-label="关闭导航遮罩"
            />
            <aside className="absolute left-0 top-0 flex h-full w-[280px] flex-col bg-white shadow-nav">
              <div className="flex h-14 items-center justify-between border-b border-line px-4">
                <div className="flex items-center gap-2">
                  {profile.avatar_url ? (
                    <span className="h-8 w-8 overflow-hidden rounded-lg ring-2 ring-brand-100">
                      <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
                    </span>
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-ink to-brand-700 text-sm font-bold text-white">
                      校
                    </span>
                  )}
                  <span className="text-sm font-semibold">{appName}</span>
                </div>
                <button
                  className="button-ghost h-9 w-9 p-0"
                  onClick={() => setOpen(false)}
                  aria-label="关闭导航"
                >
                  <X size={19} />
                </button>
              </div>
              <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
                {visibleItems.map((item) => {
                  const active = pathname === item.href;
                  const Icon = item.icon;

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={clsx(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                        active
                          ? "bg-brand-50 text-brand-700"
                          : "text-muted hover:bg-canvas-alt hover:text-ink"
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

        {/* ── Main Content ── */}
        <main className="min-w-0 flex-1 px-5 py-6 sm:px-8 lg:px-10">{children}</main>
      </div>
    </div>
  );
}
