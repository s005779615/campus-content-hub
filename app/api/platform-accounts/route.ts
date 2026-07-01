import { NextResponse } from "next/server";
import { getAuthContext, isManager } from "@/lib/auth";
import {
  checkDuplicatePlatformAccount,
  ensureSchoolAssignment,
  platformAccountSelect,
  toAccountRow,
  validateAccountPayload
} from "@/lib/account-records";
import type { AccountStatus } from "@/lib/types";

export async function GET() {
  const context = await getAuthContext();

  if (!context) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await context.supabase
    .from("platform_accounts")
    .select(platformAccountSelect)
    .is("deleted_at", null)
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
    accountLink?: string;
    accountPositioning: string;
    dailyPublishTarget: number;
    status: AccountStatus;
    notes?: string;
  };

  const payload = {
    userId: body.userId,
    schoolId: body.schoolId,
    platform: body.platform,
    accountName: body.accountName,
    platformAccountId: body.accountId,
    profileUrl: body.accountLink,
    manualPositioning: body.accountPositioning || "待AI定位",
    dailyPublishTarget: Number(body.dailyPublishTarget ?? 1),
    status: body.status,
    notes: body.notes
  };

  const validationError = await validateAccountPayload(context, payload);
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });

  const assignmentError = await ensureSchoolAssignment(context, body.userId, body.schoolId);
  if (assignmentError) return NextResponse.json({ error: assignmentError }, { status: 400 });

  const duplicateError = await checkDuplicatePlatformAccount(context, body.platform, body.accountId);
  if (duplicateError) return NextResponse.json({ error: duplicateError }, { status: 409 });

  const { data, error } = await context.supabase
    .from("platform_accounts")
    .insert(toAccountRow(context.user.id, payload))
    .select(platformAccountSelect)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ account: data });
}
