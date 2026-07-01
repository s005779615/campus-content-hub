import { NextResponse } from "next/server";
import { getAuthContext, isManager } from "@/lib/auth";
import { accountPositionings, accountStatuses, platforms } from "@/lib/constants";
import {
  checkDuplicatePlatformAccount,
  ensureSchoolAssignment,
  platformAccountSelect,
  validateAccountPayload,
  type AccountPayload
} from "@/lib/account-records";

type RouteParams = {
  params: Promise<{ accountId: string }>;
};

export async function PATCH(request: Request, { params }: RouteParams) {
  const context = await getAuthContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isManager(context.profile)) {
    return NextResponse.json({ error: "仅管理员或主管可以编辑账号。" }, { status: 403 });
  }

  const { accountId } = await params;
  const body = (await request.json()) as Partial<AccountPayload>;
  const { data: current, error: readError } = await context.supabase
    .from("platform_accounts")
    .select("id,user_id,school_id,platform,account_name,account_id")
    .eq("id", accountId)
    .is("deleted_at", null)
    .single();

  if (readError || !current) {
    return NextResponse.json({ error: "账号不存在或已删除。" }, { status: 404 });
  }

  const nextPayload: AccountPayload = {
    userId: body.userId ?? current.user_id,
    schoolId: body.schoolId ?? current.school_id,
    platform: body.platform ?? current.platform,
    accountName: body.accountName ?? current.account_name,
    platformAccountId: body.platformAccountId ?? current.account_id ?? undefined,
    profileUrl: body.profileUrl,
    manualPositioning: body.manualPositioning,
    dailyPublishTarget: body.dailyPublishTarget,
    status: body.status,
    notes: body.notes
  };

  if (body.platform && !(platforms as readonly string[]).includes(body.platform)) {
    return NextResponse.json({ error: "平台不正确。" }, { status: 400 });
  }
  if (body.manualPositioning && !(accountPositionings as readonly string[]).includes(body.manualPositioning)) {
    return NextResponse.json({ error: "初步定位不正确。" }, { status: 400 });
  }
  if (body.status && !(accountStatuses as readonly string[]).includes(body.status)) {
    return NextResponse.json({ error: "账号状态不正确。" }, { status: 400 });
  }
  if (body.dailyPublishTarget !== undefined && Number(body.dailyPublishTarget) < 1) {
    return NextResponse.json({ error: "每日发布目标不能小于 1。" }, { status: 400 });
  }

  const isFullEdit =
    body.userId !== undefined ||
    body.schoolId !== undefined ||
    body.accountName !== undefined ||
    body.platform !== undefined;

  if (isFullEdit) {
    const validationError = await validateAccountPayload(context, nextPayload);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
    const assignmentError = await ensureSchoolAssignment(context, nextPayload.userId, nextPayload.schoolId);
    if (assignmentError) return NextResponse.json({ error: assignmentError }, { status: 400 });
  }

  if (body.platform !== undefined || body.platformAccountId !== undefined) {
    const duplicateError = await checkDuplicatePlatformAccount(
      context,
      nextPayload.platform,
      nextPayload.platformAccountId,
      accountId
    );
    if (duplicateError) return NextResponse.json({ error: duplicateError }, { status: 409 });
  }

  const updates = buildUpdateRow(context.user.id, body);
  if (!Object.keys(updates).length) {
    return NextResponse.json({ error: "没有可保存的修改。" }, { status: 400 });
  }

  const { data, error } = await context.supabase
    .from("platform_accounts")
    .update(updates)
    .eq("id", accountId)
    .is("deleted_at", null)
    .select(platformAccountSelect)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ account: data });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const context = await getAuthContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isManager(context.profile)) {
    return NextResponse.json({ error: "仅管理员或主管可以删除账号。" }, { status: 403 });
  }

  const { accountId } = await params;
  const deletedAt = new Date().toISOString();
  const { error } = await context.supabase
    .from("platform_accounts")
    .update({
      deleted_at: deletedAt,
      status: "暂停",
      updated_at: deletedAt
    })
    .eq("id", accountId)
    .is("deleted_at", null);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true, deletedAt });
}

function buildUpdateRow(ownerId: string, body: Partial<AccountPayload>) {
  const updates: Record<string, unknown> = {};

  if (body.userId !== undefined) updates.user_id = body.userId;
  if (body.schoolId !== undefined) updates.school_id = body.schoolId;
  if (body.platform !== undefined) updates.platform = body.platform;
  if (body.accountName !== undefined) updates.account_name = body.accountName.trim();
  if (body.platformAccountId !== undefined) updates.account_id = body.platformAccountId.trim() || null;
  if (body.profileUrl !== undefined) updates.account_link = body.profileUrl.trim() || null;
  if (body.manualPositioning !== undefined) updates.account_positioning = body.manualPositioning || "待AI定位";
  if (body.dailyPublishTarget !== undefined) updates.daily_publish_target = Number(body.dailyPublishTarget);
  if (body.status !== undefined) updates.status = body.status || "待定位";
  if (body.notes !== undefined) updates.notes = body.notes.trim() || null;

  if (Object.keys(updates).length) {
    updates.assigned_by = ownerId;
    updates.updated_at = new Date().toISOString();
  }

  return updates;
}
