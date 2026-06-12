# 项目交接文档 — 校园内容中台

## 项目概述

「校园内容中台」是团队内部校园内容运营后台，服务乌鲁木齐校园市场获客。校区负责人基于学校资料生成内容、完成发布并回填数据，管理员监管全局。

- **定位**：非官方校园生活攻略号，学长学姐视角，新生避坑攻略

---

## 线上地址

| 地址 | 说明 |
|------|------|
| `https://dxplus.xyz` | 主域名（Vercel 部署） |
| `https://campus-content-hub.vercel.app` | Vercel 默认域名（需梯子） |

> DNS 在腾讯云 DNSPod，CNAME 指向 `cname.vercel-dns.com`

---

## 技术栈

- 前端：Next.js App Router + React + Tailwind CSS
- 后端：Next.js Route Handlers
- 数据库：Supabase PostgreSQL (`https://hqpgzdjzyhzipnxgomkm.supabase.co`)
- 登录认证：Supabase Auth（邮箱密码登录）
- AI 生成：火山方舟 OpenAI 兼容接口 (`https://ark.cn-beijing.volces.com/api/v3`)
- 部署：Vercel（自动从 GitHub `main` 分支部署）
- GitHub：`https://github.com/s005779615/campus-content-hub`

---

## 部署注意事项

⚠️ **重要**：Vercel 从 GitHub 的 `main` 分支自动部署，不是 `master`。推送代码必须推到 `main`。

⚠️ **重要**：本地 Vercel CLI 不可用（电脑主机名含中文导致登录失败）。所有部署都通过 git push 触发。

⚠️ **重要**：GitHub 在国内不稳定，push 代码时需要开梯子。

---

## 环境变量（Vercel 已配置）

```
NEXT_PUBLIC_SUPABASE_URL=https://hqpgzdjzyhzipnxgomkm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[Supabase anon key]
SUPABASE_SERVICE_ROLE_KEY=[Supabase service role key]
AI_PROVIDER=doubao
DOUBAO_API_KEY=ark-37848c2e-d534-4625-b36f-3a5eefd71c6f-765a0
DOUBAO_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
DOUBAO_MODEL=deepseek-v4-pro-260425
```

---

## 可用 AI 模型（2个）

| 显示名 | 模型 ID | 说明 |
|--------|---------|------|
| 深度爆款版 | `deepseek-v4-pro-260425` | DeepSeek 推理模型，质量高但慢（30-60秒） |
| 校园灵感版 | `doubao-seed-2-0-lite-260215` | 豆包轻量模型，快，适合日常 |

> 火山方舟端点确认：深度爆款版 `ep-m-20260609013439-9lb6l`，校园灵感版 `ep-m-20260610011030-zxkwn`
> 代码有智能推荐：校园生活类→豆包，深度分析类→DeepSeek Pro

---

## 数据库表

### profiles
- `id` uuid PK, `email`, `full_name`, `avatar_url`, `role` (admin/member)
- 两级角色：管理员（项目负责人本人）与校区负责人

### schools
- `id`, `name`, `campus_name`, `city`, `dormitory_info`, `cafeteria_info`, `nearby_food`, `nearby_fun`, `registration_notes`, `essentials`, `campus_card_notes`, `bedding_scenarios`, `freshman_faq`, `banned_phrases`

### platform_accounts
- `id`, `user_id` FK, `school_id` FK, `platform` (抖音/小红书/视频号), `account_name`, `account_positioning`, `daily_publish_target`, `status`, `account_id`, `account_password`, `account_link`, `notes`
- 唯一约束：`(user_id, school_id, platform)`

### content_records
- 保存的生成内容，关联学校和用户

### publication_records
- 发布数据回填：播放量、评论、私信、加微信、有效咨询、成交人数、成交金额、备注

### publish_tasks
- 管理员为校区负责人分配的发布任务
- 状态：未开始、已生成、待发布、已发布、已回填、已复盘、异常
- 关联平台账号、生成内容、发布截图和复盘结论

### task_events
- 记录任务状态流转历史

### school_assignments
- `user_id` + `school_id`，队员→学校绑定

---

## 页面路由

| 路由 | 页面 | 说明 |
|------|------|------|
| `/login` | 登录页 | 黑白高级色，右侧 Hero + 编号卡片 |
| `/dashboard` | 仪表盘 | 管理员团队监管；负责人个人工作台 |
| `/generate` | 内容生成 | 模型选择器 + 参数表单 + 智能推荐 ⭐ |
| `/accounts` | 校园分配 | 管理员分配学校、负责人、平台账号与每日目标 |
| `/library` | 内容库 | 按平台+学校筛选，查看生成内容，回填发布数据 |
| `/tasks` | 发布任务 | 生成、待发布、截图上传、回填、复盘任务流 |
| `/schools` | 学校管理 | 维护学校资料表单 |
| `/team` | 校区负责人 | 创建负责人 + 学校分配 |
| `/analytics` | 数据看板 | 学校/队员/平台统计 + 转化表 |
| `/settings` | 设置页 | 账号信息 + 头像上传 + AI 引擎状态 + 审核规则 |

---

## 当前配色

**黑白高级色调**（最新 commit `286ea2e`）：
- brand 色：绿色 → 炭黑灰阶 (50-900)
- 按钮/链接/高亮统一黑灰
- 渐变从绿色改为黑灰色
- 68 处 brand- 引用全部自动级联

---

## 已修复的问题

1. ✅ Vercel 部署分支：main vs master（已统一推 main）
2. ✅ 豆包模型 ID 格式：需带日期后缀 `-260215`
3. ✅ 极速版移除：火山方舟未创建端点
4. ✅ DOUBAO_BASE_URL 误填防护：非 http 开头自动回退
5. ✅ DeepSeek 超时：60 秒 + thinking 参数
6. ✅ React #31 崩溃：全字段 safeItem 防护
7. ✅ 错误对象渲染：error.message 安全提取
8. ✅ DNS：dxplus.xyz → Vercel CNAME

---

## 数据库迁移

本次业务工作流升级需要执行：

```sql
database/migrations/20260613_operations_workflow.sql
```

迁移增加任务状态流、发布截图、有效咨询、成交金额、账号定位与每日目标，并更新两级角色 RLS。

---

## 未完成/可优化

1. 视频号完整生成体验
2. 内容日历批量排期
3. 发布截图长期归档策略
4. 仪表盘图表维度继续扩展
5. EdgeOne Pages 部署（域名已买但放弃，不稳定）
6. 抖音/小红书 OAuth 登录
7. 提示词持续优化

---

## 快速上手

```bash
npm install
npm run dev    # 本地开发 → http://localhost:3000
npm run build  # 构建检查
```

修改代码 → commit → push origin main → Vercel 自动部署 → 访问 dxplus.xyz

---

## 关键文件索引

| 文件 | 作用 |
|------|------|
| `lib/content-generator.ts` | AI 模型注册 + 调用逻辑 + 提示词 |
| `lib/auth.ts` | 登录认证 + 角色判断 |
| `lib/constants.ts` | 导航菜单 + 平台/内容类型常量 |
| `lib/types.ts` | TypeScript 类型定义 |
| `lib/content-policy.ts` | 风险词审核 |
| `app/(app)/generate/generate-client.tsx` | 生成页核心（模型选择+智能推荐） |
| `components/app-shell.tsx` | 全局布局（Header+侧边栏+Logo） |
| `components/content-output.tsx` | 生成结果展示（safeItem 渲染） |
| `database/schema.sql` | 完整数据库结构 + RLS |
| `tailwind.config.ts` | 配色 + 字体 + 阴影 + 动画 |
| `app/globals.css` | 全局样式 + 组件类 |
