import { CalendarDays } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { requireAuth } from "@/lib/auth";
import type { PlatformAccount, Profile, SchoolRecord, TaskRecord } from "@/lib/types";
import { TasksClient } from "./tasks-client";

export default async function TasksPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { supabase, profile, user } = await requireAuth();
  const { status } = await searchParams;

  const [{ data: tasks }, { data: schools }, { data: members }, { data: accounts }] = await Promise.all([
    supabase
      .from("publish_tasks")
      .select(
        "*,schools(name,campus_name),profiles!user_id(full_name,email),platform_accounts(account_name,account_positioning,platform)"
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
          .in("role", ["member", "agent"])
          .order("created_at", { ascending: false })
          .returns<Profile[]>()
      : Promise.resolve({ data: [] as Profile[] }),
    profile.role === "admin"
      ? supabase
          .from("platform_accounts")
          .select("id,user_id,school_id,platform,account_name,account_id,account_link,account_positioning,daily_publish_target,status,notes,positioning_profile,positioning_status,positioning_generated_at,positioning_confirmed_at,deleted_at,created_at,updated_at,schools(name,campus_name,city),profiles!user_id(full_name,email,role)")
          .is("deleted_at", null)
          .not("status", "in", "(暂停,异常)")
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
          currentUserId={user.id}
          initialStatus={status}
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
