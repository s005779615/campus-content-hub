import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/env";

export default async function HomePage() {
  if (!isSupabaseConfigured()) {
    redirect("/login");
  }

  const context = await getAuthContext();
  redirect(context ? "/dashboard" : "/login");
}
