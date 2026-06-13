"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import clsx from "clsx";
import { appName, navItems } from "@/lib/constants";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={clsx(
        "flex shrink-0 items-center justify-center rounded-md bg-brand-900 font-semibold text-white",
        compact ? "h-8 w-8 text-sm" : "h-9 w-9 text-[15px]"
      )}
      aria-hidden="true"
    >
      校
    </span>
  );
}

function ProfileAvatar({ profile }: { profile: Profile }) {
  if (profile.avatar_url) {
    return (
      <span className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-line bg-white">
        <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
      </span>
    );
  }

  const initial = (profile.full_name || profile.email || "校").slice(0, 1);

  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-canvas-alt text-sm font-semibold text-ink">
      {initial}
    </span>
  );
}

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

  const navigation = (
    <nav className="space-y-1" aria-label="主导航">
      {visibleItems.map((item) => {
        const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;

        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setOpen(false)}
            className={clsx(
              "group relative flex min-h-10 items-center gap-3 rounded-md px-3 text-[13px] font-medium transition-colors",
              active
                ? "bg-canvas-alt text-ink"
                : "text-muted hover:bg-canvas-alt/70 hover:text-ink"
            )}
          >
            {active ? (
              <span className="absolute -left-3 h-5 w-0.5 rounded-r bg-brand-900" />
            ) : null}
            <Icon
              size={17}
              strokeWidth={1.7}
              className={active ? "text-ink" : "text-muted-light group-hover:text-muted"}
            />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="sticky top-0 z-30 flex h-[60px] items-center justify-between border-b border-line bg-white/95 px-4 backdrop-blur lg:hidden">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <BrandMark compact />
          <span className="text-sm font-semibold tracking-tight">{appName}</span>
        </Link>
        <button
          className="button-ghost h-9 w-9 p-0"
          onClick={() => setOpen(true)}
          aria-label="打开导航"
        >
          <Menu size={20} />
        </button>
      </header>

      <div className="mx-auto flex min-h-screen w-full max-w-[1600px]">
        <aside className="sticky top-0 hidden h-screen w-[224px] shrink-0 flex-col border-r border-line bg-white px-4 py-5 lg:flex">
          <Link href="/dashboard" className="flex items-center gap-3 px-1">
            <BrandMark />
            <div>
              <p className="text-[15px] font-semibold tracking-tight">{appName}</p>
              <p className="mt-0.5 text-[10px] tracking-[0.12em] text-muted-light">团队工作台</p>
            </div>
          </Link>

          <div className="mt-9 flex-1">{navigation}</div>

          <div className="border-t border-line pt-4">
            <div className="flex items-center gap-3 px-1">
              <ProfileAvatar profile={profile} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-semibold text-ink">
                  {profile.full_name || profile.email}
                </p>
                <p className="mt-0.5 text-[11px] text-muted-light">
                  {profile.role === "admin" ? "管理员" : "校区负责人"}
                </p>
              </div>
              <button
                className="button-ghost h-8 w-8 shrink-0 p-0"
                onClick={signOut}
                aria-label="退出登录"
                title="退出登录"
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>
        </aside>

        {open ? (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button
              className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
              onClick={() => setOpen(false)}
              aria-label="关闭导航遮罩"
            />
            <aside className="absolute right-0 top-0 flex h-full w-[292px] flex-col bg-white px-4 py-5 shadow-nav">
              <div className="flex items-center justify-between">
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2.5"
                  onClick={() => setOpen(false)}
                >
                  <BrandMark compact />
                  <span className="text-sm font-semibold">{appName}</span>
                </Link>
                <button
                  className="button-ghost h-9 w-9 p-0"
                  onClick={() => setOpen(false)}
                  aria-label="关闭导航"
                >
                  <X size={19} />
                </button>
              </div>

              <div className="mt-8 flex-1 overflow-y-auto">{navigation}</div>

              <div className="border-t border-line pt-4">
                <div className="flex items-center gap-3">
                  <ProfileAvatar profile={profile} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-semibold">
                      {profile.full_name || profile.email}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-light">
                      {profile.role === "admin" ? "管理员" : "校区负责人"}
                    </p>
                  </div>
                  <button
                    className="button-ghost h-9 w-9 p-0"
                    onClick={signOut}
                    aria-label="退出登录"
                  >
                    <LogOut size={16} />
                  </button>
                </div>
              </div>
            </aside>
          </div>
        ) : null}

        <main className="min-w-0 flex-1 px-4 py-6 sm:px-7 sm:py-8 lg:px-10 lg:py-10 xl:px-12">
          {children}
        </main>
      </div>
    </div>
  );
}
