import { CalendarDays } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { requireAuth } from "@/lib/auth";
import type { Profile, SchoolRecord, TaskRecord } from "@/lib/types";
import { TasksClient } from "./tasks-client";

export default async function TasksPage() {
  const { supabase, profile } = await requireAuth();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: tasks }, { data: schools }, { data: members }] = await Promise.all([
    supabase
      .from("publish_tasks")
      .select("*,schools(name,campus_name),profiles(full_name,email)")
      .gte("task_date", today)
      .order("task_date", { ascending: true })
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
      : Promise.resolve({ data: [] as Profile[] })
  ]);

  return (
    <>
      <PageHeader
        title="发布任务"
        description={
          profile.role === "admin"
            ? "设置每个队员每天需要发布的内容数量，并按学校、队员、日期筛选。"
            : "查看自己的今日和未来发布任务，完成后勾选已完成。"
        }
      />

      {(tasks ?? []).length || profile.role === "admin" ? (
        <TasksClient
          tasks={tasks ?? []}
          schools={schools ?? []}
          members={members ?? []}
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
