import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  await requireAdmin();

  return NextResponse.json({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    AI_PROVIDER: process.env.AI_PROVIDER ?? "",
    DOUBAO_API_KEY: process.env.DOUBAO_API_KEY ?? "",
    DOUBAO_BASE_URL: process.env.DOUBAO_BASE_URL ?? "",
    DOUBAO_MODEL: process.env.DOUBAO_MODEL ?? "",
  });
}
