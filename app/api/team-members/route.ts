import { NextResponse } from "next/server";
import { canManageAgents, getAuthContext } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/lib/types";

export async function GET() {
  try {
    const context = await getAuthContext();

    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canManageAgents(context.profile)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const targetRole = context.profile.role === "admin" ? "member" : "agent";
    const [{ data: members, error: membersError }, { data: assignments, error: assignmentsError }] =
      await Promise.all([
        context.supabase
          .from("profiles")
          .select("id,email,full_name,role,created_at")
          .eq("role", targetRole)
          .order("created_at", { ascending: false }),
        context.supabase
          .from("school_assignments")
          .select("user_id,school_id,schools(name,campus_name)")
      ]);

    if (membersError || assignmentsError) {
      return NextResponse.json(
        { error: membersError?.message ?? assignmentsError?.message },
        { status: 400 }
      );
    }

    return NextResponse.json({ members, assignments });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const context = await getAuthContext();

    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!canManageAgents(context.profile)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = (await request.json()) as {
      username: string;
      password: string;
      fullName?: string;
      role?: UserRole;
    };

    const targetRole: UserRole = context.profile.role === "admin" ? "member" : "agent";
    if (body.role && body.role !== targetRole) {
      return NextResponse.json({ error: "不能创建该角色账号。" }, { status: 403 });
    }
    const managerId = targetRole === "agent" ? context.user.id : null;

    const username = (body.username || "").trim().toLowerCase();
    if (!username || username.length < 2) {
      return NextResponse.json({ error: "账号名至少2个字符" }, { status: 400 });
    }
    if (!/^[a-z0-9_]+$/.test(username)) {
      return NextResponse.json({ error: "账号名只能包含字母、数字和下划线" }, { status: 400 });
    }
    if (!body.password || body.password.length < 6) {
      return NextResponse.json({ error: "初始密码至少6位。" }, { status: 400 });
    }

    // 内部用虚拟邮箱注册 Supabase Auth
    const internalEmail = `u_${username}@campus.local`;

    const admin = createSupabaseAdminClient();
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email: internalEmail,
      password: body.password,
      email_confirm: true,
      user_metadata: {
        full_name: body.fullName || username,
        username: username,
        role: targetRole,
        managed_by: managerId
      }
    });

    if (createError || !created.user) {
      const msg = createError?.message ?? "";
      if (msg.includes("already") || msg.includes("registered") || msg.includes("exists") || msg.includes("已被")) {
        return NextResponse.json(
          { error: `账号「${username}」已被使用，换一个账号名。` },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: msg || "创建成员失败" },
        { status: 400 }
      );
    }

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .upsert({
        id: created.user.id,
        email: internalEmail,
        full_name: body.fullName || username,
        role: targetRole,
        managed_by: managerId
      })
      .select("id,email,full_name,role,created_at")
      .single();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    return NextResponse.json({ member: profile });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
