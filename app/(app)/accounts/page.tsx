import { Smartphone } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { requireAuth } from "@/lib/auth";
import type { SchoolRecord } from "@/lib/types";
import { AccountsClient } from "./accounts-client";

export default async function AccountsPage() {
  const { supabase } = await requireAuth();
  const { data: schools } = await supabase
    .from("schools")
    .select("*")
    .order("created_at", { ascending: false })
    .returns<SchoolRecord[]>();

  return (
    <>
      <PageHeader
        title="平台账号"
        description="管理你在各学校使用的抖音和小红书运营账号，按学校归档方便查找。"
      />
      <AccountsClient schools={schools ?? []} />
    </>
  );
}
