"use client";

import { useRouter } from "next/navigation";
import { Loader2, LogIn, Mail, Lock } from "lucide-react";
import { FormEvent, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");

    try {
      const supabase = createSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        setError("账号或密码不正确，请检查后再试。");
        return;
      }

      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("登录服务未配置完成，请检查环境变量。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="panel p-6" onSubmit={onSubmit}>
      <div className="space-y-4">
        <label className="block">
          <span className="form-label">邮箱</span>
          <div className="relative mt-1">
            <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-lighter" />
            <input
              className="form-input pl-10"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="admin@example.com"
            />
          </div>
        </label>
        <label className="block">
          <span className="form-label">密码</span>
          <div className="relative mt-1">
            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-lighter" />
            <input
              className="form-input pl-10"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="请输入密码"
            />
          </div>
        </label>
      </div>

      {error ? (
        <div className="mt-4 rounded-lg border border-coral-100 bg-coral-50/70 px-4 py-2.5 text-[13px] font-medium text-coral-600">
          {error}
        </div>
      ) : null}

      <button className="button-primary mt-5 w-full h-11" disabled={loading} type="submit">
        {loading ? (
          <Loader2 className="animate-spin" size={18} />
        ) : (
          <>
            <LogIn size={17} />
            登录后台
          </>
        )}
      </button>
    </form>
  );
}
