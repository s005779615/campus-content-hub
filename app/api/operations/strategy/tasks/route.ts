import { NextResponse } from "next/server";
import { getAuthContext, isManager } from "@/lib/auth";
import { contentTypes } from "@/lib/constants";

type TaskParam = {
  accountId?: string;
  platform?: string;
  contentType?: string;
  contentDirection?: string;
  publishTime?: string;
  targetAudience?: string;
  operationGoal?: string;
};

export async function POST(request: Request) {
  const context = await getAuthContext();
  if (!context) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isManager(context.profile)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = (await request.json()) as {
    schoolId: string;
    taskParams?: TaskParam[];
    strategy?: { taskParams?: TaskParam[] };
  };
  const params = body.taskParams ?? body.strategy?.taskParams ?? [];

  if (!body.schoolId || !params.length) {
    return NextResponse.json({ error: "没有可分配的任务参数。" }, { status: 400 });
  }

  const accountIds = Array.from(new Set(params.map((item) => item.accountId).filter(Boolean))) as string[];
  const { data: accounts, error: accountError } = await context.supabase
    .from("platform_accounts")
    .select("id,user_id,school_id,platform,account_name,account_positioning")
    .in("id", accountIds)
    .eq("school_id", body.schoolId)
    .eq("status", "启用");

  if (accountError) return NextResponse.json({ error: accountError.message }, { status: 400 });
  const accountMap = new Map((accounts ?? []).map((account) => [account.id, account]));

  const rows = params.flatMap((item) => {
    if (!item.accountId) return [];
    const account = accountMap.get(item.accountId);
    if (!account) return [];

    const taskDate = parseTaskDate(item.publishTime);
    if (!taskDate) return [];

    const contentType = (contentTypes as readonly string[]).includes(item.contentType ?? "")
      ? item.contentType
      : "新生开学";

    return [{
      user_id: account.user_id,
      school_id: account.school_id,
      task_date: taskDate,
      required_count: 1,
      platform: account.platform,
      content_type: contentType,
      platform_account_id: account.id,
      status: "未开始",
      note: JSON.stringify({
        contentDirection: item.contentDirection ?? "",
        targetAudience: item.targetAudience ?? "",
        operationGoal: item.operationGoal ?? ""
      }),
      created_by: context.user.id
    }];
  });

  if (!rows.length) {
    return NextResponse.json({ error: "任务参数缺少账号或发布时间。" }, { status: 400 });
  }

  const { data, error } = await context.supabase
    .from("publish_tasks")
    .insert(rows)
    .select("id,task_date,platform,content_type,platform_accounts(account_name)");

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await context.supabase.from("operations_workflow_results").insert({
    user_id: context.user.id,
    school_id: body.schoolId,
    step: "content_tasks",
    payload: { createdTasks: data ?? [], taskParams: params }
  });

  return NextResponse.json({ tasks: data ?? [] });
}

function parseTaskDate(value?: string) {
  if (!value) return null;
  const match = value.match(/\d{4}-\d{2}-\d{2}/);
  return match?.[0] ?? null;
}
