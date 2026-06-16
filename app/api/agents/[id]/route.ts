import { NextResponse } from "next/server";
import { getAuthContext, canManageAgents } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageAgents(ctx.profile)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json() as { isActive?: boolean; fullName?: string };

  // 权限检查：member 只能管理自己的 agent
  if (ctx.profile.role === "member") {
    const { data: agent } = await ctx.supabase
      .from("profiles")
      .select("managed_by")
      .eq("id", id)
      .eq("role", "agent")
      .single();

    if (!agent || agent.managed_by !== ctx.profile.id) {
      return NextResponse.json({ error: "无权操作该代理" }, { status: 403 });
    }
  }

  const update: Record<string, unknown> = {};
  if (typeof body.isActive === "boolean") update.is_active = body.isActive;
  if (body.fullName?.trim()) update.full_name = body.fullName.trim();

  if (!Object.keys(update).length) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { data, error } = await ctx.supabase
    .from("profiles")
    .update(update)
    .eq("id", id)
    .select("id,email,full_name,role,is_active,created_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ agent: data });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (ctx.profile.role !== "admin") {
    return NextResponse.json({ error: "仅管理员可删除账号" }, { status: 403 });
  }

  const { id } = await params;
  const admin = (await import("@/lib/supabase/admin")).createSupabaseAdminClient();

  // 删除 Supabase Auth 用户
  await admin.auth.admin.deleteUser(id);

  // profiles 通过 CASCADE 自动删除
  return NextResponse.json({ ok: true });
}
