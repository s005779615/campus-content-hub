import { NextResponse } from "next/server";
import { getAuthContext } from "@/lib/auth";
import { numberOrZero } from "@/lib/format";
import type { ContentRecord, Platform } from "@/lib/types";

export async function POST(request: Request) {
  try {
    const context = await getAuthContext();

    if (!context) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.formData();
    const contentId = String(body.get("contentId") ?? "");
    const publishedAt = String(body.get("publishedAt") ?? "");
    const publishUrl = String(body.get("publishUrl") ?? "");
    const notes = String(body.get("notes") ?? "");

    const { data: content, error: contentError } = await context.supabase
      .from("content_records")
      .select("*")
      .eq("id", contentId)
      .single<ContentRecord>();

    if (contentError || !content) {
      return NextResponse.json({ error: "Content not found" }, { status: 404 });
    }

    const { data, error } = await context.supabase
      .from("publication_records")
      .insert({
        content_id: content.id,
        user_id: content.user_id,
        school_id: content.school_id,
        platform: content.platform as Platform,
        published_at: publishedAt ? new Date(publishedAt).toISOString() : null,
        publish_url: publishUrl || null,
        views: numberOrZero(body.get("views")),
        likes: numberOrZero(body.get("likes")),
        favorites: numberOrZero(body.get("favorites")),
        comments: numberOrZero(body.get("comments")),
        private_messages: numberOrZero(body.get("privateMessages")),
        wechat_adds: numberOrZero(body.get("wechatAdds")),
        conversions: numberOrZero(body.get("conversions")),
        notes: notes || null
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ publication: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
