import { AppShell } from "@/components/app-shell";
import { requireAuth } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({
  children
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireAuth();

  return <AppShell profile={profile}>{children}</AppShell>;
}
