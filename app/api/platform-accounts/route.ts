import { NextResponse } from "next/server";
import { getAuthContext, isManager } from "@/lib/auth";
import { accountPositionings, platforms } from "@/lib/constants";
import type { AccountStatus } from "@/lib/types";

const accountStatuses: AccountStatus[] = ["启用", "暂停", "异常"];

export async function GET() {
  const context = await getAuthContext();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await context.supabase
    .from("platform_accounts")
    .select("*,schools(name,campus_name,city),profiles(full_name,email,role)")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ accounts: data });
}

export async function POST(request: Request) {
  const context = await getAuthContext();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isManager(context.profile)) {
    return NextResponse.json({ error: "仅管理员可以分配校园账号。" }, { status: 403 });
  }

  const body = (await request.json()) as {
    userId: string;
    schoolId: string;
    platform: string;
    accountName: string;
    accountId?: string;
    accountPassword?: string;
    accountLink?: string;
    accountPositioning: string;
    dailyPublishTarget: number;
    status: AccountStatus;
    notes?: string;
  };

  if (
    !body.userId ||
    !body.schoolId ||
    !body.accountName ||
    !(platforms as readonly string[]).includes(body.platform) ||
    !(accountPositionings as readonly string[]).includes(body.accountPositioning) ||
    !accountStatuses.includes(body.status) ||
    Number(body.dailyPublishTarget) < 1
  ) {
    return NextResponse.json({ error: "分配信息不完整或格式不正确。" }, { status: 400 });
  }

  const { data: targetProfile } = await context.supabase
    .from("profiles")
    .select("id")
    .eq("id", body.userId)
    .single();

  if (!targetProfile) {
    return NextResponse.json({ error: "无权为该队员分配账号。" }, { status: 403 });
  }

  const { error: assignmentError } = await context.supabase
    .from("school_assignments")
    .upsert(
      {
        user_id: body.userId,
        school_id: body.schoolId,
        assigned_by: context.user.id
      },
      { onConflict: "user_id,school_id" }
    );

  if (assignmentError) {
    return NextResponse.json({ error: assignmentError.message }, { status: 400 });
  }

  const { data, error } = await context.supabase
    .from("platform_accounts")
    .upsert(
      {
        user_id: body.userId,
        school_id: body.schoolId,
        platform: body.platform,
        account_name: body.accountName,
        account_id: body.accountId || null,
        account_password: body.accountPassword || null,
        account_link: body.accountLink || null,
        account_positioning: body.accountPositioning,
        daily_publish_target: Number(body.dailyPublishTarget),
        status: body.status,
        notes: body.notes || null,
        assigned_by: context.user.id,
        updated_at: new Date().toISOString()
      },
      { onConflict: "user_id,school_id,platform" }
    )
    .select("*,schools(name,campus_name,city),profiles(full_name,email,role)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ account: data });
}
