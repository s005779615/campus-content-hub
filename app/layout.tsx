import type { Metadata, Viewport } from "next";
import "./globals.css";
import { appName } from "@/lib/constants";

export const metadata: Metadata = {
  title: appName,
  description: "面向校园团队的内容生成、发布回填和数据看板后台"
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
