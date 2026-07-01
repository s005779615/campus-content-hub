import { getAuthContext } from "@/lib/auth";
import { accountPositionings, accountStatuses, platforms } from "@/lib/constants";
import type { AccountPositioning, AccountStatus } from "@/lib/types";

export const platformAccountSelect =
  "id,user_id,school_id,platform,account_name,account_id,account_link,account_positioning,daily_publish_target,status,notes,positioning_profile,positioning_status,positioning_generated_at,positioning_confirmed_at,deleted_at,created_at,updated_at,schools(name,campus_name,city),profiles!user_id(full_name,email,role)";

export type AccountPayload = {
  userId: string;
  schoolId: string;
  platform: string;
  accountName: string;
  platformAccountId?: string;
  profileUrl?: string;
  manualPositioning?: string;
  dailyPublishTarget?: number;
  status?: string;
  notes?: string;
};

type AuthContext = NonNullable<Awaited<ReturnType<typeof getAuthContext>>>;

export async function validateAccountPayload(context: AuthContext, body: AccountPayload) {
  if (
    !body.userId ||
    !body.schoolId ||
    !body.accountName ||
    !(platforms as readonly string[]).includes(body.platform) ||
    !(accountPositionings as readonly string[]).includes(body.manualPositioning ?? "待AI定位") ||
    !(accountStatuses as readonly string[]).includes(body.status ?? "待定位") ||
    Number(body.dailyPublishTarget ?? 1) < 1
  ) {
    return "账号信息不完整或格式不正确。";
  }

  const { data: targetProfile } = await context.supabase
    .from("profiles")
    .select("id,role")
    .eq("id", body.userId)
    .single();

  if (!targetProfile || !["member", "agent"].includes(targetProfile.role)) {
    return "无权为该成员分配账号。";
  }

  return "";
}

export async function ensureSchoolAssignment(
  context: AuthContext,
  userId: string,
  schoolId: string
) {
  const { error } = await context.supabase
    .from("school_assignments")
    .upsert(
      {
        user_id: userId,
        school_id: schoolId,
        assigned_by: context.user.id
      },
      { onConflict: "user_id,school_id" }
    );

  return error?.message ?? "";
}

export async function checkDuplicatePlatformAccount(
  context: AuthContext,
  platform: string,
  platformAccountId?: string,
  excludeAccountId?: string
) {
  const trimmed = platformAccountId?.trim();
  if (!trimmed) return "";

  let query = context.supabase
    .from("platform_accounts")
    .select("id,account_name")
    .eq("platform", platform)
    .eq("account_id", trimmed)
    .is("deleted_at", null)
    .limit(1);

  if (excludeAccountId) query = query.neq("id", excludeAccountId);

  const { data, error } = await query;
  if (error) return error.message;
  if (data?.length) return `该平台账号ID已存在：${data[0].account_name}`;
  return "";
}

export function toAccountRow(ownerId: string, body: AccountPayload) {
  return {
    user_id: body.userId,
    school_id: body.schoolId,
    platform: body.platform,
    account_name: body.accountName.trim(),
    account_id: body.platformAccountId?.trim() || null,
    account_link: body.profileUrl?.trim() || null,
    account_positioning: (body.manualPositioning || "待AI定位") as AccountPositioning,
    daily_publish_target: Number(body.dailyPublishTarget ?? 1),
    status: (body.status || "待定位") as AccountStatus,
    notes: body.notes?.trim() || null,
    assigned_by: ownerId,
    updated_at: new Date().toISOString()
  };
}
