"use client";

import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, LockKeyhole, User } from "lucide-react";
import { FormEvent, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const form = new FormData(event.currentTarget);
    const username = String(form.get("username") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "");

    if (!username) {
      setError("请输入账号名");
      setLoading(false);
      return;
    }

    try {
      const supabase = createSupabaseBrowserClient();

      // 如果含 @ 直接用，否则先试内部账号映射，再试原始输入（兼容管理员真实邮箱）
      const emails = username.includes("@")
        ? [username]
        : [`u_${username}@campus.local`, username];

      let signInError: unknown;
      for (const email of emails) {
        const result = await supabase.auth.signInWithPassword({ email, password });
        if (!result.error) {
          // 登录成功
          router.replace("/dashboard");
          router.refresh();
          return;
        }
        signInError = result.error;
      }

      setError("账号或密码不正确，请检查后再试。");
    } catch {
      setError("登录服务未配置完成，请检查环境变量。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="space-y-5">
        <label className="block">
          <span className="form-label">账号名</span>
          <span className="relative block">
            <User
              size={19}
              strokeWidth={1.7}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-light"
            />
            <input
              className="form-input h-[52px] bg-canvas-alt pl-12 text-[15px]"
              name="username"
              autoComplete="username"
              required
              placeholder="请输入账号名"
            />
          </span>
        </label>
        <label className="block">
          <span className="form-label">密码</span>
          <span className="relative block">
            <LockKeyhole
              size={19}
              strokeWidth={1.7}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-light"
            />
            <input
              className="form-input h-[52px] bg-canvas-alt pl-12 pr-12 text-[15px]"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              placeholder="请输入密码"
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-md text-muted-light transition-colors hover:bg-white hover:text-ink focus:outline-none focus:ring-2 focus:ring-brand-700"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={showPassword ? "隐藏密码" : "显示密码"}
            >
              {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
            </button>
          </span>
        </label>
      </div>

      {error ? (
        <div className="mt-4 rounded-md border border-coral-100 bg-coral-50 px-4 py-3 text-[13px] font-medium text-coral-600">
          {error}
        </div>
      ) : null}

      <button className="button-primary mt-7 h-[52px] w-full text-[15px]" disabled={loading} type="submit">
        {loading ? (
          <Loader2 className="animate-spin" size={18} />
        ) : (
          "登录"
        )}
      </button>
    </form>
  );
}
