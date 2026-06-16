import { NextResponse } from "next/server";
import { canManageAgents, getAuthContext } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const context = await getAuthContext();
    const { id } = await params;

    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canManageAgents(context.profile)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as { schoolIds: string[] };
    const schoolIds = Array.from(new Set(body.schoolIds ?? []));

    const { data: target, error: targetError } = await context.supabase
      .from("profiles")
      .select("id,role")
      .eq("id", id)
      .single();

    if (targetError || !target) {
      return NextResponse.json({ error: "成员不存在或无权访问。" }, { status: 404 });
    }

    if (context.profile.role === "admin" && !["member", "agent"].includes(target.role)) {
      return NextResponse.json({ error: "不能给该角色分配学校。" }, { status: 403 });
    }

    if (context.profile.role === "member" && target.role !== "agent") {
      return NextResponse.json({ error: "负责人只能给校区代理分配学校。" }, { status: 403 });
    }

    let allowedSchoolIds = schoolIds;
    if (context.profile.role === "member") {
      const { data: ownAssignments, error: ownError } = await context.supabase
        .from("school_assignments")
        .select("school_id")
        .eq("user_id", context.user.id);

      if (ownError) {
        return NextResponse.json({ error: ownError.message }, { status: 400 });
      }

      const ownSchoolIds = new Set((ownAssignments ?? []).map((item) => item.school_id));
      const hasForbiddenSchool = schoolIds.some((schoolId) => !ownSchoolIds.has(schoolId));
      if (hasForbiddenSchool) {
        return NextResponse.json(
          { error: "只能把代理分配到你自己负责的学校。" },
          { status: 403 }
        );
      }
      allowedSchoolIds = Array.from(ownSchoolIds);
    }

    const admin = createSupabaseAdminClient();
    const deleteQuery = admin
      .from("school_assignments")
      .delete()
      .eq("user_id", id);
    const deleteResult =
      context.profile.role === "member"
        ? allowedSchoolIds.length
          ? await deleteQuery.in("school_id", allowedSchoolIds)
          : { error: null }
        : await deleteQuery;

    if (deleteResult.error) {
      return NextResponse.json({ error: deleteResult.error.message }, { status: 400 });
    }

    if (schoolIds.length) {
      const insertResult = await admin.from("school_assignments").insert(
        schoolIds.map((schoolId) => ({
          user_id: id,
          school_id: schoolId,
          assigned_by: context.user.id
        }))
      );

      if (insertResult.error) {
        return NextResponse.json({ error: insertResult.error.message }, { status: 400 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
