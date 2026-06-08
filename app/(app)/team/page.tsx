import { requireAdmin } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import type { Profile, SchoolRecord } from "@/lib/types";
import { TeamManager, type AssignmentRow } from "./team-manager";

export default async function TeamPage() {
  const { supabase } = await requireAdmin();

  const [{ data: members }, { data: schools }, { data: assignments }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id,email,full_name,role,created_at")
      .eq("role", "member")
      .order("created_at", { ascending: false })
      .returns<Profile[]>(),
    supabase
      .from("schools")
      .select("*")
      .order("created_at", { ascending: false })
      .returns<SchoolRecord[]>(),
    supabase
      .from("school_assignments")
      .select("user_id,school_id,schools(name,campus_name)")
      .returns<AssignmentRow[]>()
  ]);

  return (
    <>
      <PageHeader
        title="队员分配"
        description="创建队员账号，并把队员绑定到负责的学校。队员登录后只能看到自己负责的学校。"
      />
      <TeamManager
        members={members ?? []}
        schools={schools ?? []}
        assignments={assignments ?? []}
      />
    </>
  );
}
