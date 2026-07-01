import { NextResponse } from "next/server";
import { getAuthContext, isManager } from "@/lib/auth";
import {
  checkDuplicatePlatformAccount,
  ensureSchoolAssignment,
  platformAccountSelect,
  toAccountRow,
  validateAccountPayload,
  type AccountPayload
} from "@/lib/account-records";

type BulkAccountPayload = AccountPayload & {
  rowNumber?: number;
};

export async function POST(request: Request) {
  const context = await getAuthContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isManager(context.profile)) {
    return NextResponse.json({ error: "仅管理员或主管可以批量添加账号。" }, { status: 403 });
  }

  const body = (await request.json()) as { accounts?: BulkAccountPayload[] };
  const accounts = body.accounts ?? [];

  if (!accounts.length) {
    return NextResponse.json({ error: "没有可保存的账号。" }, { status: 400 });
  }

  const created: unknown[] = [];
  const failed: Array<{ rowNumber: number; accountName?: string; error: string }> = [];

  for (const account of accounts) {
    const rowNumber = account.rowNumber ?? created.length + failed.length + 1;
    const validationError = await validateAccountPayload(context, account);
    if (validationError) {
      failed.push({ rowNumber, accountName: account.accountName, error: validationError });
      continue;
    }

    const assignmentError = await ensureSchoolAssignment(context, account.userId, account.schoolId);
    if (assignmentError) {
      failed.push({ rowNumber, accountName: account.accountName, error: assignmentError });
      continue;
    }

    const duplicateError = await checkDuplicatePlatformAccount(
      context,
      account.platform,
      account.platformAccountId
    );
    if (duplicateError) {
      failed.push({ rowNumber, accountName: account.accountName, error: duplicateError });
      continue;
    }

    const { data, error } = await context.supabase
      .from("platform_accounts")
      .insert(toAccountRow(context.user.id, account))
      .select(platformAccountSelect)
      .single();

    if (error) {
      failed.push({ rowNumber, accountName: account.accountName, error: error.message });
      continue;
    }

    created.push(data);
  }

  return NextResponse.json({ created, failed });
}
