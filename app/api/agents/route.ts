import { NextResponse } from "next/server";
import { getAuthContext, canManageAgents } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = ctx.profile.role === "admin";
  const isMember = ctx.profile.role === "member";

  if (!isAdmin && !isMember) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // admin: 所有 agent，member: 仅自己管理的 agent
  const query = ctx.supabase
    .from("profiles")
    .select("id,email,full_name,role,is_active,managed_by,last_login_at,created_at")
    .eq("role", "agent")
    .order("created_at", { ascending: false });

  if (!isAdmin) {
    query.eq("managed_by", ctx.profile.id);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // 附加统计数据
  const agentIds = (data ?? []).map(a => a.id);
  const { data: stats } = await ctx.supabase
    .from("user_activity_stats")
    .select("user_id,stat_date,publish_count,ai_generate_count,asset_use_count")
    .in("user_id", agentIds)
    .order("stat_date", { ascending: false });

  const statsByUser: Record<string, { publish: number; ai: number; asset: number }> = {};
  for (const s of (stats ?? [])) {
    if (!statsByUser[s.user_id]) statsByUser[s.user_id] = { publish: 0, ai: 0, asset: 0 };
    statsByUser[s.user_id].publish += s.publish_count;
    statsByUser[s.user_id].ai += s.ai_generate_count;
    statsByUser[s.user_id].asset += s.asset_use_count;
  }

  return NextResponse.json({
    agents: (data ?? []).map(a => ({
      ...a,
      stats: statsByUser[a.id] ?? { publish: 0, ai: 0, asset: 0 },
    })),
  });
}

export async function POST(request: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canManageAgents(ctx.profile)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json() as {
    username: string;
    password: string;
    fullName?: string;
  };

  const username = (body.username || "").trim().toLowerCase();
  if (!username || !/^[a-z0-9_]+$/.test(username)) {
    return NextResponse.json({ error: "账号名只能包含字母、数字和下划线" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const internalEmail = `u_${username}@campus.local`;

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: internalEmail,
    password: body.password,
    email_confirm: true,
    user_metadata: { full_name: body.fullName || username, username, role: "agent" },
  });

  if (createError || !created.user) {
    const msg = createError?.message ?? "";
    if (msg.includes("already") || msg.includes("已")) {
      return NextResponse.json({ error: `账号「${username}」已被使用` }, { status: 400 });
    }
    return NextResponse.json({ error: msg || "创建失败" }, { status: 400 });
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .upsert({
      id: created.user.id,
      email: internalEmail,
      full_name: body.fullName || username,
      role: "agent",
      managed_by: ctx.profile.id,
    })
    .select("id,email,full_name,role,is_active,created_at")
    .single();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  return NextResponse.json({ agent: profile });
}
