# HANDOFF.md

## 当前已经完成的功能

- Supabase Auth 登录。
- 管理员和队员角色基础区分。
- 学校资料管理。
- 队员账号创建接口。
- 队员分配学校。
- 队员按权限查看学校。
- 小红书内容生成。
- 抖音脚本生成。
- 内容保存到内容库。
- 发布数据回填。
- 管理员数据看板。
- 内容风险词检测。
- 火山方舟/OpenAI 兼容接口调用逻辑。
- AI 未配置时回退本地模板。
- Vercel 部署。

## 还没完成的功能

- 视频号完整生成体验仍需继续打磨。
- 内容日历只完成基础任务能力，还需要更好的按人/学校/日期批量排班。
- 队员运营账号监管功能未完成，例如上传账号主页、账号截图、发布截图、账号日常检查记录。
- AI 内容质量还需要优化提示词、去重和结构化输出校验。
- 生成历史的版本管理、复制记录、发布状态流转还未完善。
- 移动端体验可用，但还可以继续优化表格和表单密度。

## 当前存在的问题

- 本地目录当前不是 Git 工作区，没有 `.git` 目录。
- 当前机器 PowerShell 里找不到 `git` 命令，所以本地无法直接执行 `git status`、`git commit`、`git push`。
- 线上 Vercel 环境变量曾在手动配置时测试过豆包和 DeepSeek。后续需要在 Vercel 里确认：
  - `DOUBAO_BASE_URL=https://ark.cn-beijing.volces.com/api/v3`
  - `DOUBAO_MODEL=deepseek-v4-pro-260425` 或当前实际要用的模型 ID
- DeepSeek V4 Pro 是推理模型，短输出测试时可能先返回 reasoning 内容，正式生成需要确认最终 `message.content` 不为空。
- 本地终端显示部分中文可能出现乱码，后续建议统一确认文件编码为 UTF-8。

## 最近正在测试什么

- 火山方舟接入。
- 豆包模型和 DeepSeek V4 Pro 模型切换。
- 线上 `/settings` 页展示 AI Provider、模型和配置状态。
- 线上 `/generate` 页真实调用 AI 生成内容。

## 哪些地方不要乱改

- `lib/supabase/admin.ts`：服务端管理员能力，依赖 service role key。
- `lib/env.ts`：环境变量读取和校验。
- `middleware.ts`：登录态路由保护。
- `database/schema.sql`：表结构、RLS 和策略。
- `lib/content-policy.ts`：合规风险词逻辑。
- `app/api/team-members/route.ts`：创建队员账号，不能改成前端直接创建。
- `app/api/generate/route.ts` 和 `lib/content-generator.ts`：AI Key 必须只在服务端使用。

## 部署平台

- Vercel
- 线上地址：https://campus-content-hub.vercel.app
- 数据库和认证：Supabase

## 前端和后端分别怎么部署

这是一个 Next.js 全栈项目，前端页面和后端 API 一起部署到 Vercel。

本地：

```bash
npm install
npm run dev
```

生产构建：

```bash
npm run build
npm run start
```

Vercel：

1. GitHub 仓库连接 Vercel 项目。
2. 在 Vercel Environment Variables 配置 Supabase 和 AI 变量。
3. 每次 push 到 GitHub 后触发部署。
4. 修改环境变量后需要重新部署。

## 如果后续修改 UI，应该改哪些文件

- 全局样式：`app/globals.css`
- 后台布局：`components/app-shell.tsx`
- 页面标题：`components/page-header.tsx`
- 登录页：`app/login/page.tsx`、`app/login/login-form.tsx`
- 学校管理：`app/(app)/schools/school-manager.tsx`
- 队员管理：`app/(app)/team/team-manager.tsx`
- 内容生成：`app/(app)/generate/page.tsx`、`app/(app)/generate/generate-client.tsx`
- 内容库：`app/(app)/library/page.tsx`、`app/(app)/library/content-library.tsx`
- 任务页：`app/(app)/tasks/page.tsx`、`app/(app)/tasks/tasks-client.tsx`
- 数据看板：`app/(app)/analytics/page.tsx`
- 设置页：`app/(app)/settings/page.tsx`

## Git/GitHub 当前状态

当前本地目录没有 `.git`，并且系统 PATH 中没有 `git` 命令。因此本次交接只能生成代码文件和文档，无法在本机完成真实 `git commit` / `git push`。

Claude Code 接手后建议：

```bash
git clone <GitHub 仓库地址>
```

然后把当前项目文件合并进去，或在安装 Git 后执行：

```bash
git init
git remote add origin <GitHub 仓库地址>
git add .
git commit -m "save current project handoff state"
git push -u origin main
```

执行前请确认 `.gitignore` 生效，避免提交 `.env`、截图、压缩包、`node_modules` 和 `.next`。
