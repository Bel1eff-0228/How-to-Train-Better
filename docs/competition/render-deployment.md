# Render受控测试部署

仅准备代码和配置，不代表已部署。2026-11-03核对远程仅main分支37147f4，v2.0需经维护者确认后推送独立分支v2/render-test。不要选main，不合并或覆盖v1.0。

## 创建服务时填写

|字段|值|
|---|---|
|类型|Web Service（不是Static Site）|
|Repository|https://github.com/Bel1eff-0228/How-to-Train-Better|
|Branch|v2/render-test（推送后才可选择）|
|Runtime|Node|
|Root Directory|留空，使用仓库根目录|
|Build Command|`npm --prefix apps/web ci --include=dev && npm --prefix apps/web run build`|
|Start Command|`npm --prefix apps/web run start:render -- --port "$PORT"`|
|Health Check Path|`/api/health`|
|Auto Deploy|关闭，手动部署|
|Instance Count|1；不要开启自动扩容|
|Region|若控制台提供Singapore优先测试；国内可用性仍需手机实测|

仓库.node-version固定24.21.0，与本地验证版本一致。不要将Root Directory设为apps/web：Render不提供根目录之外的文件，而构建依赖README.md、book/、tools/及skills/。依赖锁定在apps/web/package-lock.json，npm ci必须安装构建所需devDependencies。

## Environment（只在Render服务端填写）

|变量|值|
|---|---|
|NODE_VERSION|24.21.0|
|NODE_ENV|production|
|APP_ORIGIN|https://trainbetter-ai-test.onrender.com|
|ORIGIN_DIAGNOSTICS|false（排障临时true，仅记录来源关系布尔值）|
|NEXT_TELEMETRY_DISABLED|1|
|MODEL_BASE_URL|https://api.deepseek.com|
|MODEL_NAME|deepseek-flash|
|MODEL_THINKING|disabled|
|MODEL_TIMEOUT_MS|60000|
|MODEL_DAILY_CALL_LIMIT|16|
|AGENT_SINGLE_INSTANCE|true|
|MODEL_DIAGNOSTICS|true（仅脱敏状态/耗时，测试结束关闭）|
|MODEL_API_KEY|手动填写轮换后的密钥|
|PLAN_SIGNING_SECRET|手动填写至少32字符的随机秘密|
|TEST_ACCESS_PASSWORD|手动填写至少20字符的随机ASCII密码|

不要给秘密变量加NEXT_PUBLIC_，不要上传.env.local，不要共享完整环境截图。生产环境缺少访问密码会返回503；错误密码或未登录返回401，浏览器用户名固定tester。健康检查只返回存活状态，不读取模型密钥、不调用模型；不能将健康200当成模型验收成功。

Free实例可用于初步受控验证，不等于常驻生产：官方说明15分钟无访问会休眠，下次启动约1分钟。重启会重置进程内额度和限流；单实例及16次限制不是永久账单上限，也不覆盖部署替换期间可能短暂并存的旧新进程。只邀请少量测试者，测试期间不要重新部署；配合供应商额度控制和人工查看账单。不得用定时请求绕过免费实例休眠。若需要付费常驻，由维护者另行确认套餐。

## 推送后步骤

1. 刷新Render分支列表，选v2/render-test，照表填写；暂不部署main。
2. 配置全部环境变量，确认Free或已批准的付费计划、单实例、自动部署关闭后，再手动Deploy。
3. 检查构建包含Indexed 100 entries，运行日志成功绑定0.0.0.0和PORT。不要公开日志中的用户数据。
4. 未登录访问首页和API应401，健康检查200；正确密码进入首页。
5. 做最多4轮生成+修改，最多16次模型请求（修改通常两次，503重试计次）；记录状态码和耗时，禁止无限重试。网络故障测试与真实供应商成功率分开记录。
6. 手机关闭Wi-Fi，用大陆移动网络验证页面、登录、生成、修改；未验证前不可宣称国内可用。

当前尚无Render公网地址，未做公网测试，不代表公开发布Go。

官方依据：
- https://render.com/docs/deploy-nextjs-app
- https://render.com/docs/monorepo-support
- https://render.com/docs/node-version
- https://render.com/docs/free
