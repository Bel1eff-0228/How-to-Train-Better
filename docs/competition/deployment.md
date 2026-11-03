# 部署准备（尚未执行）

框架为Next.js服务端应用。建议先使用支持常驻Node/Docker单实例的托管平台，并选实际能访问模型供应商的区域。不建议当前版本直接多实例Serverless部署：内存限流会分散并重置。Next官方支持Node/Docker，建议前置反向代理：https://nextjs.org/docs/app/guides/self-hosting 。静态GitHub Pages无法运行这些API。

## 你需要手动完成
1. 登录GitHub，将远程仓库克隆至新目录，对比本地后提交分支；不要覆盖远程历史。确认.env.local不入Git。
2. 登录支持Node/Docker的托管平台并授权仓库；确认费用、区域、HTTPS与服务实例数。当前没有可用部署凭据，未创建远程服务。
3. 使用仓库根目录作为构建上下文，因为知识构建读取根book和tools。构建命令：`npm --prefix apps/web ci && npm --prefix apps/web run build`。
4. 启动命令：`cd apps/web && npx next start --hostname 0.0.0.0 --port 3000`，将平台端口路由至3000；如平台强制PORT，改为其指定端口。
5. 通过平台Secret配置MODEL_BASE_URL、MODEL_NAME、MODEL_API_KEY、PLAN_SIGNING_SECRET。仅确认单常驻实例后设置AGENT_SINGLE_INSTANCE=true。设置MODEL_DAILY_CALL_LIMIT，并在供应商侧设硬支出上限；进程重启会重置本应用计数。
6. 日志不得记录body、Authorization、签名token或完整计划；补充隐私页的供应商与实际日志保留政策。为请求体和读取超时设置代理限制。
7. 公网确认首页、privacy页及两个POST接口。完成A—D实测，模型断网、429、5xx错误不能出现假计划。停止服务或撤回入口是首选故障回退，v1站点不受影响。
8. 用中国大陆手机流量实际验证；机房curl或桌面网络不能代替运营商实测。记录时间、运营商、页面和API结果，不记录敏感输入。

公开URL：未获得。大陆手机可达性：未测试。真实模型：未配置。赛事官方细则：待人工确认。
