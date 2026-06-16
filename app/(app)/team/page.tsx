import { redirect } from "next/navigation";
import { canManageAgents, requireAuth } from "@/lib/auth";
import { PageHeader } from "@/components/page-header";
import type { Profile, SchoolRecord } from "@/lib/types";
import { TeamManager, type AssignmentRow } from "./team-manager";

export default async function TeamPage() {
  const { supabase, profile, user } = await requireAuth();

  if (!canManageAgents(profile)) {
    redirect("/dashboard");
  }

  const targetRole = profile.role === "admin" ? "member" : "agent";
  const targetLabel = profile.role === "admin" ? "校区负责人" : "校区代理";

  const ownAssignments =
    profile.role === "member"
      ? await supabase
          .from("school_assignments")
          .select("school_id")
          .eq("user_id", user.id)
      : { data: [] as { school_id: string }[] };

  const ownSchoolIds = ownAssignments.data?.map((item) => item.school_id) ?? [];
  const schoolsQuery =
    profile.role === "admin"
      ? supabase
          .from("schools")
          .select("*")
          .order("created_at", { ascending: false })
          .returns<SchoolRecord[]>()
      : ownSchoolIds.length
        ? supabase
            .from("schools")
            .select("*")
            .in("id", ownSchoolIds)
            .order("created_at", { ascending: false })
            .returns<SchoolRecord[]>()
        : Promise.resolve({ data: [] as SchoolRecord[] });

  const [{ data: members }, { data: schools }, { data: assignments }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id,email,full_name,role,created_at")
      .eq("role", targetRole)
      .order("created_at", { ascending: false })
      .returns<Profile[]>(),
    schoolsQuery,
    supabase
      .from("school_assignments")
      .select("user_id,school_id,schools(name,campus_name)")
      .returns<AssignmentRow[]>()
  ]);

  return (
    <>
      <PageHeader
        title={profile.role === "admin" ? "校区负责人" : "校区代理"}
        description={
          profile.role === "admin"
            ? "创建负责人账号，并绑定负责学校。负责人登录后只能看到自己的学校、任务和数据。"
            : "为你负责的校区创建代理账号，并绑定可执行的学校。代理可上传素材、生成内容和发布回填。"
        }
      />
      <TeamManager
        members={members ?? []}
        schools={schools ?? []}
        assignments={assignments ?? []}
        targetLabel={targetLabel}
        targetRole={targetRole}
      />
    </>
  );
}
