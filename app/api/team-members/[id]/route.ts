import { NextResponse } from "next/server";
import { canManageAgents, getAuthContext } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function DELETE(
  _request: Request,
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

    if (id === context.user.id) {
      return NextResponse.json({ error: "不能删除当前登录账号。" }, { status: 400 });
    }

    const { data: member, error: memberError } = await context.supabase
      .from("profiles")
      .select("id,role")
      .eq("id", id)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: "成员不存在或已被删除。" }, { status: 404 });
    }

    if (context.profile.role === "admin" && !["member", "agent"].includes(member.role)) {
      return NextResponse.json({ error: "不能删除该角色账号。" }, { status: 403 });
    }

    if (context.profile.role === "member" && member.role !== "agent") {
      return NextResponse.json({ error: "负责人只能删除自己名下的代理账号。" }, { status: 403 });
    }

    const admin = createSupabaseAdminClient();
    const { error } = await admin.auth.admin.deleteUser(id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
