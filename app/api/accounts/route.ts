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

export async function GET() {
  const context = await getAuthContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await context.supabase
    .from("platform_accounts")
    .select(platformAccountSelect)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ accounts: data ?? [] });
}

export async function POST(request: Request) {
  const context = await getAuthContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isManager(context.profile)) {
    return NextResponse.json({ error: "仅管理员或主管可以添加账号。" }, { status: 403 });
  }

  const body = (await request.json()) as AccountPayload;
  const error = await validateAccountPayload(context, body);
  if (error) return NextResponse.json({ error }, { status: 400 });

  const assignmentError = await ensureSchoolAssignment(context, body.userId, body.schoolId);
  if (assignmentError) return NextResponse.json({ error: assignmentError }, { status: 400 });

  const duplicateError = await checkDuplicatePlatformAccount(
    context,
    body.platform,
    body.platformAccountId
  );
  if (duplicateError) return NextResponse.json({ error: duplicateError }, { status: 409 });

  const { data, error: insertError } = await context.supabase
    .from("platform_accounts")
    .insert(toAccountRow(context.user.id, body))
    .select(platformAccountSelect)
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 400 });
  return NextResponse.json({ account: data });
}
