import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await request.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (!file.type.startsWith("image/")) return NextResponse.json({ error: "Not an image" }, { status: 400 });
  if (file.size > 2 * 1024 * 1024) return NextResponse.json({ error: "File too large (max 2MB)" }, { status: 400 });

  const admin = createSupabaseAdminClient();
  const ext = file.name.split(".").pop() ?? "png";
  const path = `${ctx.profile.id}.${ext}`;

  // Delete old avatar if exists
  await admin.storage.from("avatars").remove([path]);

  // Upload new avatar
  const { error: uploadErr } = await admin.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message }, { status: 500 });
  }

  // Get public URL
  const { data: urlData } = admin.storage.from("avatars").getPublicUrl(path);

  // Update profile
  const { error: updateErr } = await admin
    .from("profiles")
    .update({ avatar_url: urlData.publicUrl })
    .eq("id", ctx.profile.id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  return NextResponse.json({ url: urlData.publicUrl });
}

export async function DELETE() {
  const ctx = await getAuthContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createSupabaseAdminClient();

  // Try to remove existing avatar file
  const { data: profile } = await admin
    .from("profiles")
    .select("avatar_url")
    .eq("id", ctx.profile.id)
    .single();

  if (profile?.avatar_url) {
    const url = new URL(profile.avatar_url);
    const path = url.pathname.split("/").pop();
    if (path) {
      await admin.storage.from("avatars").remove([path]);
    }
  }

  await admin.from("profiles").update({ avatar_url: null }).eq("id", ctx.profile.id);

  return NextResponse.json({ ok: true });
}
