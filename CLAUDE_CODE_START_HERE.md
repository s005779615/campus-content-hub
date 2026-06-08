# Claude Code 接手提示

请你接手这个项目：「校园内容中台」。

先阅读项目根目录下这几个文件：

1. `CLAUDE.md`
2. `HANDOFF.md`
3. `ENVIRONMENT.md`
4. `TODO.md`
5. `README.md`

项目当前状态：

- 这是一个 Next.js + Tailwind CSS + Supabase + Vercel 的校园内容运营后台。
- 线上地址是：https://campus-content-hub.vercel.app
- 本地 `npm run build` 已通过。
- 本地临时启动 `/login` 已验证返回 200。
- 不要把任何真实 API Key 写入源码。
- 不要提交 `.env`、`.env.local`。
- 当前重点不是新增大功能，而是先整理 Git 仓库、确认环境变量、修复 AI 调用稳定性。

请你优先做：

1. 检查 Git 仓库状态。如果当前目录没有 `.git`，请让用户提供 GitHub 仓库，或从 GitHub clone 后合并当前文件。
2. 确认 Vercel 环境变量：
   - `AI_PROVIDER=doubao`
   - `DOUBAO_BASE_URL=https://ark.cn-beijing.volces.com/api/v3`
   - `DOUBAO_MODEL=deepseek-v4-pro-260425` 或用户实际启用的模型
   - `DOUBAO_API_KEY` 或 `ARK_API_KEY` 已配置为服务端敏感变量
3. 测试 `/settings` 和 `/generate`。
4. 如果 DeepSeek V4 Pro 返回空内容，修复 `lib/content-generator.ts` 对 reasoning 模型返回格式的兼容。
5. 后续再做 UI 优化、账号监管、内容去重、数据看板增强。

安全底线：

- 不能新增 `NEXT_PUBLIC_DOUBAO_API_KEY`。
- 不能新增 `NEXT_PUBLIC_ARK_API_KEY`。
- 不能新增 `NEXT_PUBLIC_OPENAI_API_KEY`。
- `SUPABASE_SERVICE_ROLE_KEY` 只能服务端使用。
- 创建队员账号必须走服务端 API。

关键文件：

- `lib/content-generator.ts`
- `app/api/generate/route.ts`
- `lib/content-policy.ts`
- `lib/supabase/admin.ts`
- `database/schema.sql`
- `app/(app)/generate/generate-client.tsx`
- `app/(app)/settings/page.tsx`

