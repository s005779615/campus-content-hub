import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export async function getAuthContext() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single<Profile>();

  if (!profile) {
    return null;
  }

  return { supabase, user, profile };
}

export async function requireAuth() {
  const context = await getAuthContext();

  if (!context) {
    redirect("/login");
  }

  return context;
}

export async function requireAdmin() {
  const context = await requireAuth();

  if (context.profile.role !== "admin") {
    redirect("/dashboard");
  }

  return context;
}

export function isAdmin(profile: Pick<Profile, "role">) {
  return profile.role === "admin";
}

export function isManager(profile: Pick<Profile, "role">) {
  return profile.role === "admin";
}

export function canManageAgents(profile: Pick<Profile, "role">) {
  return profile.role === "admin" || profile.role === "member";
}
