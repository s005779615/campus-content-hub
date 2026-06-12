import { CalendarDays } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { requireAuth } from "@/lib/auth";
import type { PlatformAccount, Profile, SchoolRecord, TaskRecord } from "@/lib/types";
import { TasksClient } from "./tasks-client";

export default async function TasksPage() {
  const { supabase, profile } = await requireAuth();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: tasks }, { data: schools }, { data: members }, { data: accounts }] = await Promise.all([
    supabase
      .from("publish_tasks")
      .select(
        "*,schools(name,campus_name),profiles(full_name,email),platform_accounts(account_name,account_positioning,platform)"
      )
      .order("task_date", { ascending: false })
      .limit(200)
      .returns<TaskRecord[]>(),
    supabase
      .from("schools")
      .select("*")
      .order("created_at", { ascending: false })
      .returns<SchoolRecord[]>(),
    profile.role === "admin"
      ? supabase
          .from("profiles")
          .select("id,email,full_name,role,created_at")
          .eq("role", "member")
          .order("created_at", { ascending: false })
          .returns<Profile[]>()
      : Promise.resolve({ data: [] as Profile[] }),
    profile.role === "admin"
      ? supabase
          .from("platform_accounts")
          .select("*,schools(name,campus_name,city),profiles(full_name,email,role)")
          .eq("status", "启用")
          .order("account_name")
          .returns<PlatformAccount[]>()
      : Promise.resolve({ data: [] as PlatformAccount[] })
  ]);

  return (
    <>
      <PageHeader
        title="发布任务"
        description={
          profile.role === "admin"
            ? "按校区账号分配每日内容任务，并监管生成、发布、回填和复盘进度。"
            : "按步骤完成今天的内容任务，发布后上传截图并回填数据。"
        }
      />

      {(tasks ?? []).length || profile.role === "admin" ? (
        <TasksClient
          tasks={tasks ?? []}
          schools={schools ?? []}
          members={members ?? []}
          accounts={accounts ?? []}
          role={profile.role}
        />
      ) : (
        <EmptyState
          icon={CalendarDays}
          title="暂无发布任务"
          description="今天没有被分配发布任务，可以先到内容生成页准备素材。"
        />
      )}
    </>
  );
}
