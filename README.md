# 校园内容中台

团队内部使用的校园内容运营后台。MVP 已包含登录、学校资料管理、队员分配学校、小红书内容生成、抖音脚本生成、内容保存、发布数据回填和管理员数据看板。

## 技术栈

- 前端：Next.js App Router + Tailwind CSS
- 后端：Next.js API Routes
- 数据库：Supabase PostgreSQL
- 登录认证：Supabase Auth
- AI 生成：支持豆包/火山方舟、OpenAI；未配置 Key 时使用本地安全模板生成
- 部署：Vercel

## 本地运行

1. 安装依赖

```bash
npm.cmd install
```

2. 配置环境变量

```bash
copy .env.example .env.local
```

填写：

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
AI_PROVIDER=doubao
DOUBAO_API_KEY=
DOUBAO_MODEL=doubao-seed-2-0-lite-260215
DOUBAO_BASE_URL=https://ark.cn-beijing.volces.com/api/v3
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini
```

3. 初始化数据库

在 Supabase SQL Editor 中执行 [database/schema.sql](database/schema.sql)。

4. 创建第一个管理员

在 Supabase Auth 后台创建一个用户，然后在 SQL Editor 执行：

```sql
update public.profiles
set role = 'admin'
where email = '你的管理员邮箱';
```

5. 启动开发环境

```bash
npm.cmd run dev
```

访问 http://localhost:3000。

## 环境变量说明

- `NEXT_PUBLIC_SUPABASE_URL`：Supabase 项目 URL，前后端都会读取。
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`：Supabase anon key，用于浏览器登录和 RLS 查询。
- `SUPABASE_SERVICE_ROLE_KEY`：仅服务端使用，用于管理员创建队员账号。不要暴露给前端。
- `AI_PROVIDER`：AI 服务商，可填 `doubao`、`openai` 或 `template`。大陆使用建议填 `doubao`。
- `DOUBAO_API_KEY` / `ARK_API_KEY`：豆包/火山方舟 API Key，二选一即可。配置后 `/api/generate` 会调用豆包。
- `DOUBAO_MODEL`：豆包模型，默认 `doubao-seed-2-0-lite-260215`。如果你在火山方舟控制台创建的是专属接入点，也可以填对应模型/接入点 ID。
- `DOUBAO_BASE_URL`：豆包 OpenAI 兼容接口地址，默认 `https://ark.cn-beijing.volces.com/api/v3`。
- `OPENAI_API_KEY`：可选。`AI_PROVIDER=openai` 时使用 OpenAI；不配置则不能调用 OpenAI。
- `OPENAI_MODEL`：可选，默认 `gpt-4o-mini`。

## MVP 功能

- 登录：Supabase Auth 邮箱密码登录。
- 权限：`profiles.role` 区分 `admin` 和 `member`。
- 学校资料：管理员维护学校、校区、宿舍、食堂、周边、新生注意事项、开学用品、校园卡、床品场景、常见问题和禁用话术。
- 队员分配：管理员创建队员账号，并为队员分配负责学校。
- 内容生成：队员按学校、平台、内容类型、目标、语气生成小红书/抖音内容。
- 内容审核：自动检查“官方”“学校指定”“必须办理”等风险词，并给出安全替代表达。
- 内容保存：生成结果保存到 `content_records`。
- 发布回填：填写发布时间、链接、播放量、点赞、收藏、评论、私信、加微信、成交和备注。
- 数据看板：按学校、队员、平台、私信和转化查看数据。

## 部署到 Vercel

1. 将项目推送到 Git 仓库。
2. 在 Vercel 新建项目，Framework 选择 Next.js。
3. 在 Vercel Project Settings -> Environment Variables 中配置 `.env.example` 中的变量。
4. 在 Supabase Authentication -> URL Configuration 中添加：
   - 本地：`http://localhost:3000`
   - 线上：你的 Vercel 域名
5. 部署后用管理员账号登录。

## 合规边界

系统默认内容定位为：

- 非官方校园生活攻略号
- 学长学姐视角
- 新生避坑攻略

禁止冒充学校官方、老师、辅导员。涉及校园卡、床品、开学用品等转化内容时，建议使用“按个人需要了解”“以实际规则为准”“建议提前问清楚”等中性表达。

## 后续扩展建议

- 增加视频号生成完整 UI。
- 增加内容二次编辑器，让风险词替换后再保存。
- 增加图片素材库，按学校沉淀校门、宿舍、食堂、周边图片。
- 增加内容日历批量排期和平台发布状态。
- 增加线索 CRM，记录私信用户、微信号、需求、跟进状态和成交金额。
- 增加提示词版本管理，按学校和平台优化生成质量。
