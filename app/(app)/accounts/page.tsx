import { PageHeader } from "@/components/page-header";
import { isManager, requireAuth } from "@/lib/auth";
import type { PlatformAccount, Profile, SchoolRecord } from "@/lib/types";
import { AccountsClient } from "./accounts-client";

export default async function AccountsPage() {
  const { supabase, profile } = await requireAuth();
  const manager = isManager(profile);

  const [{ data: schools }, { data: accounts }, { data: members }] = await Promise.all([
    supabase
      .from("schools")
      .select("*")
      .order("name")
      .returns<SchoolRecord[]>(),
    supabase
      .from("platform_accounts")
      .select("*,schools(name,campus_name,city),profiles(full_name,email,role)")
      .order("created_at", { ascending: false })
      .returns<PlatformAccount[]>(),
    manager
      ? supabase
          .from("profiles")
          .select("id,email,full_name,role,created_at")
          .eq("role", "member")
          .order("full_name")
          .returns<Profile[]>()
      : Promise.resolve({ data: [] as Profile[] })
  ]);

  return (
    <>
      <PageHeader
        title="校园分配"
        description={
          manager
            ? "把学校、运营账号和每日目标分配到具体队员。"
            : "查看分配给你的学校、平台账号和每日发布目标。"
        }
      />
      <AccountsClient
        initialAccounts={accounts ?? []}
        schools={schools ?? []}
        members={members ?? []}
        role={profile.role}
      />
    </>
  );
}
